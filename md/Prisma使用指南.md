# Prisma 使用指南

## ⚠️ 环境要求

**Node.js 版本要求：** `>= 20.0.0`

使用 Prisma 6.19.0 需要 Node.js 20 或更高版本。请确保你的 Node.js 版本符合要求：

```bash
node --version  # 应该显示 v20.x.x 或更高
```

如果版本不符合，请使用 [nvm](https://github.com/nvm-sh/nvm) 或 [fnm](https://github.com/Schniz/fnm) 安装 Node.js 20 或更高版本：

```bash
# 使用 nvm
nvm install 20
nvm use 20

# 或使用 fnm
fnm install 20
fnm use 20
```

## 📋 概述

本项目使用 Prisma 6.19.0 作为 ORM，连接 MySQL 数据库。

## 🚀 快速开始

### 1. 确保数据库运行

**开发环境：**

```bash
# 启动开发数据库
pnpm docker:dev:up
```

**或使用本地 MySQL：**
确保 MySQL 服务正在运行。

### 2. 配置环境变量

确保 `.env.development` 或 `.env.production` 中配置了 `DATABASE_URL`：

```env
DATABASE_URL="mysql://root:123456@localhost:3306/qm_photo_db_dev"
```

### 3. 生成 Prisma Client

**注意：** 项目已经配置好 Prisma，**不需要**运行 `prisma init`。

```bash
# 生成 Prisma Client
pnpm prisma:generate

# 如果遇到错误，直接使用 npx
npx prisma generate
```

**生成位置：** Prisma Client 会生成到 `node_modules/@prisma/client` 目录（使用默认配置）。

### 4. 创建数据库迁移

```bash
pnpm prisma:migrate
```

这会：

- 创建迁移文件
- 应用到数据库
- 自动生成 Prisma Client

### 5. 启动应用

```bash
pnpm start:dev
```

---

## 💻 代码中使用 Prisma

### 导入 PrismaClient

在代码中，直接从 `@prisma/client` 导入 `PrismaClient`：

```typescript
import { PrismaClient } from '@prisma/client';
```

### 使用 PrismaService

项目已经创建了 `PrismaService`，它继承自 `PrismaClient` 并实现了生命周期管理。在模块中直接注入使用：

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class YourService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.test.findMany({
      where: {
        deletedAt: null, // 排除已删除的数据
      },
    });
  }
}
```

**注意：**

- `PrismaService` 是全局模块，无需在每个模块中导入 `PrismaModule`
- 直接从 `@prisma/client` 导入类型和客户端，不再使用自定义路径

---

## 📝 API 使用示例

### Test 模块 CRUD 操作

#### 创建数据

```bash
POST /test
Content-Type: application/json

{
  "name": "测试名称",
  "description": "测试描述",
  "status": "active"
}
```

#### 查询所有数据

```bash
GET /test
```

#### 查询单个数据

```bash
GET /test/1
```

#### 更新数据

```bash
PATCH /test/1
Content-Type: application/json

