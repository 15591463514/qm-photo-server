# 多阶段构建 - 构建阶段
# 指定平台为 linux/amd64，确保在 x86_64 服务器上正常运行
FROM --platform=linux/amd64 node:20-alpine AS builder

WORKDIR /app

# 配置 npm 镜像源（加速安装）
RUN npm config set registry https://registry.npmmirror.com

# 配置 Prisma 二进制文件镜像源（加速 Prisma 二进制下载）
ENV PRISMA_BINARIES_MIRROR=https://npmmirror.com/mirrors/prisma

# 安装 pnpm
RUN npm install -g pnpm

# 配置 pnpm 镜像源（加速依赖安装）
RUN pnpm config set registry https://registry.npmmirror.com

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制 Prisma schema 文件（需要先复制以生成客户端）
COPY prisma ./prisma

# 生成 Prisma 客户端（必须在构建之前）
RUN pnpm prisma generate

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build:prod

# 生产阶段
# 指定平台为 linux/amd64，确保在 x86_64 服务器上正常运行
FROM --platform=linux/amd64 node:20-alpine AS production

WORKDIR /app

# 配置 npm 镜像源（加速安装）
RUN npm config set registry https://registry.npmmirror.com

# 配置 Prisma 二进制文件镜像源
ENV PRISMA_BINARIES_MIRROR=https://npmmirror.com/mirrors/prisma

# 安装 pnpm 和 PM2
RUN npm install -g pnpm pm2

# 配置 pnpm 镜像源
RUN pnpm config set registry https://registry.npmmirror.com

# 只复制必要的文件
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 复制 Prisma schema 文件（需要生成客户端）
COPY prisma ./prisma

# 临时安装 prisma CLI 来生成客户端（生成后可以保留，因为体积不大）
RUN pnpm add -g prisma || pnpm add prisma --save-dev=false

# 在生产阶段重新生成 Prisma 客户端
RUN pnpm prisma generate

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 复制 PM2 配置文件
COPY ecosystem.config.js ./

# 复制 scripts 目录（用于 webhook 服务器和部署脚本）
COPY scripts ./scripts

# 设置 scripts 目录下的文件执行权限
RUN chmod +x scripts/*.sh scripts/*.js 2>/dev/null || true

# 创建日志目录
RUN mkdir -p logs

# 暴露端口
EXPOSE 3008
EXPOSE 3009

# 设置环境变量
ENV NODE_ENV=production

# 使用 PM2 启动应用
CMD ["pm2-runtime", "start", "ecosystem.config.js"]