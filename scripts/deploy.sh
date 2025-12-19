#!/bin/bash

# ============================================
# 后端部署脚本
# ============================================
# 功能：
# 1. 构建 Docker 镜像
# 2. 运行数据库迁移
# 3. 启动/重启服务
# 4. 健康检查
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

echo -e "${GREEN}开始部署后端服务...${NC}"

# 检查 Docker 镜像源配置
echo -e "${YELLOW}检查 Docker 镜像源配置...${NC}"
if ! docker info | grep -q "dmhnthr3.mirror.aliyuncs.com"; then
    echo -e "${YELLOW}提示: 建议配置 Docker 镜像源以加速构建，参考: docs/docker-mirror-config.md${NC}"
fi

# 1. 构建 Docker 镜像
echo -e "${YELLOW}[1/4] 构建 Docker 镜像...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache app

# 2. 启动数据库和 Redis（如果未运行）
echo -e "${YELLOW}[2/4] 启动数据库和 Redis...${NC}"
docker-compose -f docker-compose.prod.yml up -d mysql redis

# 等待数据库就绪
echo "等待数据库就绪..."
sleep 10

# 3. 运行数据库迁移
echo -e "${YELLOW}[3/4] 运行数据库迁移...${NC}"
docker-compose -f docker-compose.prod.yml run --rm app sh -c "pnpm prisma generate && pnpm prisma migrate deploy"

# 4. 启动应用服务
echo -e "${YELLOW}[4/4] 启动应用服务...${NC}"
docker-compose -f docker-compose.prod.yml up -d app

# 等待服务启动
echo "等待服务启动..."
sleep 5

# 5. 健康检查
echo -e "${YELLOW}执行健康检查...${NC}"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # 检查容器是否运行
    if docker ps | grep -q qm-photo-app-prod; then
        # 检查 PM2 进程是否运行
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

# 6. 显示服务状态
echo -e "${GREEN}部署完成！${NC}"
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

