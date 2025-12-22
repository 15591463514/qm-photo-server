#!/bin/bash

# ============================================
# 从 Docker Registry 部署脚本（服务器端使用）
# ============================================
# 功能：
# 1. 从阿里云容器镜像服务拉取最新镜像
# 2. 运行数据库迁移
# 3. 启动/重启服务
# 4. 健康检查
# ============================================
# 使用方法：
# ./scripts/deploy-from-registry.sh [tag]
# 示例：
# ./scripts/deploy-from-registry.sh latest
# ./scripts/deploy-from-registry.sh v1.0.0
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

# 镜像标签（默认为 latest）
TAG=${1:-"latest"}

# 检测是否在 VPC 网络（可以通过环境变量设置）
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

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

# 检查环境变量文件
if [ ! -f .env.production ]; then
    echo -e "${RED}错误: .env.production 文件不存在${NC}"
    echo "请复制 .env.production.example 并修改配置"
    exit 1
fi

# 加载环境变量
export $(cat .env.production | grep -v '^#' | xargs)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}从 Registry 部署应用${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}Registry: ${SELECTED_REGISTRY}${NC}"
echo -e "${YELLOW}镜像地址: ${FULL_IMAGE_NAME}${NC}"
echo ""

# 1. 检查并登录 Registry
echo -e "${YELLOW}[1/5] 检查 Docker Registry 登录状态...${NC}"
if ! docker info | grep -q "${SELECTED_REGISTRY}"; then
    echo -e "${YELLOW}需要登录阿里云容器镜像服务${NC}"
    docker login --username="${DOCKER_USERNAME}" "${SELECTED_REGISTRY}"
fi

# 2. 拉取最新镜像
echo -e "${YELLOW}[2/5] 拉取最新镜像...${NC}"
docker pull "${FULL_IMAGE_NAME}"

if [ $? -ne 0 ]; then
    echo -e "${RED}镜像拉取失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 镜像拉取成功${NC}"

# 3. 启动数据库和 Redis（如果未运行）
echo -e "${YELLOW}[3/5] 启动数据库和 Redis...${NC}"
docker-compose -f docker-compose.prod.yml up -d mysql redis

# 等待数据库就绪
echo "等待数据库就绪..."
sleep 10

# 4. 运行数据库迁移
echo -e "${YELLOW}[4/5] 运行数据库迁移...${NC}"
docker-compose -f docker-compose.prod.yml run --rm app \
  sh -c "pnpm prisma generate && pnpm prisma migrate deploy"

# 5. 启动应用服务
echo -e "${YELLOW}[5/5] 启动应用服务...${NC}"
docker-compose -f docker-compose.prod.yml up -d app

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 6. 健康检查
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
    docker-compose -f docker-compose.prod.yml logs app
    exit 1
fi

# 7. 显示服务状态
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "服务状态："
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "查看日志："
echo "  docker-compose -f docker-compose.prod.yml logs -f app"
echo ""
echo "PM2 状态："
echo "  docker exec qm-photo-app-prod pm2 list"
echo ""
echo "PM2 日志："
echo "  docker exec qm-photo-app-prod pm2 logs"
echo ""

