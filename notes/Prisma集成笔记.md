# Prisma 集成笔记

## ⚠️ 环境要求

**Node.js 版本要求：** `>= 20.0.0`

Prisma 6.19.0 需要 Node.js 20 或更高版本。请确保环境符合要求。

## 📝 集成步骤记录

### 1. 安装依赖

```bash
pnpm add prisma @prisma/client
```

**版本：** Prisma 6.19.0

### 2. 创建 Prisma Schema 和配置

**文件位置：**

- `prisma/schema.prisma` - Schema 定义
- `prisma.config.ts` - Prisma 配置文件

**关键配置：**

- `generator client` - 生成 Prisma Client，使用默认输出位置 `node_modules/@prisma/client`
- `datasource db` - 使用 MySQL，URL 从配置文件读取
- `model Test` - 测试模型，包含软删除字段 `deletedAt`

**prisma.config.ts 配置：**

```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

**注意：** 项目使用 `prisma.config.ts` 配置文件管理数据库连接。

**示例：**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

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

**注意：**

- `generator client` 使用 `prisma-client-js`，使用默认输出位置
- Prisma Client 会生成到 `node_modules/@prisma/client`
- 在代码中直接从 `@prisma/client` 导入 `PrismaClient`

### 3. 创建 Prisma 模块

#### `src/prisma/prisma.service.ts`

**功能：**

- 继承 `PrismaClient`
- 实现 `OnModuleInit` 和 `OnModuleDestroy` 生命周期钩子
- 开发环境查询日志
- 错误日志记录
- 健康检查方法

**关键代码：**

```typescript
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly configService: ConfigService) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**注意：** 直接从 `@prisma/client` 导入 `PrismaClient`，不再使用自定义路径。

#### `src/prisma/prisma.module.ts`

**功能：**

- 使用 `@Global()` 装饰器，全局可用
- 导出 `PrismaService`

### 4. 在 SharedModule 中集成

```typescript
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({...}),
    PrismaModule, // 集成 Prisma 模块
  ],
  exports: [ConfigModule, PrismaModule],
})
export class SharedModule {}
```

### 5. 创建 Test 模块（CRUD 示例）

#### 目录结构

```
src/modules/test/
├── dto/
│   ├── create-test.dto.ts
│   └── update-test.dto.ts
├── test.controller.ts
├── test.service.ts
└── test.module.ts
```

#### TestService 功能

**CRUD 操作：**

- `create()` - 创建数据
- `findAll()` - 查询所有（排除已删除）
- `findOne()` - 查询单个（排除已删除）
- `update()` - 更新数据
- `remove()` - 软删除
- `restore()` - 恢复已删除的数据
- `findDeleted()` - 查询已删除的数据
- `hardDelete()` - 永久删除（硬删除）

**软删除实现：**

```typescript
// 查询时排除已删除的数据
where: {
  deletedAt: null;
}

// 软删除：设置删除时间
data: {
  deletedAt: new Date();
}

// 恢复：清除删除时间
data: {
  deletedAt: null;
}
```

#### TestController 路由

**路由前缀：** `/test`（注意是单数，不是 `/tests`）

- `POST /test` - 创建
- `GET /test` - 查询所有（排除已删除）
- `GET /test/:id` - 查询单个（排除已删除）
- `PATCH /test/:id` - 更新
- `DELETE /test/:id` - 软删除
- `GET /test/deleted/all` - 查询已删除的数据
- `POST /test/:id/restore` - 恢复已删除的数据
- `DELETE /test/:id/hard` - 永久删除（硬删除）

**参数验证：** 使用 `ParseIntPipe` 自动将路径参数转换为数字。

### 6. 更新 package.json 脚本和配置

**脚本：**

```json
{
  "scripts": {
    "prisma:generate": "NODE_ENV=${NODE_ENV:-development} prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:migrate:deploy": "prisma migrate deploy",
    "prisma:migrate:reset": "prisma migrate reset",
    "prisma:studio": "prisma studio",
    "prisma:format": "prisma format",
    "prisma:validate": "prisma validate"
  }
}
```

**注意：** `prisma:generate` 脚本会根据 `NODE_ENV` 加载对应的环境变量。

---

## 🔄 使用流程

### 1. 生成 Prisma Client

```bash
pnpm prisma:generate
```

### 2. 创建数据库迁移

```bash
pnpm prisma:migrate
```

这会：

- 创建迁移文件
- 应用到数据库
- 生成 Prisma Client

### 3. 启动应用

```bash
pnpm start:dev
```

### 4. 测试 API

