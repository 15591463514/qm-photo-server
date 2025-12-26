# 我的 GitHub Actions 自动化部署实践

> 记录我在 qm-photo-server 项目中使用 GitHub Actions 实现自动化部署的完整过程，包括方案选择、脚本实现和踩坑经验。

## 📋 目录

- [为什么需要自动化部署](#为什么需要自动化部署)
- [部署方案的选择](#部署方案的选择)
- [为什么选择 SSH + 脚本](#为什么选择-ssh--脚本)
- [我的部署实现](#我的部署实现)
- [遇到的问题和解决方案](#遇到的问题和解决方案)
- [总结](#总结)

---

## 为什么需要自动化部署

### 我的痛点

在实现自动化部署之前，我每次更新代码都要：

1. 本地构建 Docker 镜像
2. 手动推送到阿里云镜像仓库
3. SSH 登录服务器
4. 拉取最新镜像
5. 运行数据库迁移
6. 重启服务

太麻烦了！而且容易出错。我需要一个自动化方案。

### 自动化部署的好处

- ✅ **节省时间**：推送代码后自动部署，不需要手动操作
- ✅ **减少错误**：自动化流程，减少人为错误
- ✅ **快速迭代**：可以频繁部署，快速验证功能
- ✅ **可追溯**：每次部署都有记录，方便回滚

---

## 部署方案的选择

### 快速对比

在实现自动化部署之前，我调研了几种常见的方案：

| 方案                     | 我的评价                 | 是否考虑 |
| ------------------------ | ------------------------ | -------- |
| **Webhook**              | 需要维护服务器，太复杂   | ❌       |
| **SSH + 脚本**           | 简单直接，完全控制       | ✅       |
| **Docker Compose Watch** | 功能有限，不适合我的场景 | ❌       |
| **部署平台**             | 需要付费，我的项目用不上 | ❌       |

### 核心区别（简单说）

- **Webhook**：GitHub Actions 调用服务器 API，服务器端控制部署
- **SSH + 脚本**：GitHub Actions 直接 SSH 执行脚本，我完全控制
- **Docker Compose Watch**：服务器端自动检测，但功能有限
- **部署平台**：通过平台 API，但需要付费

最终我选择了 **SSH + 脚本** 的方案，原因下面详细说。

### 其他方案（简单了解）

除了我选择的方案，还有其他几种常见的部署方式：

- **Webhook**：需要维护服务器，太复杂，我的项目用不上
- **Docker Compose Watch**：功能有限，不适合我的场景
- **部署平台**：需要付费，我的项目用不上

这些方案各有优缺点，但对于我的项目来说，SSH + 脚本是最合适的选择。下面详细说说我是怎么实现的。

---

## 为什么选择 SSH + 脚本

作为一个独立开发者，我需要一个既简单又强大的部署方案。经过对比，我选择了 **SSH + 脚本**，主要原因：

1. **简单直接**：不需要额外的服务（如 Webhook 服务器），配置简单，脚本逻辑清晰
2. **完全控制**：可以完全控制部署流程，处理数据库迁移、健康检查等复杂场景
3. **灵活性高**：脚本可以随时修改，支持回滚、灰度发布等策略，可以版本化管理
4. **成本为零**：不需要额外服务或付费平台，资源占用少
5. **完美集成**：与 GitHub Actions 无缝集成，构建完成后自动部署

---

## 我的部署实现

### 第一步：创建部署脚本

我在服务器上创建了 `update.sh` 脚本，这个脚本可以放在服务器的任意位置。我的脚本路径是 `/www/server/panel/data/compose/update.sh`。

脚本的主要功能：

1. **登录镜像仓库**：使用传入的密码登录阿里云容器镜像服务
2. **拉取最新镜像**：根据标签拉取对应版本的镜像
3. **运行数据库迁移**：确保数据库结构是最新的
4. **更新服务**：使用 `--no-deps` 只更新应用，不影响数据库
5. **健康检查**：验证服务是否正常启动

### 第二步：配置 GitHub Actions

在 GitHub Actions 的 Workflow 中，我添加了部署步骤：

```yaml
# 部署到服务器
- name: 更新服务器镜像并重启服务
  id: deploy
  if: success() # 只在构建成功时部署
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
      echo '=====镜像更新完成====='
      echo '=====服务重启完成====='
```

**关键配置**：

- `SSH_HOST`：服务器 IP 地址
- `SSH_USERNAME`：SSH 用户名
- `SSH_PASSWORD`：SSH 密码（也可以使用 SSH 密钥，更安全）
- `SSH_SCRIPT_PATH`：部署脚本的路径
- `SSH_PROJECT_PATH`：项目目录路径（Docker Compose 文件所在目录）
- `ALIYUN_DOCKER_PASSWORD`：阿里云容器镜像服务的密码

### 第三步：配置 GitHub Secrets

在 GitHub 仓库的 `Settings → Secrets and variables → Actions` 中添加：

- `SSH_HOST`：服务器 IP
- `SSH_USERNAME`：SSH 用户名
- `SSH_PASSWORD`：SSH 密码
- `SSH_PORT`：SSH 端口（默认 22）
- `SSH_SCRIPT_PATH`：部署脚本路径（如 `/www/server/panel/data/compose/update.sh`）
- `SSH_PROJECT_PATH`：项目路径（如 `/www/server/panel/data/compose/qm-photo-mysql-prod`）
- `ALIYUN_DOCKER_PASSWORD`：阿里云容器镜像服务密码

### 完整的部署流程

1. **代码推送** → 触发 GitHub Actions
2. **构建镜像** → 构建并推送到阿里云
3. **SSH 连接** → 连接到服务器
4. **执行脚本** → 运行 `update.sh` 脚本
5. **自动部署** → 拉取镜像、运行迁移、重启服务
6. **邮件通知** → 发送部署结果邮件

整个过程完全自动化，我只需要推送代码，剩下的都交给 CI/CD。

### 部署脚本的关键点

我的 `update.sh` 脚本做了这些事情：

1. **参数验证**：检查必需参数（镜像标签、项目路径、Docker 密码）
2. **环境检测**：自动检测 `docker-compose.yaml` 或 `docker-compose.prod.yml`
3. **登录镜像仓库**：如果未登录，使用密码登录
4. **拉取镜像**：根据标签拉取对应版本的镜像
5. **运行迁移**：运行 Prisma 数据库迁移
6. **更新服务**：使用 `--no-deps` 只更新应用，不影响 MySQL 和 Redis
7. **健康检查**：验证服务是否正常启动（检查 PM2 状态）

**关键点**：

- 使用 `--no-deps` 参数很重要，这样只会更新应用服务，不会影响数据库
- 健康检查通过 PM2 状态判断，确保应用正常运行
- 脚本支持自动检测 docker-compose 文件，适应不同的项目结构

### 完整的 update.sh 脚本

这是我的完整脚本内容：

```bash
#!/bin/bash

# ============================================
# 更新 Docker 镜像并重启服务脚本
# ============================================
# 功能：
# 1. 拉取最新镜像
# 2. 运行数据库迁移
# 3. 更新并重启应用服务
# ============================================
# 使用方法：
# ./update.sh [tag] [project_path] [docker_password]
# 示例：
# ./update.sh latest /www/server/panel/data/compose/qm-photo-mysql-prod your-password
# ./update.sh a1b2c3d /www/server/panel/data/compose/qm-photo-mysql-prod your-password
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 阿里云容器镜像服务配置
REGISTRY="crpi-eg9062f6byi3012b.cn-chengdu.personal.cr.aliyuncs.com"
REGISTRY_VPC="crpi-eg9062f6byi3012b-vpc.cn-chengdu.personal.cr.aliyuncs.com"
NAMESPACE="dawn_dockers"
IMAGE_NAME="qm-photo-server"
DOCKER_USERNAME="all丶亦然"

# 镜像标签（可通过参数或环境变量设置）
TAG=${1:-${DOCKER_IMAGE_TAG:-"latest"}}

# 项目路径（可通过参数或环境变量设置）
PROJECT_DIR=${2:-${PROJECT_PATH:-""}}

# Docker 登录密码（通过第三个参数传入）
DOCKER_PASSWORD=${3:-""}

# 检查密码是否设置
if [ -z "$DOCKER_PASSWORD" ]; then
    echo -e "${RED}错误: 未提供 Docker 登录密码${NC}"
    echo "使用方法: $0 [tag] [project_path] [docker_password]"
    exit 1
fi

# 检查项目路径
if [ -z "$PROJECT_DIR" ]; then
    echo -e "${RED}错误: 未指定项目路径${NC}"
    echo "使用方法: $0 [tag] [project_path]"
    echo "或设置环境变量: export PROJECT_PATH=/path/to/qm-photo-server"
    exit 1
fi

# 检查项目目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}错误: 项目目录不存在: ${PROJECT_DIR}${NC}"
    exit 1
fi

# 切换到项目目录
cd "$PROJECT_DIR"

# 自动检测 docker-compose 文件（支持宝塔面板的 .yaml 格式）
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
elif [ -f "docker-compose.yaml" ]; then
    COMPOSE_FILE="docker-compose.yaml"
elif [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
else
    echo -e "${RED}错误: 未找到 docker-compose 文件${NC}"
    exit 1
fi

# 自动检测环境变量文件
if [ -f ".env.production" ]; then
    ENV_FILE=".env.production"
elif [ -f ".env" ]; then
    ENV_FILE=".env"
else
    echo -e "${RED}错误: 未找到环境变量文件 (.env 或 .env.production)${NC}"
    exit 1
fi

# 检测是否在 VPC 网络
USE_VPC=${USE_VPC:-"false"}

# 选择使用的 Registry 地址
if [ "$USE_VPC" = "true" ]; then
    SELECTED_REGISTRY="${REGISTRY_VPC}"
    echo -e "${YELLOW}使用 VPC 网络地址: ${SELECTED_REGISTRY}${NC}"
else
    SELECTED_REGISTRY="${REGISTRY}"
fi

# 完整镜像名称
FULL_IMAGE_NAME="${SELECTED_REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${TAG}"

# 加载环境变量
export $(cat "$ENV_FILE" | grep -v '^#' | xargs)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}更新 Docker 镜像并重启服务${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}项目路径: ${PROJECT_DIR}${NC}"
echo -e "${YELLOW}Compose 文件: ${COMPOSE_FILE}${NC}"
echo -e "${YELLOW}环境文件: ${ENV_FILE}${NC}"
echo -e "${YELLOW}镜像标签: ${TAG}${NC}"
echo -e "${YELLOW}镜像地址: ${FULL_IMAGE_NAME}${NC}"
echo ""

# 1. 检查并登录 Registry
echo -e "${YELLOW}[1/4] 检查 Docker Registry 登录状态...${NC}"
# 尝试静默拉取镜像来检查是否已登录
if ! docker pull "${FULL_IMAGE_NAME}" --quiet 2>/dev/null; then
    echo -e "${YELLOW}需要登录阿里云容器镜像服务${NC}"
    # 使用环境变量中的密码进行非交互式登录
    echo "$DOCKER_PASSWORD" | docker login --username="${DOCKER_USERNAME}" --password-stdin "${SELECTED_REGISTRY}"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Docker Registry 登录成功${NC}"
    else
        echo -e "${RED}✗ Docker Registry 登录失败${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Docker Registry 已登录${NC}"
fi

# 2. 拉取最新镜像
echo -e "${YELLOW}[2/4] 拉取最新镜像...${NC}"
docker pull "${FULL_IMAGE_NAME}"

if [ $? -ne 0 ]; then
    echo -e "${RED}镜像拉取失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 镜像拉取成功${NC}"

# 3. 运行数据库迁移
echo -e "${YELLOW}[3/4] 运行数据库迁移...${NC}"
docker-compose -f "$COMPOSE_FILE" run --rm app \
  sh -c "pnpm prisma generate && pnpm prisma migrate deploy"

# 4. 更新并重启应用服务
echo -e "${YELLOW}[4/4] 更新并重启应用服务...${NC}"
export DOCKER_IMAGE_TAG="${TAG}"
docker-compose -f "$COMPOSE_FILE" up -d --no-deps app

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 健康检查
echo -e "${YELLOW}执行健康检查...${NC}"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker ps | grep -q qm-photo-app-prod; then
        if docker exec qm-photo-app-prod pm2 list | grep -q "online"; then
            echo -e "${GREEN}✓ 服务健康检查通过${NC}"
            break
        fi
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "健康检查失败，重试 $RETRY_COUNT/$MAX_RETRIES..."
    sleep 3
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}✗ 健康检查失败，请查看日志${NC}"
    docker-compose -f "$COMPOSE_FILE" logs app
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 镜像更新完成${NC}"
echo -e "${GREEN}✅ 服务重启完成${NC}"
echo -e "${GREEN}========================================${NC}"
```

**脚本说明**：

1. **参数处理**：支持通过命令行参数或环境变量传入配置
2. **自动检测**：自动检测 docker-compose 文件和环境变量文件
3. **VPC 支持**：支持使用 VPC 网络地址（如果服务器在阿里云 VPC 内）
4. **智能登录**：先尝试拉取镜像，如果失败再登录，避免重复登录
5. **错误处理**：使用 `set -e` 确保任何步骤失败都会退出
6. **健康检查**：通过 PM2 状态判断服务是否正常运行

---

## 遇到的问题和解决方案

### 问题 1：SSH 连接失败

**错误信息**：

```
Permission denied (publickey,password)
```

**原因**：SSH 用户名或密码错误，或者服务器 IP/端口不正确。

**解决方案**：

1. 检查 GitHub Secrets 中的 SSH 配置是否正确
2. 在本地测试 SSH 连接：`ssh username@host -p port`
3. 确认服务器允许密码登录（某些服务器可能只允许密钥登录）

### 问题 2：脚本找不到

**错误信息**：

```
bash: /path/to/update.sh: No such file or directory
```

**原因**：脚本路径配置错误，或者脚本不存在。

**解决方案**：

1. 检查 `SSH_SCRIPT_PATH` 配置是否正确
2. 在服务器上确认脚本存在：`ls -l /path/to/update.sh`
3. 确保脚本有执行权限：`chmod +x /path/to/update.sh`

### 问题 3：Docker 命令失败

**错误信息**：

```
docker: command not found
```

**原因**：Docker 未安装，或者用户没有 Docker 执行权限。

**解决方案**：

1. 检查 Docker 是否安装：`docker --version`
2. 确认用户有 Docker 执行权限（可能需要加入 docker 用户组）
3. 使用完整路径：`/usr/bin/docker`

### 问题 4：镜像拉取失败

**错误信息**：

```
unauthorized: authentication required
```

**原因**：Docker Registry 登录失败，或者密码错误。

**解决方案**：

1. 检查 `ALIYUN_DOCKER_PASSWORD` 是否正确
2. 确认使用的是容器镜像服务的访问凭证（不是登录密码）
3. 在服务器上手动测试登录：`docker login your-registry.com`

### 问题 5：服务启动失败

**错误信息**：容器启动后立即退出，健康检查失败。

**原因**：应用启动失败，可能是环境变量、数据库连接等问题。

**解决方案**：

1. 查看容器日志：`docker-compose logs app`
2. 检查环境变量配置是否正确
3. 验证数据库连接是否正常
4. 检查端口是否被占用

### 问题 6：数据库迁移失败

**错误信息**：Prisma 迁移执行失败。

**原因**：数据库连接失败，或者迁移脚本有问题。

**解决方案**：

1. 检查数据库连接配置
2. 确认数据库服务正常运行
3. 查看迁移日志：`docker-compose logs app | grep prisma`

### 问题 7：脚本执行超时

**错误信息**：SSH 连接超时。

**原因**：网络问题，或者脚本执行时间过长。

**解决方案**：

1. 检查服务器网络是否正常
2. 增加 SSH 超时时间
3. 优化脚本执行速度（如并行执行某些操作）

## 总结

### 我的经验总结

经过实践，**SSH + 脚本** 这个部署方案对我来说是完美的：

- ✅ **简单**：配置简单，易于理解和维护
- ✅ **强大**：脚本可以包含任意部署逻辑
- ✅ **灵活**：可以随时修改脚本，适应不同需求
- ✅ **免费**：不需要额外的服务或平台
- ✅ **可靠**：完全控制部署流程，减少出错

### 给其他开发者的建议

如果你也是独立开发者或者小团队，我建议：

1. **从简单开始**：先实现基本功能，再逐步优化
2. **脚本版本化**：将脚本提交到 Git，方便版本管理
3. **添加日志**：详细的日志输出有助于排查问题
4. **健康检查**：确保服务正常启动后再结束部署
5. **错误处理**：添加错误处理，避免部署失败时数据丢失
6. **邮件通知**：添加邮件通知，及时了解部署结果

### 下一步计划

目前我的部署方案已经比较完善了，后续可能会：

- 使用 SSH 密钥代替密码（更安全）
- 添加回滚功能（快速回滚到之前的版本）
- 实现灰度发布（逐步切换流量）
- 添加部署前的检查（如代码检查、测试等）

如果你也在做类似的项目，希望我的经验对你有帮助。有问题欢迎交流！
