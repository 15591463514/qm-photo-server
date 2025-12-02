# Docker 集成笔记

## 📝 集成步骤记录

### 1. 创建 Dockerfile

**文件位置：** `Dockerfile`

**关键点：**
- 使用多阶段构建优化镜像大小
- 构建阶段：安装所有依赖并构建应用
- 生产阶段：只复制必要的文件和依赖
- 使用 `node:20-alpine` 减小镜像体积

**示例：**
```dockerfile
# 构建阶段
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build:prod

# 生产阶段
FROM node:20-alpine AS production
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/main"]
```

### 2. 创建 .dockerignore

**文件位置：** `.dockerignore`

**作用：**
- 排除不需要的文件，减小构建上下文
- 加快构建速度
- 避免敏感信息泄露

**需要排除的内容：**
- `node_modules`
- `dist`、`build`
- `.env` 文件（通过环境变量传递）
- `.git`
- 文档和测试文件

### 3. 创建 docker-compose.yml

**文件位置：** `docker-compose.yml`

**包含服务：**
1. **mysql** - MySQL 数据库
2. **app** - 应用服务

**关键配置：**
- 使用环境变量配置
- 健康检查确保数据库就绪
- 数据卷持久化
- 网络隔离

**示例：**
```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: ${DB_DATABASE}
      MYSQL_USER: ${DB_USERNAME}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${DB_PASSWORD}"]
      interval: 10s

  app:
    build: .
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      - DB_HOST=mysql
      - DB_USERNAME=${DB_USERNAME}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_DATABASE=${DB_DATABASE}
      - DATABASE_URL=mysql://${DB_USERNAME}:${DB_PASSWORD}@mysql:3306/${DB_DATABASE}
```

**注意：**
- ⚠️ 所有环境变量都是必需的，没有默认值
- 必须在 `.env` 文件中配置所有必需的环境变量
- 如果环境变量未设置，Docker Compose 会报错

### 4. 创建 docker-compose.dev.yml

**文件位置：** `docker-compose.dev.yml`

**用途：**
- 开发环境仅运行数据库
- 应用在本地运行，连接 Docker 中的数据库

**优势：**
- 代码修改立即生效（热重载）
- 数据库环境隔离
- 不影响本地 MySQL

### 5. 更新 package.json 脚本

```json
{
  "scripts": {
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "docker:dev:up": "docker-compose -f docker-compose.dev.yml up -d",
    "docker:dev:down": "docker-compose -f docker-compose.dev.yml down"
  }
}
```

---

## 🔄 如何给其他项目搭建环境

### 快速复制步骤

1. **复制 Docker 文件**
   ```bash
   cp Dockerfile <新项目>/
   cp .dockerignore <新项目>/
   cp docker-compose.yml <新项目>/
   cp docker-compose.dev.yml <新项目>/
   ```

2. **修改配置**
   - 更新 `docker-compose.yml` 中的服务名和端口
   - 更新环境变量配置
   - 根据项目需求调整 Dockerfile

3. **更新 package.json**
   - 复制 Docker 相关脚本

4. **测试运行**
   ```bash
   # 开发环境
   pnpm docker:dev:up
   
   # 生产环境
   pnpm docker:build
   pnpm docker:up
   ```

### 配置检查清单

- [ ] `Dockerfile` 存在且配置正确
- [ ] `.dockerignore` 存在且包含必要排除项
- [ ] `docker-compose.yml` 配置正确
- [ ] `docker-compose.dev.yml` 配置正确（如需要）
- [ ] `package.json` 包含 Docker 相关脚本
- [ ] 环境变量配置正确
- [ ] 数据库健康检查配置
- [ ] 数据卷配置正确

---

## 💡 关键要点

### 1. 多阶段构建

**优势：**
- 减小最终镜像大小
- 只包含运行时需要的文件
- 构建工具不进入生产镜像

### 2. 环境变量管理

**原则：**
- 敏感信息通过环境变量传递
- 使用 `.env` 文件管理配置
- Docker Compose 自动读取 `.env` 文件

### 3. 健康检查

**作用：**
- 确保数据库就绪后再启动应用
- 自动重启失败的服务
- 监控服务状态

### 4. 数据持久化

**方式：**
- 使用 Docker 卷存储数据
- 数据在容器删除后仍然保留
- 便于备份和迁移

### 5. 网络隔离

**优势：**
- 服务间通过服务名通信
- 外部无法直接访问内部服务
- 提高安全性

---

## 🎯 开发 vs 生产环境

### 开发环境（推荐）

**配置：** `docker-compose.dev.yml`

**特点：**
- 仅运行数据库
- 应用在本地运行
- 支持热重载
- 快速调试

**使用：**
```bash
pnpm docker:dev:up    # 启动数据库
pnpm start:dev       # 本地运行应用
```

### 生产环境

**配置：** `docker-compose.yml`

**特点：**
- 完整的应用和数据库
- 优化后的生产构建
- 环境隔离
- 易于部署

**使用：**
```bash
pnpm docker:build    # 构建镜像
pnpm docker:up      # 启动服务
```

---

## 📚 参考文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- 项目文档：`md/Docker使用指南.md`

---

## 🔧 常见问题解决

### 问题 1：构建失败

**可能原因：**
- 依赖安装失败
- 构建命令错误
- 内存不足

**解决方案：**
```bash
# 清理缓存重新构建
docker-compose build --no-cache

# 增加 Docker 内存限制
# Docker Desktop -> Settings -> Resources -> Memory
```

### 问题 2：数据库连接失败

**检查项：**
1. 数据库容器是否运行：`docker-compose ps`
2. 健康检查是否通过：`docker-compose logs mysql`
3. 环境变量是否正确
4. 网络配置是否正确

### 问题 3：端口冲突

**解决方案：**
1. 修改 `.env` 文件中的端口配置
2. 或停止占用端口的服务

### 问题 4：数据丢失

**预防措施：**
1. 使用 Docker 卷持久化数据
2. 定期备份数据卷
3. 不要使用 `docker-compose down -v`（除非确定要删除数据）

---

## 📝 后续优化建议

1. **添加健康检查端点**：在应用中添加健康检查 API
2. **日志收集**：集成日志收集系统（如 ELK）
3. **监控**：添加应用监控（如 Prometheus）
4. **CI/CD**：集成到 CI/CD 流程
5. **多环境支持**：为不同环境创建不同的 compose 文件

