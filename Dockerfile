# 多阶段构建 - 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm run build:prod

# 生产阶段
FROM node:20-alpine AS production

WORKDIR /app

# 安装 pnpm 和 PM2
RUN npm install -g pnpm pm2

# 只复制必要的文件
COPY package.json pnpm-lock.yaml ./

# 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# 复制 PM2 配置文件
COPY ecosystem.config.js ./

# 创建日志目录
RUN mkdir -p logs

# 暴露端口
EXPOSE 3008

# 设置环境变量
ENV NODE_ENV=production

# 使用 PM2 启动应用
CMD ["pm2-runtime", "start", "ecosystem.config.js"]

