#!/bin/bash

# ============================================
# Docker 镜像构建和推送脚本（阿里云容器镜像服务）
# ============================================
# 功能：
# 1. 构建 Docker 镜像
# 2. 标记镜像
# 3. 推送到阿里云容器镜像服务
# ============================================
# 使用方法：
# ./scripts/build-and-push.sh [tag]
# 示例：
# ./scripts/build-and-push.sh latest
# ./scripts/build-and-push.sh v1.0.0
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

# 完整镜像名称
FULL_IMAGE_NAME="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${TAG}"

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Docker 镜像构建和推送${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${YELLOW}Registry: ${REGISTRY}${NC}"
echo -e "${YELLOW}命名空间: ${NAMESPACE}${NC}"
echo -e "${YELLOW}镜像名称: ${IMAGE_NAME}${NC}"
echo -e "${YELLOW}标签: ${TAG}${NC}"
echo -e "${YELLOW}完整镜像地址: ${FULL_IMAGE_NAME}${NC}"
echo ""

# 1. 检查是否已登录
echo -e "${YELLOW}[1/4] 检查 Docker Registry 登录状态...${NC}"
# 检查是否已登录（通过检查 config.json 或尝试拉取镜像）
if ! cat ~/.docker/config.json 2>/dev/null | grep -q "${REGISTRY}"; then
    echo -e "${YELLOW}需要登录阿里云容器镜像服务${NC}"
    echo -e "${YELLOW}执行: docker login --username=${DOCKER_USERNAME} ${REGISTRY}${NC}"
    echo ""
    echo -e "${YELLOW}请先手动登录，然后重新运行此脚本${NC}"
    echo -e "${YELLOW}登录命令: docker login --username=${DOCKER_USERNAME} ${REGISTRY}${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 已登录${NC}"

# 2. 构建镜像（指定平台为 linux/amd64，确保在 x86_64 服务器上正常运行）
echo -e "${YELLOW}[2/4] 构建 Docker 镜像（平台: linux/amd64）...${NC}"
docker build --platform linux/amd64 -t "${IMAGE_NAME}:${TAG}" -f Dockerfile .

if [ $? -ne 0 ]; then
    echo -e "${RED}镜像构建失败${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 镜像构建成功${NC}"

# 3. 标记镜像
echo -e "${YELLOW}[3/4] 标记镜像...${NC}"
IMAGE_ID=$(docker images -q "${IMAGE_NAME}:${TAG}")
docker tag "${IMAGE_ID}" "${FULL_IMAGE_NAME}"

echo -e "${GREEN}✓ 镜像标记成功${NC}"

# 4. 推送镜像
echo -e "${YELLOW}[4/4] 推送镜像到 Registry...${NC}"
docker push "${FULL_IMAGE_NAME}"

if [ $? -ne 0 ]; then
    echo -e "${RED}镜像推送失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ 镜像构建和推送完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}镜像地址: ${FULL_IMAGE_NAME}${NC}"
echo ""
echo -e "${YELLOW}如果服务器在 VPC 网络中，可以使用以下地址：${NC}"
echo -e "${YELLOW}${REGISTRY_VPC}/${NAMESPACE}/${IMAGE_NAME}:${TAG}${NC}"
echo ""
echo -e "${YELLOW}在服务器上拉取镜像：${NC}"
echo -e "docker pull ${FULL_IMAGE_NAME}"
echo ""

