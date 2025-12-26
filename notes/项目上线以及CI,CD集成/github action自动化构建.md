# 我的 GitHub Actions 自动化构建实践

> 记录我在 qm-photo-server 项目中使用 GitHub Actions 实现 Docker 镜像自动化构建的完整过程，包括配置、优化和踩坑经验。

## 📋 目录

- [为什么选择 GitHub Actions](#为什么选择-github-actions)
- [我的 Workflow 配置](#我的-workflow-配置)
- [构建优化实践](#构建优化实践)
- [遇到的问题和解决方案](#遇到的问题和解决方案)
- [总结](#总结)

---

## 为什么选择 GitHub Actions

### 我的需求

在实现 CI/CD 之前，我每次部署都要：

1. 本地构建 Docker 镜像
2. 手动推送到镜像仓库
3. 登录服务器拉取镜像
4. 重启服务

太麻烦了！我需要一个自动化方案。

### 为什么选择 GitHub Actions

我对比了几种 CI/CD 方案：

- **GitHub Actions**：与 GitHub 深度集成，免费额度充足（2000 分钟/月），配置简单
- **GitLab CI/CD**：功能强大，但我的代码在 GitHub
- **Jenkins**：需要自己搭建服务器，太复杂
- **Travis CI**：免费额度有限

最终选择了 **GitHub Actions**，因为：

- ✅ 我的代码就在 GitHub，集成最方便
- ✅ 免费额度够用（个人项目每月 2000 分钟）
- ✅ 配置简单，YAML 文件即可
- ✅ 丰富的 Action 生态，不用自己写脚本

### 基础概念（简单了解）

GitHub Actions 的核心概念：

- **Workflow**：自动化流程，写在 `.github/workflows/` 目录下的 YAML 文件
- **Job**：一个工作流可以包含多个任务
- **Step**：每个任务由多个步骤组成
- **Action**：可重用的工作单元，类似插件

对于我的项目，只需要一个 Job，包含几个 Step 就够了。

---

## 我的 Workflow 配置

### 文件位置

Workflow 文件放在 `.github/workflows/` 目录下，我创建了 `deploy.yml`：

```
qm-photo-server/
└── .github/
    └── workflows/
        └── deploy.yml
```

### 触发条件

我的 Workflow 在以下情况触发：

1. **代码推送**：推送到 `master` 或 `feat/deploy-prod` 分支
2. **手动触发**：在 GitHub Actions 页面手动运行，可以指定镜像标签

```yaml
on:
  push:
    branches:
      - master
      - feat/deploy-prod
    paths:
      - '**'
      - '!.github/workflows/**' # 排除 workflow 文件本身
  workflow_dispatch:
    inputs:
      tag:
        description: 'Docker 镜像标签'
        required: false
        default: 'latest'
```

### 环境变量配置

我在 Workflow 顶部定义了环境变量，方便管理：

```yaml
env:
  REGISTRY: crpi-eg9062f6byi3012b.cn-chengdu.personal.cr.aliyuncs.com
  NAMESPACE: dawn_dockers
  IMAGE_NAME: qm-photo-server
```

这样后续引用时只需要 `${{ env.REGISTRY }}` 就可以了。

### 完整的 Workflow 配置

这是我的完整配置：

```yaml
name: 构建并推送 Docker 镜像

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
        description: 'Docker 镜像标签'
        required: false
        default: 'latest'

env:
  REGISTRY: crpi-eg9062f6byi3012b.cn-chengdu.personal.cr.aliyuncs.com
  NAMESPACE: dawn_dockers
  IMAGE_NAME: qm-photo-server

jobs:
  build-and-push:
    name: 构建并推送 Docker 镜像
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      # 1. 检出代码
      - name: 检出代码
        uses: actions/checkout@v4

      # 2. 设置 Docker Buildx
      - name: 设置 Docker Buildx
        uses: docker/setup-buildx-action@v3

      # 3. 登录镜像仓库
      - name: 登录阿里云容器镜像服务
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.ALIYUN_DOCKER_USERNAME }}
          password: ${{ secrets.ALIYUN_DOCKER_PASSWORD }}

      # 4. 生成镜像标签
      - name: 生成镜像标签
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

      # 5. 构建并推送镜像（带缓存）
      - name: 构建并推送 Docker 镜像
        uses: docker/build-push-action@v5
        with:
          context: ./
          file: ./Dockerfile
          platforms: linux/amd64
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:${{ steps.image-tag.outputs.tag }}
            ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest
          cache-from: |
            type=registry,ref=${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest
            type=gha
          cache-to: type=gha,mode=max

      # 6. 输出镜像信息
      - name: 输出镜像信息
        run: |
          echo "✅ Docker 镜像构建和推送完成！"
          echo "镜像地址: ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:${{ steps.image-tag.outputs.tag }}"
```

### 关键步骤说明

1. **检出代码**：使用 `actions/checkout@v4` 获取代码
2. **设置 Docker Buildx**：启用 Docker 构建功能
3. **登录镜像仓库**：使用 Secrets 中的用户名和密码登录阿里云
4. **生成镜像标签**：
   - 手动触发：使用输入的标签
   - 自动触发：使用 commit SHA 的前 7 位（如 `a1b2c3d`）
   - 同时打 `latest` 标签
5. **构建并推送**：使用缓存加速构建，推送到阿里云
6. **输出信息**：显示构建结果

### 配置 GitHub Secrets

在 GitHub 仓库的 `Settings → Secrets and variables → Actions` 中添加：

- `ALIYUN_DOCKER_USERNAME`：阿里云容器镜像服务的用户名
- `ALIYUN_DOCKER_PASSWORD`：阿里云容器镜像服务的密码

**注意**：密码不是登录密码，而是容器镜像服务的访问凭证（在阿里云控制台生成）。

---

## 构建优化实践

### 为什么需要优化

刚开始我的构建时间要 **15-20 分钟**，太慢了！每次推送代码都要等很久。经过优化，现在只需要 **3-8 分钟**。

### 优化方案

#### 1. 使用 Docker 层缓存

Docker 构建时会缓存每一层，如果文件没变，就直接使用缓存。我配置了两种缓存：

- **Registry 缓存**：从之前的镜像中拉取缓存
- **GitHub Actions 缓存**：使用 GitHub 的缓存服务

```yaml
cache-from: |
  type=registry,ref=${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest
  type=gha
cache-to: type=gha,mode=max
```

#### 2. 优化 Dockerfile

我的 Dockerfile 使用多阶段构建，并且先复制依赖文件，利用 Docker 层缓存：

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件（如果 package.json 没变，这层会被缓存）
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --frozen-lockfile

# 再复制源代码（只有代码变了才重新构建）
COPY . .
RUN pnpm run build

# 生产阶段
FROM node:20-alpine AS production

WORKDIR /app

# 安装生产依赖
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && \
    pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --prod --frozen-lockfile

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

# ... 其他配置
```

**关键点**：

- 先复制 `package.json` 和 `pnpm-lock.yaml`，再安装依赖
- 如果依赖没变，Docker 会直接使用缓存的层
- 使用国内镜像源加速依赖安装

#### 3. 使用 .dockerignore

创建 `.dockerignore` 文件，排除不需要的文件，减少构建上下文大小：

```
node_modules
.git
.env
*.log
dist
coverage
.vscode
.idea
```

### 优化效果

- **优化前**：15-20 分钟
- **优化后**：3-8 分钟（依赖没变时 3-5 分钟，依赖变化时 6-8 分钟）

## 遇到的问题和解决方案

### 问题 1：Docker 登录失败

**错误信息**：

```
Error: Cannot perform an interactive login from a non TTY device
```

**原因**：我一开始用 `docker login` 命令，但 GitHub Actions 不支持交互式登录。

**解决方案**：使用 `docker/login-action@v3`，这是专门为 CI/CD 设计的 Action。

```yaml
- name: 登录阿里云容器镜像服务
  uses: docker/login-action@v3
  with:
    registry: ${{ env.REGISTRY }}
    username: ${{ secrets.ALIYUN_DOCKER_USERNAME }}
    password: ${{ secrets.ALIYUN_DOCKER_PASSWORD }}
```

### 问题 2：构建超时

**问题**：构建时间过长，超过默认超时时间（6 小时，但实际构建可能卡住）。

**解决方案**：设置合理的超时时间。

```yaml
jobs:
  build-and-push:
    timeout-minutes: 30 # 30 分钟超时
```

### 问题 3：缓存不生效

**问题**：配置了缓存，但构建时间没有明显减少。

**原因**：

1. 第一次构建没有缓存
2. 缓存 key 配置错误
3. Dockerfile 的层顺序不合理

**解决方案**：

1. 确保 Dockerfile 先复制依赖文件，再复制源代码
2. 使用 `cache-from` 从之前的镜像拉取缓存
3. 使用 `cache-to` 保存缓存到 GitHub Actions

### 问题 4：镜像标签冲突

**问题**：多个构建使用相同的标签，导致覆盖。

**解决方案**：使用 commit SHA 作为标签，确保每个构建都有唯一标签。

```yaml
- name: 生成镜像标签
  id: image-tag
  run: |
    TAG="${GITHUB_SHA:0:7}"  # 使用 commit SHA 前 7 位
    echo "tag=${TAG}" >> $GITHUB_OUTPUT
```

同时打 `latest` 标签，方便部署时使用。

### 问题 5：推送权限不足

**错误信息**：

```
denied: requested access to the resource is denied
```

**原因**：

1. 用户名或密码错误
2. 没有推送权限
3. 镜像仓库地址错误

**解决方案**：

1. 检查 Secrets 配置是否正确
2. 确认使用的是容器镜像服务的访问凭证（不是登录密码）
3. 验证镜像仓库地址是否正确

### 问题 6：构建速度慢

**问题**：即使使用了缓存，构建还是很慢。

**原因**：

1. 没有使用国内镜像源
2. Dockerfile 层顺序不合理
3. 构建上下文太大

**解决方案**：

1. 在 Dockerfile 中配置国内镜像源
2. 优化 Dockerfile 层顺序
3. 使用 `.dockerignore` 排除不需要的文件

## 总结

### 我的经验总结

经过实践，GitHub Actions 自动化构建对我来说非常实用：

- ✅ **简单**：配置简单，YAML 文件即可
- ✅ **免费**：个人项目免费额度够用
- ✅ **快速**：经过优化，构建时间从 20 分钟降到 3-8 分钟
- ✅ **可靠**：与 GitHub 深度集成，稳定可靠

### 给其他开发者的建议

1. **从简单开始**：先实现基本功能，再逐步优化
2. **使用缓存**：缓存能大幅提升构建速度
3. **优化 Dockerfile**：合理的层顺序能充分利用缓存
4. **使用国内镜像源**：能显著加速依赖安装
5. **设置超时时间**：避免构建卡住
6. **版本化管理**：Workflow 文件也要提交到 Git

### 下一步计划

目前我的构建流程已经比较完善了，后续可能会：

- 添加构建通知（邮件/钉钉）
- 实现多环境构建（dev/staging/prod）
- 添加构建前的代码检查（lint/test）
- 优化镜像大小（使用 distroless 镜像）

如果你也在做类似的项目，希望我的经验对你有帮助。有问题欢迎交流！