{
  "name": "更新后的名称",
  "status": "inactive"
}
```

#### 软删除

```bash
DELETE /test/1
```

#### 查询已删除的数据

```bash
GET /test/deleted/all
```

#### 恢复已删除的数据

```bash
POST /test/1/restore
```

**注意：** 路由是 `/test` 而不是 `/tests`（根据 `TestController` 中的 `@Controller('test')` 配置）。

#### 永久删除（硬删除）

```bash
DELETE /test/1/hard
```

---

## 🔧 Prisma 常用命令

### 生成 Prisma Client

```bash
pnpm prisma:generate
```

### 创建迁移

```bash
pnpm prisma:migrate
```

### 应用迁移（生产环境）

```bash
pnpm prisma:migrate:deploy
```

### 重置数据库（⚠️ 会删除所有数据）

```bash
pnpm prisma:migrate:reset
```

### 打开 Prisma Studio（可视化数据库）

```bash
pnpm prisma:studio
```

### 格式化 Schema

```bash
pnpm prisma:format
```

### 验证 Schema

```bash
pnpm prisma:validate
```

---

## 🗄️ 数据库模型

### Test 模型

```prisma
model Test {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  name      String
  description String?
  status    Boolean  @default(true)
  deletedAt DateTime?
}
```

**字段说明：**

- `id` - 主键，自增
- `name` - 名称（必填）
- `description` - 描述（可选）
- `status` - 状态，布尔值，默认 `true`
- `createdAt` - 创建时间，自动设置
- `updatedAt` - 更新时间，自动更新
- `deletedAt` - 删除时间，用于软删除（可选）

---

## 💡 软删除说明

### 实现原理

软删除通过 `deletedAt` 字段实现：

- **删除时**：设置 `deletedAt = 当前时间`
- **查询时**：过滤 `deletedAt IS NULL`
- **恢复时**：设置 `deletedAt = NULL`

### 优势

1. **数据可恢复** - 误删可以恢复
2. **保留历史** - 保留删除记录
3. **支持审计** - 可以追踪删除操作

### 使用示例

```typescript
// 查询时自动排除已删除的数据
const tests = await prisma.test.findMany({
  where: {
    deletedAt: null,
  },
});

// 软删除
await prisma.test.update({
  where: { id: 1 },
  data: { deletedAt: new Date() },
});

// 恢复
await prisma.test.update({
  where: { id: 1 },
  data: { deletedAt: null },
});
```

---

## 🐛 常见问题

### Q1: Prisma Client 生成失败？

**错误信息：**

```
Error [ERR_REQUIRE_ESM]: require() of ES Module
```

**原因：** Prisma 客户端生成配置问题或 Node.js 版本不兼容。

**解决方案：**

1. **检查 Node.js 版本**（必须 >= 20）：

   ```bash
   node --version
   ```

2. **清理并重新安装依赖：**

   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   npx prisma generate
   ```

3. **如果仍有问题，直接使用 npx：**
   ```bash
   npx prisma generate
   ```

### Q1.1: 运行 `prisma init` 报错？

**错误信息：**

```
A folder called prisma already exists in your project.
Please try again in a project that is not yet using Prisma.
```

**原因：** 项目已经配置好 Prisma，不需要运行 `prisma init`。

**解决方案：** 直接跳过 `prisma init`，使用以下命令：

```bash
# 生成 Prisma Client
npx prisma generate

# 创建迁移
npx prisma migrate dev --name init
```

### Q2: 数据库连接失败？

**检查项：**

1. 数据库服务是否运行
2. `DATABASE_URL` 是否正确
3. 网络连接是否正常
4. 数据库用户权限是否正确

### Q3: 迁移失败？

**解决方案：**

```bash
# 查看迁移状态
npx prisma migrate status

# 重置迁移（⚠️ 会删除数据）
pnpm prisma:migrate:reset

# 手动标记迁移为已应用
npx prisma migrate resolve --applied <migration_name>
```

### Q4: 类型错误？

**原因：** Prisma Client 未生成

**解决方案：**

```bash
pnpm prisma:generate
```

### Q5: 如何查看数据库内容？

**使用 Prisma Studio：**

```bash
pnpm prisma:studio
```

浏览器会自动打开 `http://localhost:5555`

---

## 📚 相关文档

- [Prisma 集成笔记](../notes/Prisma集成笔记.md) - 详细的集成步骤
- [环境配置与启动指南](./环境配置与启动指南.md) - 环境变量配置
- [Docker使用指南](./Docker使用指南.md) - Docker 环境配置

---

## 🔗 参考资源

- [Prisma 官方文档](https://www.prisma.io/docs)
- [Prisma NestJS 集成指南](https://www.prisma.io/docs/guides/integrations/integration-guides/nestjs)
- [Prisma 迁移指南](https://www.prisma.io/docs/guides/migrate)