```bash
# 创建数据
curl -X POST http://localhost:3000/test \
  -H "Content-Type: application/json" \
  -d '{"name":"测试","description":"这是一个测试"}'

# 查询所有
curl http://localhost:3000/test

# 查询单个
curl http://localhost:3000/test/1

# 更新
curl -X PATCH http://localhost:3000/test/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"更新后的名称"}'

# 软删除
curl -X DELETE http://localhost:3000/test/1

# 查询已删除
curl http://localhost:3000/test/deleted/all

# 恢复
curl -X POST http://localhost:3000/test/1/restore
```

---

## 🔄 如何给其他项目搭建环境

### 快速复制步骤

1. **复制 Prisma 模块**

   ```bash
   cp -r src/prisma <新项目>/src/
   cp prisma/schema.prisma <新项目>/prisma/
   ```

2. **安装依赖**

   ```bash
   cd <新项目>
   pnpm add prisma @prisma/client
   ```

3. **在 SharedModule 中集成**
   - 导入 `PrismaModule`
   - 添加到 `imports` 和 `exports`

4. **更新 schema.prisma**
   - 根据新项目的需求修改模型
   - 更新数据库连接配置

5. **生成和迁移**
   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

---

## 💡 关键要点

### 1. 软删除实现

**原理：**

- 使用 `deletedAt` 字段标记删除
- 查询时过滤 `deletedAt IS NULL`
- 可以恢复已删除的数据

**优势：**

- 数据可恢复
- 保留历史记录
- 支持审计

### 2. 全局模块

**PrismaModule 使用 `@Global()`：**

- 其他模块无需导入即可使用 `PrismaService`
- 简化依赖管理
- 统一数据库连接

### 3. 生命周期管理

**自动连接和断开：**

- `onModuleInit` - 应用启动时连接
- `onModuleDestroy` - 应用关闭时断开
- 确保资源正确释放

### 4. 开发环境日志

**查询日志：**

- 开发环境自动记录 SQL 查询
- 包含查询语句、参数、执行时间
- 便于调试和性能优化

---

## 📚 参考文档

- [Prisma 官方文档](https://www.prisma.io/docs)
- [Prisma NestJS 集成](https://www.prisma.io/docs/guides/integrations/integration-guides/nestjs)
- 项目文档：`md/集成指南.md`

---

## 🔧 常见问题

### Q1: Node.js 版本不符合要求？

**错误信息：** Prisma 6.19.0 需要 Node.js >= 20

**解决方案：**

```bash
# 检查当前版本
node --version

# 使用 nvm 安装 Node.js 20 或更高版本
nvm install 20
nvm use 20

# 或使用 fnm
fnm install 20
fnm use 20
```

### Q2: Prisma Client 生成失败？

**错误信息：**

```
Error [ERR_REQUIRE_ESM]: require() of ES Module
```

**解决方案：**

1. 确保 Node.js 版本 >= 20
2. 清理并重新安装依赖：
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   npx prisma generate
   ```
3. 确保 `tsconfig.json` 中 `module` 设置为 `CommonJS`（不是 `ESNext`）

### Q3: 运行 `prisma init` 报错？

**错误信息：**

```
A folder called prisma already exists in your project.
```

**原因：** 项目已经配置好 Prisma，不需要运行 `prisma init`。

**解决方案：** 直接使用：

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### Q4: 数据库连接失败？

**检查项：**

1. `.env.development` 或 `.env.production` 文件中的 `DATABASE_URL` 是否正确
2. 数据库服务是否运行（`pnpm docker:dev:up`）
3. 网络连接是否正常
4. `prisma.config.ts` 是否正确配置

### Q5: 迁移失败？

**解决方案：**

```bash
# 查看迁移状态
npx prisma migrate status

# 重置数据库（⚠️ 会删除所有数据）
pnpm prisma:migrate:reset

# 或手动修复迁移
npx prisma migrate resolve --applied <migration_name>
```

### Q6: 如何查看数据库？

**使用 Prisma Studio：**

```bash
pnpm prisma:studio
```

浏览器会自动打开 `http://localhost:5555`

---

## 📝 配置检查清单

- [ ] Node.js 版本 >= 20.0.0
- [ ] `prisma/schema.prisma` 存在且配置正确
- [ ] `prisma.config.ts` 存在且配置正确
- [ ] `src/prisma/prisma.service.ts` 存在
- [ ] `src/prisma/prisma.module.ts` 存在
- [ ] `SharedModule` 中导入了 `PrismaModule`
- [ ] `package.json` 包含 Prisma 脚本
- [ ] `.env.development` 或 `.env.production` 文件中配置了 `DATABASE_URL`
- [ ] `tsconfig.json` 中 `module` 设置为 `CommonJS`
- [ ] 已运行 `pnpm prisma:generate`（生成到 `node_modules/@prisma/client`）
- [ ] 已运行 `pnpm prisma:migrate`
- [ ] 代码中从 `@prisma/client` 导入 `PrismaClient`（不是自定义路径）
