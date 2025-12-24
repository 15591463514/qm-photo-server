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
# 环境变量：
# - DOCKER_IMAGE_TAG: 镜像标签（默认 latest）
# - PROJECT_PATH: 项目路径（必须设置或通过参数传递）
# - USE_VPC: 是否使用 VPC 网络（默认 false）
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