# Docker 使用指南

## 📋 概述

本项目使用 Docker 和 Docker Compose 来管理应用和数据库服务，确保开发和生产环境的一致性。

## 🚀 快速开始

### 开发环境（仅数据库）

```bash
# 启动开发数据库
pnpm docker:dev:up

# 停止开发数据库
pnpm docker:dev:down
```

### 生产环境（应用 + 数据库）

```bash
# 构建并启动所有服务
pnpm docker:build
pnpm docker:up

# 查看日志
pnpm docker:logs

# 停止所有服务
pnpm docker:down
```

---

## 📁 文件说明

### Dockerfile
- 用于构建应用镜像
- 使用多阶段构建，优化镜像大小
- 生产环境使用 `node:20-alpine` 基础镜像

### docker-compose.yml
- 生产环境配置
- 包含应用服务和 MySQL 数据库
- 自动健康检查和依赖管理

### docker-compose.dev.yml
- 开发环境配置
- 仅包含数据库服务
- 应用在本地运行，连接 Docker 中的数据库

---

## 🔧 详细使用

### 开发环境

#### 方式一：仅使用 Docker 数据库（推荐）

1. **启动数据库**
   ```bash
   pnpm docker:dev:up
   ```

2. **在本地运行应用**
   ```bash
   pnpm start:dev
   ```

3. **停止数据库**
   ```bash
   pnpm docker:dev:down
   ```

**优势：**
- 应用代码修改立即生效（热重载）
- 数据库环境隔离
- 不影响本地 MySQL 安装

#### 方式二：完全 Docker 化

1. **构建并启动**
   ```bash
   docker-compose build
   docker-compose up -d
   ```

2. **查看日志**
   ```bash
   docker-compose logs -f app
   ```

3. **停止服务**
   ```bash
   docker-compose down
   ```

### 生产环境

1. **构建镜像**
   ```bash
   docker-compose build
   ```

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

3. **查看服务状态**
   ```bash
   docker-compose ps
   ```

4. **查看日志**
   ```bash
   # 所有服务
   docker-compose logs -f
   
   # 特定服务
   docker-compose logs -f app
   docker-compose logs -f mysql
   ```

5. **停止服务**
   ```bash
   docker-compose down
   ```

6. **停止并删除数据卷（⚠️ 会删除数据）**
   ```bash
   docker-compose down -v
   ```

---

## 🔍 常用命令

### Docker Compose 命令

```bash
# 构建镜像
docker-compose build

# 启动服务（后台运行）
docker-compose up -d

# 启动服务（前台运行，查看日志）
docker-compose up

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service_name]

# 进入容器
docker-compose exec app sh
docker-compose exec postgres psql -U postgres -d qm_photo_db

# 执行命令
docker-compose exec app pnpm prisma migrate deploy
```

### Docker 命令

```bash
# 查看运行中的容器
docker ps

# 查看所有容器
docker ps -a

# 查看镜像
docker images

# 删除容器
docker rm <container_id>

# 删除镜像
docker rmi <image_id>

# 清理未使用的资源
docker system prune -a
```

---

## 🗄️ 数据库管理

### 连接数据库

```bash
# 方式一：使用 docker-compose exec
docker-compose exec mysql mysql -u root -p${DB_PASSWORD} qm_photo_db

# 方式二：使用本地客户端连接
# 主机：localhost
# 端口：3306（或 .env 中配置的端口）
# 用户名：root（或 .env 中配置的用户名）
# 密码：123456（或 .env 中配置的密码）
# 数据库：qm_photo_db（或 .env 中配置的数据库名）
```

### 备份数据库

```bash
# 备份
docker-compose exec mysql mysqldump -u root -p${DB_PASSWORD} qm_photo_db > backup.sql

# 恢复
cat backup.sql | docker-compose exec -T mysql mysql -u root -p${DB_PASSWORD} qm_photo_db
```

### 重置数据库

```bash
# 停止并删除数据卷
docker-compose down -v

# 重新启动
docker-compose up -d
```

---

## ⚙️ 环境变量配置

Docker Compose 会读取 `.env` 文件中的环境变量。**所有环境变量都是必需的，没有默认值。**

主要配置项：

```env
# 数据库配置（必需）
DB_USERNAME=root
DB_PASSWORD=123456
DB_DATABASE=qm_photo_db
DB_PORT=3306

# 应用配置（必需）
PORT=3000
NODE_ENV=production
```

**重要说明：**
- ⚠️ **所有环境变量必须在 `.env` 文件中配置**，Docker Compose 不会使用默认值
- Docker 容器内的应用使用 `DB_HOST=mysql`（服务名）
- 本地连接数据库使用 `DB_HOST=localhost`
- 如果环境变量未设置，Docker Compose 会报错

---

## 🐛 常见问题

### Q1: 端口被占用怎么办？

**错误信息：**
```
Error: bind: address already in use
```

**解决方案：**
1. 修改 `.env` 文件中的端口配置
2. 或停止占用端口的服务

### Q2: 数据库连接失败？

**检查项：**
1. 确认数据库容器正在运行：`docker-compose ps`
2. 检查数据库健康状态：`docker-compose logs mysql`
3. 确认环境变量配置正确
4. 确认应用容器等待数据库就绪（depends_on）

### Q3: 如何查看容器日志？

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f app
docker-compose logs -f mysql

# 最近 100 行
docker-compose logs --tail=100 app
```

### Q4: 如何进入容器调试？

```bash
# 进入应用容器
docker-compose exec app sh

# 进入数据库容器
docker-compose exec mysql sh

# 在容器内执行命令
docker-compose exec app pnpm prisma migrate deploy
```

### Q5: 如何重新构建镜像？

```bash
# 不使用缓存重新构建
docker-compose build --no-cache

# 重新构建并启动
docker-compose up -d --build
```

### Q6: 数据持久化在哪里？

数据存储在 Docker 卷中：
- 生产环境：`mysql-data`
- 开发环境：`mysql-data-dev`

查看卷：
```bash
docker volume ls
docker volume inspect qm-photo-server_mysql-data
```

---

## 📊 服务架构

```
┌─────────────────┐
│   Application   │
│   (Container)   │
│   Port: 3000    │
└────────┬────────┘
         │
         │ DATABASE_URL
         │
┌────────▼────────┐
│     MySQL       │
│   (Container)   │
│   Port: 3306    │
└─────────────────┘
```

---

## 💡 最佳实践

1. **开发环境**：使用 `docker-compose.dev.yml` 仅运行数据库，应用在本地运行
2. **生产环境**：使用 `docker-compose.yml` 运行完整的应用和数据库
3. **数据备份**：定期备份数据库数据卷
4. **环境变量**：敏感信息使用环境变量，不要硬编码
5. **健康检查**：利用 Docker 的健康检查确保服务就绪
6. **日志管理**：使用 `docker-compose logs` 查看日志，生产环境考虑日志收集

---

## 🔗 相关文档

- [环境配置与启动指南](./环境配置与启动指南.md)
- [Docker 集成笔记](../notes/Docker集成笔记.md)

