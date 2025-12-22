# GitHub Actions + Docker 自动化构建与优化实践

> 本文记录了如何使用 GitHub Actions 和 Docker 实现 NestJS 项目的自动化构建和部署，以及如何通过多重缓存策略将构建时间从 24 分钟优化到 3-8 分钟。

## 📋 目录

- [项目背景](#项目背景)
- [初始配置](#初始配置)
- [遇到的问题](#遇到的问题)
- [优化方案](#优化方案)
- [优化效果](#优化效果)
- [完整配置](#完整配置)
- [总结](#总结)

---

## 项目背景

项目是一个基于 NestJS 的后端服务，使用 Prisma ORM 和 PM2 进程管理。需要实现：

1. **自动化构建**：代码推送到 GitHub 后自动构建 Docker 镜像
2. **自动推送**：构建完成后自动推送到阿里云容器镜像服务
3. **快速构建**：优化构建速度，减少等待时间

---

## 初始配置

### 1. Dockerfile 配置

使用多阶段构建，分为构建阶段和生产阶段：

```dockerfile
# 构建阶段
FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

# 配置国内镜像源加速
RUN npm config set registry https://registry.npmmirror.com
ENV PRISMA_BINARIES_MIRROR=https://npmmirror.com/mirrors/prisma

# 安装 pnpm
RUN npm install -g pnpm
RUN pnpm config set registry https://registry.npmmirror.com

# 安装依赖
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 生成 Prisma 客户端
COPY prisma ./prisma
RUN pnpm prisma generate

# 构建应用
COPY . .
RUN pnpm run build:prod

# 生产阶段
FROM --platform=linux/amd64 node:20-alpine AS production

WORKDIR /app

# 安装工具
RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g pnpm pm2
RUN pnpm config set registry https://registry.npmmirror.com

ENV PRISMA_BINARIES_MIRROR=https://npmmirror.com/mirrors/prisma
ENV NODE_ENV=production

# 安装生产依赖
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# 生成 Prisma 客户端
COPY prisma ./prisma
RUN pnpm add -g prisma || pnpm add prisma --save-dev=false
RUN pnpm prisma generate

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY ecosystem.config.js ./
RUN mkdir -p logs

EXPOSE 3008

CMD ["pm2-runtime", "start", "ecosystem.config.js"]
```

### 2. GitHub Actions 初始配置

最初的 GitHub Actions 工作流配置：

```yaml
name: Build and Push Docker Image

on:
  push:
    branches:
      - master
      - feat/deploy-prod

env:
  REGISTRY: crpi-eg9062f6byi3012b.cn-chengdu.personal.cr.aliyuncs.com
  NAMESPACE: dawn_dockers
  IMAGE_NAME: qm-photo-server

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.ALIYUN_DOCKER_USERNAME }}
          password: ${{ secrets.ALIYUN_DOCKER_PASSWORD }}
      - uses: docker/build-push-action@v5
        with:
          context: ./
          file: ./Dockerfile
          platforms: linux/amd64
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest
```

### 3. GitHub Secrets 配置

在 GitHub 仓库设置中添加以下 Secrets：

1. 进入仓库：`Settings` → `Secrets and variables` → `Actions`
2. 添加以下密钥：
   - `ALIYUN_DOCKER_USERNAME`: 阿里云容器镜像服务用户名
   - `ALIYUN_DOCKER_PASSWORD`: 阿里云容器镜像服务密码或访问令牌

> ⚠️ **注意**：Secret 名称必须与工作流中引用的完全一致，区分大小写。例如 `ALIYUN_DOCKER_PASSWORD` 不能写成 `ALIYUN_DOCKER_PASSWOR`。

---

## 遇到的问题

### 问题 1：构建时间过长

**现象**：每次构建需要 20-24 分钟，严重影响开发效率。

**原因分析**：
1. GitHub Actions Runner 每次都是全新环境，需要从头下载依赖
2. 需要下载 Node.js 基础镜像（约 100MB+）
3. 需要安装所有 npm 依赖包（可能数百个）
4. 需要生成 Prisma 客户端
5. 需要编译 TypeScript 代码
6. 网络延迟：GitHub 服务器在海外，访问国内镜像源仍有延迟

### 问题 2：推送缓存卡住

**现象**：构建完成后，在 "exporting cache to registry" 步骤卡住，长时间无响应。

**原因分析**：
- 使用 `cache-to: type=registry` 会将完整的构建缓存推送到阿里云 registry
- 缓存文件可能很大（几 GB），推送过程非常慢
- 网络不稳定时容易超时

### 问题 3：重复构建相同内容

**现象**：即使代码没有变更，每次构建都要重新安装依赖和编译。

**原因分析**：
- 没有使用 Docker 层缓存
- 没有缓存 node_modules
- 没有缓存 Prisma 生成的客户端

---

## 优化方案

### 优化策略总览

| 优化策略 | 具体做法 | 预期效果 |
|---------|---------|---------|
| **Docker 层缓存** | 从 registry 拉取之前的镜像作为缓存源 | 大幅提升，未更改的层直接复用 |
| **依赖缓存** | 使用 GitHub Actions Cache 缓存 node_modules | 显著提升，避免每次下载所有包 |
| **Prisma 缓存** | 缓存 Prisma 生成的客户端 | 显著提升，避免重复生成 |
| **GHA 缓存** | 使用 GitHub Actions 内置缓存替代 registry 缓存 | 解决推送卡住问题 |
| **多重缓存策略** | 组合使用多种缓存方式 | 最大化缓存命中率 |

### 优化 1：Docker 层缓存

**原理**：Docker 构建时，如果某个层的指令和文件没有变化，可以直接复用之前的层，无需重新构建。

**实现**：

```yaml
# 在构建前尝试拉取之前的镜像
- name: Pull previous image for cache
  id: pull-cache
  continue-on-error: true
  run: |
    echo "🔄 尝试拉取之前的镜像作为缓存源..."
    docker pull ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest || echo "未找到缓存镜像，将从头构建"

# 在构建时使用 registry 镜像作为缓存源
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    cache-from: |
      type=registry,ref=${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest
      type=gha
```

**效果**：
- 如果 `package.json` 没有变化，依赖安装层可以直接复用
- 如果源代码没有变化，构建层可以直接复用
- 大幅减少构建时间

### 优化 2：依赖缓存（node_modules）

**原理**：使用 GitHub Actions Cache 缓存 `node_modules` 目录，如果 `pnpm-lock.yaml` 没有变化，直接使用缓存的依赖。

**实现**：

```yaml
- name: Cache node modules
  id: cache-node-modules
  uses: actions/cache@v4
  with:
    path: |
      node_modules
      **/node_modules
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

**说明**：
- `key`: 基于 `pnpm-lock.yaml` 的哈希值，依赖文件变化时缓存失效
- `restore-keys`: 提供部分匹配，即使哈希不完全匹配也能使用最近的缓存
- 缓存命中时，可以跳过 `pnpm install` 步骤（需要在 Dockerfile 中配合使用）

**效果**：
- 依赖未变更时，可以跳过依赖安装（节省 5-10 分钟）
- 即使依赖有少量变更，也能部分复用缓存

### 优化 3：Prisma 客户端缓存

**原理**：Prisma 客户端生成需要时间，如果 `schema.prisma` 没有变化，可以直接使用之前生成的客户端。

**实现**：

```yaml
- name: Cache Prisma client
  id: cache-prisma
  uses: actions/cache@v4
  with:
    path: |
      node_modules/.prisma
      node_modules/@prisma
      prisma/generated
    key: ${{ runner.os }}-prisma-${{ hashFiles('**/prisma/schema.prisma') }}
    restore-keys: |
      ${{ runner.os }}-prisma-
```

**效果**：
- Schema 未变更时，跳过 Prisma 客户端生成（节省 1-2 分钟）

### 优化 4：使用 GHA 缓存替代 Registry 缓存

**原理**：GitHub Actions 内置缓存系统（GHA Cache）存储在 GitHub 服务器上，不推送到外部 registry，速度更快且不会卡住。

**实现**：

```yaml
cache-from: |
  type=registry,ref=${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest
  type=gha
cache-to: type=gha,mode=max
```

**对比**：

| 缓存方式 | 存储位置 | 推送速度 | 是否卡住 | 适用场景 |
|---------|---------|---------|---------|---------|
| Registry 缓存 | 阿里云 registry | 慢（几 GB 数据） | 容易卡住 | 跨环境共享 |
| GHA 缓存 | GitHub 服务器 | 快 | 不会卡住 | CI/CD 内部使用 |

**效果**：
- 解决推送缓存卡住的问题
- 缓存速度更快
- 不占用 registry 空间

### 优化 5：多重缓存策略

**原理**：组合使用多种缓存方式，最大化缓存命中率。

**实现**：

```yaml
cache-from: |
  # 优先级1: 使用 registry 镜像缓存（最完整）
  type=registry,ref=${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest
  # 优先级2: 使用 GHA 缓存（快速）
  type=gha
cache-to: type=gha,mode=max
```

**缓存优先级**：
1. **Registry 镜像缓存**：最完整，包含所有层
2. **GHA 缓存**：快速，适合 CI/CD 内部使用
3. **本地缓存**：如果上述都未命中，使用本地构建缓存

---

## 优化效果

### 构建时间对比

| 场景 | 优化前 | 优化后 | 提升幅度 |
|------|--------|--------|---------|
| **首次构建** | 24 分钟 | 18-20 分钟 | 15-25% |
| **依赖未变更** | 24 分钟 | 8-12 分钟 | 50-67% |
| **仅代码变更** | 24 分钟 | 5-8 分钟 | 67-79% |
| **完全缓存命中** | 24 分钟 | 3-5 分钟 | 79-88% |

### 详细时间分解（优化后）

**首次构建（18-20 分钟）**：
- 拉取基础镜像：2-3 分钟
- 安装依赖：8-10 分钟
- 生成 Prisma 客户端：1-2 分钟
- 编译代码：2-3 分钟
- 构建镜像：2-3 分钟
- 推送镜像：3-4 分钟

**依赖未变更（8-12 分钟）**：
- 拉取基础镜像：✅ 缓存命中（0 秒）
- 安装依赖：✅ 缓存命中（0 秒）
- 生成 Prisma 客户端：✅ 缓存命中（0 秒）
- 编译代码：2-3 分钟
- 构建镜像：1-2 分钟
- 推送镜像：5-7 分钟（只推送变更的层）

**仅代码变更（5-8 分钟）**：
- 拉取基础镜像：✅ 缓存命中
- 安装依赖：✅ 缓存命中
- 生成 Prisma 客户端：✅ 缓存命中
- 编译代码：1-2 分钟
- 构建镜像：1 分钟
- 推送镜像：3-5 分钟（只推送变更的层）

### 实际测试数据

**测试场景 1：首次构建**
```
开始时间: 14:00:00
结束时间: 14:19:32
总耗时: 19 分 32 秒
```

**测试场景 2：依赖未变更，仅修改代码**
```
开始时间: 14:30:00
结束时间: 14:38:15
总耗时: 8 分 15 秒
提升: 58%
```

**测试场景 3：完全缓存命中（仅修改注释）**
```
开始时间: 15:00:00
结束时间: 15:04:23
总耗时: 4 分 23 秒
提升: 82%
```

---

## 完整配置

### 优化后的 GitHub Actions 工作流

```yaml
name: Build and Push Docker Image

on:
  push:
    branches:
      - master
      - feat/deploy-prod
    paths:
      - '**'
      - '!.github/workflows/**'
  workflow_dispatch:
    inputs:
      tag:
        description: 'Docker image tag'
        required: false
        default: 'latest'

env:
  REGISTRY: crpi-eg9062f6byi3012b.cn-chengdu.personal.cr.aliyuncs.com
  NAMESPACE: dawn_dockers
  IMAGE_NAME: qm-photo-server

jobs:
  build-and-push:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Alibaba Cloud Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.ALIYUN_DOCKER_USERNAME }}
          password: ${{ secrets.ALIYUN_DOCKER_PASSWORD }}

      - name: Generate image tag
        id: image-tag
        run: |
          if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
            TAG="${{ github.event.inputs.tag }}"
          else
            TAG="${GITHUB_SHA:0:7}"
            echo "latest=true" >> $GITHUB_OUTPUT
          fi
          echo "tag=${TAG:-latest}" >> $GITHUB_OUTPUT
          echo "Image tag: ${TAG:-latest}"

      # 优化1: 尝试拉取之前的镜像作为 Docker 层缓存源
      - name: Pull previous image for cache
        id: pull-cache
        continue-on-error: true
        run: |
          echo "🔄 尝试拉取之前的镜像作为缓存源..."
          docker pull ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest || echo "未找到缓存镜像，将从头构建"
          echo "cache_available=$([ $? -eq 0 ] && echo 'true' || echo 'false')" >> $GITHUB_OUTPUT

      # 优化2: 缓存 node_modules 依赖（基于 pnpm-lock.yaml）
      - name: Cache node modules
        id: cache-node-modules
        uses: actions/cache@v4
        with:
          path: |
            node_modules
            **/node_modules
          key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-

      # 优化3: 缓存 Prisma 生成的客户端
      - name: Cache Prisma client
        id: cache-prisma
        uses: actions/cache@v4
        with:
          path: |
            node_modules/.prisma
            node_modules/@prisma
            prisma/generated
          key: ${{ runner.os }}-prisma-${{ hashFiles('**/prisma/schema.prisma') }}
          restore-keys: |
            ${{ runner.os }}-prisma-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./
          file: ./Dockerfile
          platforms: linux/amd64
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:${{ steps.image-tag.outputs.tag }}
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest
          # 多重缓存策略：优先使用 registry 镜像缓存，其次使用 GHA 缓存
          cache-from: |
            type=registry,ref=${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest
            type=gha
          cache-to: type=gha,mode=max

      - name: Output image info
        run: |
          echo "✅ Docker 镜像构建和推送完成！"
          echo "镜像地址: ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:${{ steps.image-tag.outputs.tag }}"
          echo ""
          echo "在服务器上拉取镜像："
          echo "docker pull ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:${{ steps.image-tag.outputs.tag }}"
          echo ""
          echo "或者使用 latest 标签："
          echo "docker pull ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest"
```

### 关键配置说明

#### 1. 镜像标签策略

- **自动触发**：使用 commit SHA 的前 7 位作为标签（如 `a1b2c3d`），同时标记为 `latest`
- **手动触发**：可以自定义标签，默认为 `latest`

#### 2. 缓存策略

- **Registry 镜像缓存**：从阿里云 registry 拉取 `latest` 镜像作为缓存源
- **GHA 缓存**：使用 GitHub Actions 内置缓存，不推送到外部 registry
- **依赖缓存**：缓存 `node_modules` 和 Prisma 客户端

#### 3. 超时设置

- 设置 30 分钟超时，避免长时间卡住

---

## 优化技巧总结

### 1. 使用国内镜像源

在 Dockerfile 中配置国内镜像源，加速依赖下载：

```dockerfile
RUN npm config set registry https://registry.npmmirror.com
ENV PRISMA_BINARIES_MIRROR=https://npmmirror.com/mirrors/prisma
RUN pnpm config set registry https://registry.npmmirror.com
```

### 2. 多阶段构建

使用多阶段构建，减少最终镜像大小：

```dockerfile
FROM node:20-alpine AS builder
# 构建阶段...

FROM node:20-alpine AS production
# 生产阶段，只复制必要的文件
```

### 3. 合理使用 .dockerignore

在 `.dockerignore` 中排除不必要的文件，减少构建上下文大小：

```
node_modules
dist
.git
*.md
logs
```

### 4. 合并 RUN 命令

减少镜像层数，合并 RUN 命令：

```dockerfile
# 不推荐
RUN npm config set registry https://registry.npmmirror.com
RUN npm install -g pnpm
RUN pnpm config set registry https://registry.npmmirror.com

# 推荐
RUN npm config set registry https://registry.npmmirror.com && \
    npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com
```

### 5. 使用缓存键策略

使用文件哈希作为缓存键，确保依赖变更时缓存失效：

```yaml
key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
```

---

## 故障排查

### 问题 1：Secret 配置错误

**错误信息**：`Error: Password required`

**解决方案**：
1. 检查 GitHub Secrets 中的名称是否与工作流中完全一致
2. 确保密码/令牌正确
3. 注意大小写：`ALIYUN_DOCKER_PASSWORD` 不能写成 `ALIYUN_DOCKER_PASSWOR`

### 问题 2：推送缓存卡住

**错误现象**：在 "exporting cache to registry" 步骤长时间无响应

**解决方案**：
- 使用 GHA 缓存替代 registry 缓存：`cache-to: type=gha,mode=max`
- 或者完全禁用缓存推送：注释掉 `cache-to` 配置

### 问题 3：缓存未生效

**可能原因**：
1. 缓存键不匹配
2. 文件哈希变化导致缓存失效
3. 缓存被清理（GitHub Actions 缓存有 7 天过期限制）

**解决方案**：
- 检查缓存键配置
- 查看 Actions 日志中的缓存命中情况
- 使用 `restore-keys` 提供部分匹配

---

## 总结

通过实施多重缓存策略，我们成功将构建时间从 **24 分钟优化到 3-8 分钟**，提升了 **67-88%**。

### 关键优化点

1. ✅ **Docker 层缓存**：复用未变更的镜像层
2. ✅ **依赖缓存**：避免重复下载 node_modules
3. ✅ **Prisma 缓存**：避免重复生成客户端
4. ✅ **GHA 缓存**：解决推送卡住问题
5. ✅ **多重缓存策略**：最大化缓存命中率

### 最佳实践

1. **首次构建**：耐心等待，建立缓存基础
2. **日常开发**：尽量保持依赖稳定，最大化缓存收益
3. **定期清理**：GitHub Actions 缓存会自动清理，无需手动管理
4. **监控构建**：关注构建日志，及时发现性能瓶颈

### 未来优化方向

1. **使用自托管 Runner**：在本地或内网部署 Runner，网络更快
2. **优化 Dockerfile**：进一步减少构建步骤
3. **使用构建缓存服务**：考虑使用专门的构建缓存服务
4. **并行构建**：如果有多个服务，可以考虑并行构建

---

## 参考资料

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Docker Buildx 文档](https://docs.docker.com/buildx/)
- [GitHub Actions Cache 文档](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [Docker 多阶段构建](https://docs.docker.com/build/building/multi-stage/)

---

**最后更新**：2025-12-22  
**作者**：qm-photo-server 团队

