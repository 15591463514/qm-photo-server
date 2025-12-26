# CI/CD 完整实现方案

> 本文档详细说明 qm-photo-server 项目的 CI/CD 完整实现，包括自动化构建和自动化部署的详细流程、配置说明以及如何修改和扩展。

## 📋 目录

- [概述](#概述)
- [架构设计](#架构设计)
- [自动化构建](#自动化构建)
- [自动化部署](#自动化部署)
- [邮件通知](#邮件通知)
- [配置说明](#配置说明)
- [如何修改和扩展](#如何修改和扩展)
- [故障排查](#故障排查)

---

## 概述

本项目实现了完整的 CI/CD 流程，包括：

1. **自动化构建**：代码推送到 GitHub 后自动构建 Docker 镜像
2. **自动化部署**：构建完成后自动部署到生产服务器
3. **邮件通知**：构建和部署状态实时通知

### 技术栈

- **CI/CD 平台**：GitHub Actions
- **容器化**：Docker + Docker Compose
- **镜像仓库**：阿里云容器镜像服务
- **部署方式**：SSH 远程执行脚本
- **通知方式**：SMTP 邮件通知

### 工作流程

```
代码推送 → GitHub Actions 触发 → 构建 Docker 镜像 → 推送到镜像仓库
    ↓
SSH 连接服务器 → 执行部署脚本 → 拉取镜像 → 运行数据库迁移 → 重启服务
    ↓
发送邮件通知（成功/失败）
```

---

## 架构设计

### 整体架构

```
┌─────────────────┐
│   GitHub 仓库    │
│  (代码仓库)      │
└────────┬─────────┘
         │ Push
         ▼
┌─────────────────┐
│ GitHub Actions  │
│  (CI/CD 平台)   │
│                 │
│ 1. 检出代码      │
│ 2. 构建镜像      │
│ 3. 推送镜像      │
│ 4. SSH 部署      │
│ 5. 发送通知      │
└────────┬─────────┘
         │ SSH
         ▼
┌─────────────────┐
│  生产服务器      │
│                 │
│ 1. 接收部署请求  │
│ 2. 拉取镜像      │
│ 3. 运行迁移      │
│ 4. 重启服务      │
└─────────────────┘
```

### 文件结构

```
qm-photo-server/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 工作流配置
├── scripts/
│   └── update.sh               # 服务器端部署脚本
├── docker-compose.prod.yml      # 生产环境 Docker Compose 配置
├── Dockerfile                   # Docker 镜像构建文件
└── md/
    └── CI-CD完整实现方案.md     # 本文档
```

---

## 自动化构建

自动化构建是指代码推送到 GitHub 后，自动触发 Docker 镜像的构建和推送流程。

### 1. 触发条件

构建会在以下情况自动触发：

- **代码推送**：推送到 `master` 或 `feat/deploy-prod` 分支
- **手动触发**：在 GitHub Actions 页面手动运行工作流

### 2. 构建流程

#### 步骤 1：环境准备

```yaml
- name: 检出代码
  uses: actions/checkout@v4

- name: 设置 Docker Buildx
  uses: docker/setup-buildx-action@v3
```

#### 步骤 2：登录镜像仓库

```yaml
- name: 登录阿里云容器镜像服务
  uses: docker/login-action@v3
  with:
    registry: ${{ env.REGISTRY }}
    username: ${{ secrets.ALIYUN_DOCKER_USERNAME }}
    password: ${{ secrets.ALIYUN_DOCKER_PASSWORD }}
```

#### 步骤 3：生成镜像标签

```yaml
- name: 生成镜像标签
  id: image-tag
  run: |
    if [ "${{ github.event_name }}" == "workflow_dispatch" ]; then
      TAG="${{ github.event.inputs.tag }}"
    else
      TAG="${GITHUB_SHA:0:7}"
    fi
    echo "tag=${TAG:-latest}" >> $GITHUB_OUTPUT
```

**标签规则**：

- 自动触发：使用 commit SHA 前 7 位（如 `a1b2c3d`）+ `latest`
- 手动触发：可自定义标签，默认为 `latest`

#### 步骤 4：缓存优化

为了加速构建，使用了多重缓存策略：

```yaml
# 1. 拉取之前的镜像作为缓存源
- name: 拉取之前的镜像作为缓存
  run: |
    docker pull ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest

# 2. 缓存 Node 模块
- name: 缓存 Node 模块
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}

# 3. 缓存 Prisma 客户端
- name: 缓存 Prisma 客户端
  uses: actions/cache@v4
  with:
    path: node_modules/.prisma
    key: ${{ runner.os }}-prisma-${{ hashFiles('**/prisma/schema.prisma') }}
```

#### 步骤 5：构建并推送镜像

```yaml
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
```

### 3. Dockerfile 构建策略

项目使用多阶段构建，分为构建阶段和生产阶段：

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
# 安装依赖、生成 Prisma 客户端、构建应用

# 生产阶段
FROM node:20-alpine AS production
WORKDIR /app
# 安装生产依赖、复制构建产物、配置 PM2
```

**优化点**：

- 使用国内镜像源加速
- 分离构建依赖和生产依赖
- 最小化镜像体积

### 4. 构建优化效果

通过多重缓存策略，构建时间从 **24 分钟**优化到 **3-8 分钟**：

- **首次构建**：约 8 分钟（无缓存）
- **增量构建**：约 3-5 分钟（有缓存）
- **缓存命中率**：90%+

---

## 自动化部署

自动化部署是指构建完成后，自动将新镜像部署到生产服务器。

### 1. 部署方式

本项目采用 **SSH 远程执行脚本** 的方式实现自动化部署：

1. GitHub Actions 通过 SSH 连接到服务器
2. 在服务器上执行部署脚本 `update.sh`
3. 脚本自动完成镜像拉取、数据库迁移、服务重启

### 2. 部署脚本详解

部署脚本 `scripts/update.sh` 的功能：

#### 功能概述

```bash
#!/bin/bash
# 功能：
# 1. 拉取最新镜像
# 2. 运行数据库迁移
# 3. 更新并重启应用服务
```

#### 使用方式

```bash
./update.sh [tag] [project_path] [docker_password]
```

**参数说明**：

- `tag`：镜像标签（如 `latest` 或 `a1b2c3d`）
- `project_path`：项目路径（如 `/www/server/panel/data/compose/qm-photo-mysql-prod`）
- `docker_password`：Docker Registry 登录密码

#### 执行流程

1. **检查并登录 Docker Registry**

   ```bash
   echo "$DOCKER_PASSWORD" | docker login --username="${DOCKER_USERNAME}" --password-stdin "${SELECTED_REGISTRY}"
   ```

2. **拉取最新镜像**

   ```bash
   docker pull "${FULL_IMAGE_NAME}"
   ```

3. **运行数据库迁移**

   ```bash
   docker-compose -f "$COMPOSE_FILE" run --rm app \
     sh -c "pnpm prisma generate && pnpm prisma migrate deploy"
   ```

4. **更新并重启应用服务**

   ```bash
   export DOCKER_IMAGE_TAG="${TAG}"
   docker-compose -f "$COMPOSE_FILE" up -d --no-deps app
   ```

   **注意**：使用 `--no-deps` 参数，只更新应用服务，不影响 MySQL 和 Redis

5. **健康检查**

   ```bash
   # 检查容器是否运行
   docker ps | grep qm-photo-app-prod

   # 检查 PM2 服务是否在线
   docker exec qm-photo-app-prod pm2 list | grep -q "online"
   ```

### 3. GitHub Actions 部署配置

```yaml
- name: 更新服务器镜像并重启服务
  id: deploy
  if: success()
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.SSH_HOST }}
    username: ${{ secrets.SSH_USERNAME }}
    password: ${{ secrets.SSH_PASSWORD }}
    port: ${{ secrets.SSH_PORT || 22 }}
    script: |
      bash ${{ secrets.SSH_SCRIPT_PATH }} \
        "${{ steps.image-tag.outputs.tag }}" \
        "${{ secrets.SSH_PROJECT_PATH }}" \
        "${{ secrets.ALIYUN_DOCKER_PASSWORD }}"
```

### 4. 部署特点

- **零停机部署**：使用 `docker-compose up -d --no-deps` 实现平滑更新
- **数据安全**：部署前自动运行数据库迁移，确保数据一致性
- **健康检查**：部署后自动检查服务状态，确保部署成功
- **回滚支持**：可以手动指定镜像标签进行回滚

---

## 邮件通知

### 1. 通知触发

邮件通知在以下情况发送：

- **构建成功**：构建和部署都成功时
- **构建失败**：构建或部署失败时

### 2. 邮件内容

邮件包含以下信息：

- **基本信息**：仓库、分支、提交信息、作者
- **构建信息**：镜像标签、镜像地址、构建状态
- **部署信息**：部署状态、部署路径（如果成功）
- **错误信息**：错误详情和工作流链接（如果失败）

### 3. 配置说明

```yaml
- name: 发送邮件通知
  if: always()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: ${{ secrets.SMTP_SERVER }}
    server_port: ${{ secrets.SMTP_PORT || 465 }}
    secure: true
    username: ${{ secrets.SMTP_USERNAME }}
    password: ${{ secrets.SMTP_PASSWORD }}
    to: ${{ secrets.EMAIL_TO }}
    from: ${{ secrets.SMTP_FROM || secrets.SMTP_USERNAME }}
```

---

## 配置说明

### 1. GitHub Secrets 配置

在 GitHub 仓库的 `Settings → Secrets and variables → Actions` 中添加以下 Secrets：

#### 镜像仓库配置

- `ALIYUN_DOCKER_USERNAME`：阿里云容器镜像服务用户名
- `ALIYUN_DOCKER_PASSWORD`：阿里云容器镜像服务密码

#### SSH 服务器配置

- `SSH_HOST`：服务器 IP 地址或域名
- `SSH_USERNAME`：SSH 用户名
- `SSH_PASSWORD`：SSH 密码
- `SSH_PORT`：SSH 端口（可选，默认 22）

#### 部署脚本配置

- `SSH_SCRIPT_PATH`：部署脚本路径（如 `/root/docker-compose/bin/update.sh`）
- `SSH_PROJECT_PATH`：项目路径（如 `/www/server/panel/data/compose/qm-photo-mysql-prod`）

#### 邮件通知配置

- `SMTP_SERVER`：SMTP 服务器地址（如 `smtp.qq.com`）
- `SMTP_PORT`：SMTP 端口（如 `465`）
- `SMTP_USERNAME`：SMTP 用户名（邮箱地址）
- `SMTP_PASSWORD`：SMTP 密码（邮箱授权码）
- `SMTP_FROM`：发件人邮箱（可选）
- `EMAIL_TO`：收件人邮箱地址

### 2. 服务器环境配置

#### 部署脚本位置

将 `update.sh` 脚本上传到服务器，例如：

```bash
# 创建目录
mkdir -p /root/docker-compose/bin

# 上传脚本
scp scripts/update.sh root@your-server:/root/docker-compose/bin/

# 设置执行权限
chmod +x /root/docker-compose/bin/update.sh
```

#### 项目目录配置

确保项目目录存在以下文件：

- `docker-compose.yaml` 或 `docker-compose.prod.yml`
- `.env` 或 `.env.production`

---

## 如何修改和扩展

### 1. 修改构建流程

#### 添加构建步骤

在 `.github/workflows/deploy.yml` 中添加新的步骤：

```yaml
- name: 运行测试
  run: pnpm test

- name: 代码检查
  run: pnpm lint
```

#### 修改镜像标签规则

修改 `生成镜像标签` 步骤：

```yaml
- name: 生成镜像标签
  id: image-tag
  run: |
    # 使用版本号作为标签
    TAG="v1.0.0"
    echo "tag=${TAG}" >> $GITHUB_OUTPUT
```

#### 添加多环境支持

```yaml
env:
  REGISTRY: ${{ secrets.DOCKER_REGISTRY }}
  NAMESPACE: ${{ secrets.DOCKER_NAMESPACE }}
  IMAGE_NAME: qm-photo-server
  ENVIRONMENT: ${{ github.event.inputs.environment || 'production' }}
```

### 2. 修改部署流程

#### 添加部署前检查

在 `update.sh` 脚本中添加：

```bash
# 检查磁盘空间
AVAILABLE_SPACE=$(df -h / | awk 'NR==2 {print $4}')
echo "可用磁盘空间: ${AVAILABLE_SPACE}"

# 检查内存使用
FREE_MEM=$(free -h | awk 'NR==2 {print $4}')
echo "可用内存: ${FREE_MEM}"
```

#### 添加部署后验证

```bash
# 验证 API 健康检查
HEALTH_CHECK_URL="http://localhost:3008/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_CHECK_URL}")

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}健康检查失败: HTTP ${HTTP_CODE}${NC}"
    exit 1
fi
```

#### 支持多环境部署

修改脚本支持环境参数：

```bash
ENVIRONMENT=${4:-"production"}
COMPOSE_FILE="docker-compose.${ENVIRONMENT}.yml"
```

### 3. 扩展通知方式

#### 添加钉钉通知

```yaml
- name: 发送钉钉通知
  if: always()
  run: |
    curl -X POST "${{ secrets.DINGTALK_WEBHOOK }}" \
      -H "Content-Type: application/json" \
      -d "{
        \"msgtype\": \"text\",
        \"text\": {
          \"content\": \"构建${{ job.status == 'success' && '成功' || '失败' }}\"
        }
      }"
```

#### 添加企业微信通知

```yaml
- name: 发送企业微信通知
  if: always()
  run: |
    curl -X POST "${{ secrets.WECHAT_WEBHOOK }}" \
      -H "Content-Type: application/json" \
      -d "{
        \"msgtype\": \"text\",
        \"text\": {
          \"content\": \"构建${{ job.status == 'success' && '成功' || '失败' }}\"
        }
      }"
