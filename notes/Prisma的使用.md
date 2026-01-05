# Prisma 使用笔记

## Prisma 迁移

### 方案一：直接创建并应用迁移（推荐）

**适用场景：** 开发环境，修改 Schema 后直接同步到数据库

**步骤：**

1. **修改 Schema 文件**

   ```prisma
   // prisma/schema.prisma
   model NotificationRule {
     noticeAddress String? @map("notice_address") @db.VarChar(500)  // 改为可选
   }
   ```

2. **创建并应用迁移**

   ```bash
   npx prisma migrate dev --name make_notice_address_nullable
   ```

   这个命令会：
   - 自动创建迁移文件
   - 立即应用到数据库
   - 自动生成 Prisma Client

**完成！** 迁移已创建并应用到数据库。

---

### 方案二：先创建迁移文件，后应用（分步操作）

**适用场景：** 需要先检查迁移 SQL，确认无误后再应用

**步骤：**

1. **修改 Schema 文件**

   ```prisma
   // prisma/schema.prisma
   model NotificationRule {
     noticeAddress String? @map("notice_address") @db.VarChar(500)
   }
   ```

2. **仅创建迁移文件（不执行）**

   ```bash
   npx prisma migrate dev --name make_notice_address_nullable --create-only
   ```

3. **检查生成的 SQL 文件**

   ```bash
   cat prisma/migrations/YYYYMMDDHHMMSS_make_notice_address_nullable/migration.sql
   ```

4. **应用迁移到数据库**
   ```bash
   npx prisma migrate dev
   ```

**完成！** 迁移已应用到数据库。

---

### 生产环境部署

**步骤：**

```bash
npx prisma migrate deploy
```

**注意：** `migrate deploy` 只应用迁移，不会生成 Prisma Client。如果需要生成 Client，单独运行：

```bash
npx prisma generate
```

---

### 常用命令

| 命令                                              | 说明                       |
| ------------------------------------------------- | -------------------------- |
| `npx prisma migrate dev --name xxx`               | 创建并应用迁移（开发环境） |
| `npx prisma migrate dev --name xxx --create-only` | 仅创建迁移文件             |
| `npx prisma migrate deploy`                       | 应用迁移（生产环境）       |
| `npx prisma migrate status`                       | 查看迁移状态               |
| `npx prisma generate`                             | 生成 Prisma Client         |

---

### 项目脚本

```bash
# 创建并应用迁移
pnpm prisma:migrate --name migration_name

# 生产环境部署
pnpm prisma:migrate:deploy

# 生成 Prisma Client
pnpm prisma:generate
```

---

### 参考文档

- [Prisma Migrate 入门](https://prisma.org.cn/docs/orm/prisma-migrate/getting-started)
