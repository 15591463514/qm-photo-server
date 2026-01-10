# Prisma 迁移问题排查指南

## 问题：迁移文件校验和不匹配

### 错误信息

```
The migration `xxxxx` was modified after it was applied.
We need to reset the MySQL database...
```

### 原因

迁移文件在应用后被修改了，导致 Prisma 检测到校验和不匹配。

### 解决方案

#### 方案一：使用修复脚本（推荐）

```bash
pnpm prisma:migrate:fix
```

或手动执行：

```bash
npx prisma db push --skip-generate
npx prisma generate
```

#### 方案二：使用 migrate resolve（如果知道具体迁移）

```bash
# 标记迁移为已应用（即使文件被修改）
npx prisma migrate resolve --applied <migration_name>
```

#### 方案三：重置数据库（⚠️ 会丢失所有数据）

```bash
pnpm prisma:migrate:reset
```

### 预防措施

1. **不要修改已应用的迁移文件**
   - 如果需要修改，创建新的迁移文件

2. **使用版本控制**
   - 确保迁移文件被正确提交到 Git
   - 不要手动修改迁移历史

3. **开发环境使用 db push**
   - 对于快速迭代，可以使用 `prisma db push` 而不是 `migrate dev`
   - 但要注意：`db push` 不会创建迁移文件

### 当前已知问题

以下迁移文件在应用后被修改，已通过 `db push` 同步修复：

- `20251210020000_add_dict_sort_unique_constraint`
- `20251210160000_add_type_status_field`
- `20250110120000_add_tag_table`

如果遇到校验和不匹配问题，运行 `pnpm prisma:migrate:fix` 即可。
