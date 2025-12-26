# 从零到一：在项目中集成 CI/CD 完整指南

> 本文是一篇完整的博客文章，介绍如何在项目中集成 CI/CD，包括各种方案的对比、选择建议，以及基于 GitHub Actions + Docker 的完整实现方案。

## 📋 目录

- [什么是 CI/CD](#什么是-cicd)
- [为什么需要 CI/CD](#为什么需要-cicd)
- [CI/CD 方案对比](#cicd-方案对比)
- [方案选择建议](#方案选择建议)
- [实战：GitHub Actions + Docker 方案](#实战github-actions--docker-方案)
- [自动化构建详解](#自动化构建详解)
- [自动化部署详解](#自动化部署详解)
- [进阶优化](#进阶优化)
- [常见问题与解决方案](#常见问题与解决方案)
- [总结](#总结)

---

## 什么是 CI/CD

### CI（持续集成）

**持续集成（Continuous Integration）** 是指开发人员频繁地将代码集成到主分支，每次集成都通过自动化构建和测试来验证代码质量。

**核心流程**：

1. 代码提交到版本控制系统（如 Git）
2. 自动触发构建流程
3. 运行自动化测试
4. 生成构建产物（如 Docker 镜像）
5. 反馈构建结果

### CD（持续部署/交付）

**持续部署（Continuous Deployment）** 是指代码通过所有测试后，自动部署到生产环境。

**持续交付（Continuous Delivery）** 是指代码随时可以部署到生产环境，但需要手动触发。

**核心流程**：

1. 构建产物推送到仓库
2. 自动部署到目标环境
3. 运行健康检查
4. 通知部署结果

### CI/CD 的价值

- ✅ **提高效率**：自动化构建和部署，减少人工操作
- ✅ **降低风险**：自动化测试和验证，减少人为错误
- ✅ **快速反馈**：及时发现问题，快速修复
- ✅ **标准化流程**：统一的构建和部署流程
- ✅ **可追溯性**：完整的构建和部署历史记录

---

## 为什么需要 CI/CD

### 传统部署方式的痛点

#### 1. 手动部署效率低

```bash
# 传统方式：需要手动执行多个步骤
git pull
npm install
npm run build
docker build -t myapp:latest .
docker push myapp:latest
ssh user@server "docker pull myapp:latest && docker-compose up -d"
```

**问题**：

- 步骤繁琐，容易出错
- 耗时较长，影响开发效率
- 需要记住所有命令和参数

#### 2. 环境不一致

- 开发环境、测试环境、生产环境配置不同
- 手动部署容易遗漏配置项
- 难以保证环境一致性

#### 3. 缺乏自动化测试

- 手动测试覆盖不全
- 容易遗漏关键测试场景
- 测试结果不可追溯

#### 4. 回滚困难

- 需要手动查找历史版本
- 回滚过程复杂
- 容易影响服务可用性

### CI/CD 带来的改变

#### 自动化流程

```
代码推送 → 自动构建 → 自动测试 → 自动部署 → 自动通知
```

#### 标准化环境

- 使用 Docker 容器化，保证环境一致性
- 配置文件版本化管理
- 自动化环境配置

#### 快速反馈

- 构建和测试结果实时通知
- 问题快速定位和修复
- 部署状态实时监控

---

## CI/CD 方案对比

### 1. GitHub Actions

**优点**：

- ✅ 与 GitHub 深度集成，配置简单
- ✅ 免费额度充足（2000 分钟/月）
- ✅ 丰富的 Action 生态
- ✅ 支持矩阵构建和多环境部署
- ✅ 配置即代码，版本化管理

**缺点**：

- ❌ 绑定 GitHub 平台
- ❌ 私有仓库需要付费
- ❌ 构建时间受限于 GitHub 服务器

**适用场景**：

- GitHub 托管的项目
- 中小型项目
- 需要快速上手的团队

### 2. GitLab CI/CD

**优点**：

- ✅ 与 GitLab 深度集成
- ✅ 功能强大，支持复杂流程
- ✅ 自托管 Runner 支持
- ✅ 内置容器镜像仓库

**缺点**：

- ❌ 配置相对复杂
- ❌ 免费版功能有限
- ❌ 需要学习 GitLab 特定语法

**适用场景**：

- GitLab 托管的项目
- 需要自托管 Runner 的企业
- 复杂 CI/CD 流程

### 3. Jenkins

**优点**：

- ✅ 完全开源免费
- ✅ 功能强大，插件丰富
- ✅ 支持分布式构建
- ✅ 高度可定制

**缺点**：

- ❌ 需要自己搭建和维护
- ❌ 配置复杂，学习曲线陡
- ❌ 界面相对老旧

**适用场景**：

- 企业级项目
- 需要完全控制 CI/CD 流程
- 有专门的运维团队

### 4. CircleCI

**优点**：

- ✅ 配置简单，上手快
- ✅ 支持多种语言和框架
- ✅ 并行构建支持
- ✅ 良好的文档和社区

**缺点**：

- ❌ 免费额度有限
- ❌ 复杂流程需要付费
- ❌ 绑定 CircleCI 平台

**适用场景**：

- 需要快速上手的团队
- 中小型项目
- 预算充足的项目

### 5. Travis CI

**优点**：

- ✅ 配置简单
- ✅ 支持多种语言
- ✅ 良好的文档

**缺点**：

- ❌ 免费版功能有限
- ❌ 构建速度较慢
- ❌ 对开源项目更友好

**适用场景**：

- 开源项目
- 简单的构建流程

### 方案对比表

| 方案           | 免费额度   | 配置难度   | 功能丰富度 | 社区支持   | 推荐指数   |
| -------------- | ---------- | ---------- | ---------- | ---------- | ---------- |
| GitHub Actions | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| GitLab CI/CD   | ⭐⭐⭐⭐   | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   |
| Jenkins        | ⭐⭐⭐⭐⭐ | ⭐⭐       | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐     |
| CircleCI       | ⭐⭐⭐     | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐     |
| Travis CI      | ⭐⭐       | ⭐⭐⭐⭐   | ⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐       |

---

## 方案选择建议

### 选择 GitHub Actions 的情况

✅ **推荐使用**：

- 项目托管在 GitHub
- 团队规模较小（< 50 人）
- 需要快速上手
- 预算有限
- 构建时间要求不严格

### 选择 GitLab CI/CD 的情况

✅ **推荐使用**：

- 项目托管在 GitLab
- 需要自托管 Runner
- 需要复杂的 CI/CD 流程
- 企业级项目

### 选择 Jenkins 的情况

✅ **推荐使用**：

- 需要完全控制 CI/CD 流程
- 有专门的运维团队
- 需要高度定制化
- 企业级项目

### 选择其他方案的情况

- **CircleCI**：需要快速上手且预算充足
- **Travis CI**：开源项目且流程简单

---

## 实战：GitHub Actions + Docker 方案

本文以 **GitHub Actions + Docker** 方案为例，详细介绍如何从零开始集成 CI/CD。

### 方案架构

```
┌─────────────┐
│ GitHub 仓库  │
└──────┬──────┘
       │ Push
       ▼
┌─────────────────┐
│ GitHub Actions  │
│                 │
│ 1. 检出代码      │
│ 2. 构建镜像      │
│ 3. 推送镜像      │
│ 4. 部署服务      │
│ 5. 发送通知      │
└──────┬──────────┘
       │ SSH
       ▼
┌─────────────┐
│ 生产服务器    │
│             │
│ 1. 拉取镜像  │
│ 2. 运行迁移  │
│ 3. 重启服务  │
└─────────────┘
```

### 前置准备

#### 1. 准备 Docker 镜像仓库

可以选择以下任一方案：

- **阿里云容器镜像服务**（推荐国内使用）
- **Docker Hub**（全球可用）
- **GitHub Container Registry**（与 GitHub 集成）
- **自建 Harbor**（企业级）

#### 2. 准备服务器

- 已安装 Docker 和 Docker Compose
- 配置 SSH 访问
- 准备项目目录和配置文件

#### 3. 准备 GitHub 仓库

- 创建 GitHub 仓库
- 配置 GitHub Secrets

---

## 自动化构建详解

### 第一步：创建 GitHub Actions 工作流

在项目根目录创建 `.github/workflows/deploy.yml`：

```yaml
name: 构建并推送 Docker 镜像

on:
  push:
    branches:
      - master
  workflow_dispatch:

env:
  REGISTRY: your-registry.com
  NAMESPACE: your-namespace
  IMAGE_NAME: your-app

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 设置 Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: 登录镜像仓库
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: 构建并推送镜像
        uses: docker/build-push-action@v5
        with:
          context: ./
          file: ./Dockerfile
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest
```

### 第二步：创建 Dockerfile

创建 `Dockerfile`：

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 构建应用
COPY . .
RUN pnpm run build

# 生产阶段
FROM node:20-alpine AS production

WORKDIR /app

# 安装生产依赖
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

# 复制构建产物
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### 第三步：配置 GitHub Secrets

在 GitHub 仓库的 `Settings → Secrets and variables → Actions` 中添加：

- `DOCKER_USERNAME`：镜像仓库用户名
- `DOCKER_PASSWORD`：镜像仓库密码

### 第四步：优化构建速度

#### 1. 使用缓存

```yaml
- name: 缓存依赖
  uses: actions/cache@v4
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/pnpm-lock.yaml') }}

- name: 构建并推送镜像
  uses: docker/build-push-action@v5
  with:
    cache-from: type=registry,ref=${{ env.REGISTRY }}/${{ env.NAMESPACE }}/${{ env.IMAGE_NAME }}:latest
    cache-to: type=gha,mode=max
```

#### 2. 多阶段构建优化

```dockerfile
# 只复制依赖文件，利用 Docker 层缓存
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 再复制源代码
COPY . .
RUN pnpm run build
```

#### 3. 使用国内镜像源

```dockerfile
RUN npm config set registry https://registry.npmmirror.com
RUN pnpm config set registry https://registry.npmmirror.com
```

### 构建流程总结

1. **代码推送** → 触发工作流
2. **检出代码** → 获取最新代码
3. **设置环境** → 配置 Docker Buildx
4. **登录仓库** → 认证镜像仓库
5. **构建镜像** → 使用 Dockerfile 构建
6. **推送镜像** → 上传到镜像仓库
7. **完成构建** → 输出镜像信息

---

## 自动化部署详解

### 方案一：SSH 远程执行脚本（推荐）

#### 优点

- ✅ 简单直接，易于理解
- ✅ 不需要额外的服务
- ✅ 脚本可以版本化管理
- ✅ 支持复杂的部署逻辑

#### 实现步骤

##### 1. 创建部署脚本

在服务器上创建 `update.sh`：

```bash
#!/bin/bash
set -e

TAG=${1:-"latest"}
PROJECT_DIR=${2:-"/path/to/project"}
DOCKER_PASSWORD=${3:-""}

cd "$PROJECT_DIR"

# 登录镜像仓库
echo "$DOCKER_PASSWORD" | docker login --username="your-username" --password-stdin "your-registry.com"

# 拉取镜像
docker pull your-registry.com/your-namespace/your-app:$TAG

# 运行数据库迁移（如果有）
docker-compose run --rm app npm run migrate

# 重启服务
export DOCKER_IMAGE_TAG=$TAG
docker-compose up -d --no-deps app

# 健康检查
sleep 5
docker ps | grep your-app
```

##### 2. 配置 GitHub Actions

```yaml
- name: 部署到服务器
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.SSH_HOST }}
    username: ${{ secrets.SSH_USERNAME }}
    password: ${{ secrets.SSH_PASSWORD }}
    script: |
      bash /path/to/update.sh \
        "${{ steps.image-tag.outputs.tag }}" \
        "${{ secrets.PROJECT_PATH }}" \
        "${{ secrets.DOCKER_PASSWORD }}"
```

##### 3. 配置 GitHub Secrets

- `SSH_HOST`：服务器 IP
- `SSH_USERNAME`：SSH 用户名
- `SSH_PASSWORD`：SSH 密码
- `PROJECT_PATH`：项目路径
- `DOCKER_PASSWORD`：镜像仓库密码

### 方案二：Webhook 触发部署

#### 优点

- ✅ 服务器端控制部署时机
- ✅ 可以添加额外的验证逻辑
- ✅ 支持回滚和手动触发

#### 实现步骤

##### 1. 创建 Webhook 服务器

```javascript
const http = require('http');
const { exec } = require('child_process');

const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN;
const PORT = 3009;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/deploy') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const data = JSON.parse(body);

      // 验证 Token
      if (data.token !== WEBHOOK_TOKEN) {
        res.writeHead(401);
        res.end('Unauthorized');
        return;
      }

      // 执行部署
      exec('bash /path/to/update.sh', (error, stdout, stderr) => {
        if (error) {
          res.writeHead(500);
          res.end('Deploy failed');
          return;
        }
        res.writeHead(200);
        res.end('Deploy success');
      });
    });
  }
});

server.listen(PORT);
```

##### 2. 配置 GitHub Actions

```yaml
- name: 触发部署
  run: |
    curl -X POST "${{ secrets.WEBHOOK_URL }}" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${{ secrets.WEBHOOK_TOKEN }}" \
      -d '{"tag": "${{ steps.image-tag.outputs.tag }}"}'
```

### 方案三：使用 Docker Compose Watch

#### 优点

- ✅ 自动检测镜像更新
- ✅ 零停机部署
- ✅ 配置简单

#### 实现步骤

```yaml
# docker-compose.yml
services:
  app:
    image: your-registry.com/your-app:latest
    pull_policy: always # 总是拉取最新镜像
    deploy:
      update_config:
        order: start-first # 先启动新容器，再停止旧容器
```

### 部署流程总结

1. **构建完成** → 镜像推送到仓库
2. **SSH 连接** → 连接到生产服务器
3. **执行脚本** → 运行部署脚本
4. **拉取镜像** → 从仓库拉取最新镜像
5. **运行迁移** → 执行数据库迁移（如果有）
6. **重启服务** → 使用新镜像重启服务
7. **健康检查** → 验证服务是否正常
8. **完成部署** → 输出部署结果

---

## 进阶优化

### 1. 多环境部署

#### 配置不同环境

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options:
          - production
          - staging
          - development

env:
  REGISTRY: ${{ secrets.DOCKER_REGISTRY }}
  ENVIRONMENT: ${{ github.event.inputs.environment || 'production' }}
```

#### 环境特定配置

```yaml
- name: 部署到生产环境
  if: env.ENVIRONMENT == 'production'
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.PROD_SSH_HOST }}

- name: 部署到测试环境
  if: env.ENVIRONMENT == 'staging'
  uses: appleboy/ssh-action@master
  with:
    host: ${{ secrets.STAGING_SSH_HOST }}
```

### 2. 并行构建

```yaml
jobs:
  build:
    strategy:
      matrix:
        platform: [linux/amd64, linux/arm64]
    steps:
      - name: 构建多平台镜像
        uses: docker/build-push-action@v5
        with:
          platforms: ${{ matrix.platform }}
```

### 3. 条件部署

```yaml
- name: 部署到服务器
  if: github.ref == 'refs/heads/master' && github.event_name == 'push'
  uses: appleboy/ssh-action@master
```

### 4. 部署前测试

```yaml
- name: 运行测试
  run: |
    npm test
    npm run lint

- name: 部署
  if: success()
  uses: appleboy/ssh-action@master
```

### 5. 回滚支持

```yaml
- name: 回滚到指定版本
  if: github.event_name == 'workflow_dispatch' && github.event.inputs.action == 'rollback'
  uses: appleboy/ssh-action@master
  with:
    script: |
      bash /path/to/rollback.sh "${{ github.event.inputs.version }}"
```

### 6. 通知集成

#### 邮件通知

```yaml
- name: 发送邮件通知
  if: always()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: ${{ secrets.SMTP_SERVER }}
    username: ${{ secrets.SMTP_USERNAME }}
    password: ${{ secrets.SMTP_PASSWORD }}
    to: ${{ secrets.EMAIL_TO }}
    subject: "部署${{ job.status == 'success' && '成功' || '失败' }}"
```

#### 钉钉通知

```yaml
- name: 发送钉钉通知
  if: always()
  run: |
    curl -X POST "${{ secrets.DINGTALK_WEBHOOK }}" \
      -H "Content-Type: application/json" \
      -d '{"msgtype": "text", "text": {"content": "部署完成"}}'
```

---

## 常见问题与解决方案

### 1. 构建失败

#### 问题：Docker 登录失败

**解决方案**：

```yaml
# 检查 Secrets 配置
# 确保 DOCKER_USERNAME 和 DOCKER_PASSWORD 正确
```

#### 问题：构建超时

**解决方案**：

```yaml
jobs:
  build:
    timeout-minutes: 60 # 增加超时时间
```

### 2. 部署失败

#### 问题：SSH 连接失败

**解决方案**：

- 检查服务器 IP 和端口
- 确认 SSH 用户名和密码
- 测试 SSH 连接：`ssh username@host`

#### 问题：权限不足

**解决方案**：

```bash
# 确保脚本有执行权限
chmod +x update.sh

# 确保 Docker 命令可用
sudo usermod -aG docker $USER
```

### 3. 镜像拉取失败

**解决方案**：

- 检查镜像仓库地址是否正确
- 确认镜像标签是否存在
- 检查网络连接

### 4. 服务启动失败

**解决方案**：

- 查看容器日志：`docker-compose logs app`
- 检查端口是否被占用
- 验证环境变量配置

---

## 总结

### 核心要点

1. **选择合适的 CI/CD 平台**：根据项目需求和团队情况选择
2. **分离构建和部署**：构建关注镜像生成，部署关注服务更新
3. **使用缓存优化**：大幅提升构建速度
4. **自动化测试**：确保代码质量
5. **监控和通知**：及时了解构建和部署状态

### 最佳实践

- ✅ 使用多阶段构建优化镜像大小
- ✅ 利用缓存加速构建
- ✅ 实现零停机部署
- ✅ 添加健康检查
- ✅ 支持回滚功能
- ✅ 配置多环境部署
- ✅ 集成通知系统

### 下一步

- 添加自动化测试
- 集成代码质量检查
- 配置监控和告警
- 实现蓝绿部署
- 添加性能测试

通过本文的指导，你可以快速在项目中集成 CI/CD，提高开发效率和代码质量。如有问题，欢迎交流讨论！

---

**作者**：Dawn  
**日期**：2025-12-25  
**版本**：v1.0