```

### 4. 添加回滚功能

创建回滚脚本 `scripts/rollback.sh`：

```bash
#!/bin/bash
# 回滚到指定版本
TAG=${1:-"previous"}
PROJECT_DIR=${2:-"/www/server/panel/data/compose/qm-photo-mysql-prod"}

cd "$PROJECT_DIR"
export DOCKER_IMAGE_TAG="${TAG}"
docker-compose -f docker-compose.yaml up -d --no-deps app
```

### 5. 添加监控和告警

#### 集成 Prometheus

在应用中暴露 metrics 端点：

```typescript
// main.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [PrometheusModule.register()],
})
export class AppModule {}
```

#### 添加告警规则

在服务器上配置 Prometheus Alertmanager，监控服务状态。

---

## 故障排查

### 1. 构建失败

#### 问题：Docker 登录失败

**原因**：Secrets 配置错误或密码过期

**解决**：

1. 检查 `ALIYUN_DOCKER_USERNAME` 和 `ALIYUN_DOCKER_PASSWORD` 是否正确
2. 在阿里云控制台重新生成访问凭证

#### 问题：构建超时

**原因**：网络问题或依赖下载慢

**解决**：

1. 检查 Dockerfile 中的镜像源配置
2. 增加构建超时时间：`timeout-minutes: 60`

#### 问题：缓存失效

**原因**：缓存 key 变化或缓存过期

**解决**：

1. 检查 `pnpm-lock.yaml` 和 `prisma/schema.prisma` 是否变化
2. 清除 GitHub Actions 缓存后重新构建

### 2. 部署失败

#### 问题：SSH 连接失败

**原因**：服务器 IP、用户名或密码错误

**解决**：

1. 检查 `SSH_HOST`、`SSH_USERNAME`、`SSH_PASSWORD` 配置
2. 测试 SSH 连接：`ssh username@host`

#### 问题：脚本执行失败

**原因**：脚本路径错误或权限不足

**解决**：

1. 检查 `SSH_SCRIPT_PATH` 是否正确
2. 确保脚本有执行权限：`chmod +x update.sh`

#### 问题：镜像拉取失败

**原因**：Docker Registry 登录失败或网络问题

**解决**：

1. 检查 Docker Registry 密码是否正确
2. 在服务器上手动测试登录：`docker login`

#### 问题：数据库迁移失败

**原因**：数据库连接失败或迁移脚本错误

**解决**：

1. 检查 `.env.production` 中的数据库配置
2. 查看迁移日志：`docker-compose logs app`

#### 问题：服务启动失败

**原因**：端口冲突或配置错误

**解决**：

1. 检查端口是否被占用：`netstat -tulpn | grep 3008`
2. 查看容器日志：`docker-compose logs app`

### 3. 邮件通知失败

#### 问题：邮件发送失败

**原因**：SMTP 配置错误

**解决**：

1. 检查 SMTP 服务器地址和端口
2. 确认邮箱授权码是否正确（不是登录密码）
3. 测试 SMTP 连接

---

## 总结

本项目实现了完整的 CI/CD 流程，包括：

✅ **自动化构建**：代码推送后自动构建 Docker 镜像  
✅ **自动化部署**：构建完成后自动部署到生产服务器  
✅ **邮件通知**：实时通知构建和部署状态  
✅ **缓存优化**：构建时间从 24 分钟优化到 3-8 分钟  
✅ **零停机部署**：平滑更新，不影响服务可用性

通过本文档，你可以：

- 了解 CI/CD 的完整实现流程
- 根据需求修改和扩展功能
- 快速排查和解决常见问题

如有问题，请参考故障排查章节或查看项目 Issues。
