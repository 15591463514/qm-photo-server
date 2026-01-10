#!/bin/bash

# 修复 Prisma 迁移校验和不匹配问题
# 当迁移文件在应用后被修改时，使用此脚本修复

echo "🔧 修复 Prisma 迁移校验和不匹配问题..."

cd "$(dirname "$0")/.." || exit 1

# 使用 db push 同步数据库（不生成迁移）
echo "📦 同步数据库 schema..."
npx prisma db push --skip-generate --accept-data-loss

# 重新生成 Prisma Client
echo "🔨 生成 Prisma Client..."
npx prisma generate

echo "✅ 修复完成！"
echo ""
echo "💡 提示：如果以后遇到迁移校验和不匹配问题，可以："
echo "   1. 运行此脚本：./scripts/fix-migration-checksum.sh"
echo "   2. 或手动执行：npx prisma db push --skip-generate"

