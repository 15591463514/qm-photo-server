# GitHub Actions 工作流说明

## 自动部署工作流

当 `master` 分支有代码变更时，会自动触发 Docker 镜像构建和推送流程。

## 配置要求

### 1. GitHub Secrets 配置

在 GitHub 仓库设置中添加以下 Secrets：

1. 进入仓库：`Settings` → `Secrets and variables` → `Actions`
2. 点击 `New repository secret` 添加以下密钥：

#### 必需配置

- **`ALIYUN_DOCKER_USERNAME`**: 阿里云容器镜像服务的用户名
  - 值：`all丶亦然`（根据你的实际用户名修改）

- **`ALIYUN_DOCKER_PASSWORD`**: 阿里云容器镜像服务的密码或访问令牌
  - 获取方式：
    1. 登录阿里云控制台
    2. 进入「容器镜像服务」→「访问凭证」
    3. 设置并获取「登录密码」或使用「访问令牌」

### 2. 工作流触发条件

- **自动触发**：当 `master` 分支有代码推送时
- **手动触发**：在 GitHub Actions 页面可以手动触发，并可指定镜像标签

### 3. 镜像标签规则

- **自动触发**：使用 commit SHA 的前 7 位作为标签（例如：`a1b2c3d`），同时标记为 `latest`
- **手动触发**：可以自定义标签，默认为 `latest`

## 工作流步骤

1. ✅ 检出代码
2. ✅ 设置 Docker Buildx（支持多平台构建）
3. ✅ 登录阿里云容器镜像服务
4. ✅ 生成镜像标签
5. ✅ 构建 Docker 镜像（平台：linux/amd64）
6. ✅ 推送镜像到 Registry
7. ✅ 输出镜像信息

## 使用方式

### 自动部署

1. 将代码推送到 `master` 分支
2. GitHub Actions 会自动触发构建
3. 在 Actions 页面查看构建进度和日志

### 手动部署

1. 进入 GitHub 仓库的 `Actions` 页面
2. 选择 `Build and Push Docker Image` 工作流
3. 点击 `Run workflow`
4. 可选择输入自定义标签（可选，默认为 `latest`）
5. 点击 `Run workflow` 开始构建

## 服务器端部署

镜像推送成功后，在服务器上执行以下命令拉取并部署：

```bash
# 拉取最新镜像
docker pull crpi-eg9062f6byi3012b.cn-chengdu.personal.cr.aliyuncs.com/dawn_dockers/qm-photo-server:latest

# 或者使用具体的 commit SHA 标签
docker pull crpi-eg9062f6byi3012b.cn-chengdu.personal.cr.aliyuncs.com/dawn_dockers/qm-photo-server:a1b2c3d

# 使用部署脚本部署（推荐）
cd qm-photo-server
./scripts/deploy-from-registry.sh latest
```

## 注意事项

1. **安全性**：确保 GitHub Secrets 中的密码/令牌安全，不要泄露
2. **网络**：GitHub Actions 运行在 GitHub 的服务器上，确保可以访问阿里云容器镜像服务
3. **权限**：确保 GitHub Actions 有权限推送到仓库
4. **缓存**：工作流使用了 Docker 构建缓存，可以加速后续构建

## 故障排查

### 构建失败

1. 检查 GitHub Secrets 是否正确配置
2. 检查 Dockerfile 是否有语法错误
3. 查看 Actions 日志中的详细错误信息

### 推送失败

1. 检查阿里云容器镜像服务的登录凭证是否正确
2. 检查是否有推送权限
3. 检查网络连接是否正常

### 镜像拉取失败

1. 确保服务器已登录阿里云容器镜像服务：
   ```bash
   docker login --username=all丶亦然 crpi-eg9062f6byi3012b.cn-chengdu.personal.cr.aliyuncs.com
   ```
2. 检查镜像标签是否正确
3. 检查服务器网络是否正常

