# NestJS + Prisma 数据库设计文档

本文档基于前端项目需求，提供完整的 Prisma Schema 数据库设计，适用于 NestJS + Prisma 技术栈。

## 目录

- [Prisma Schema 完整定义](#prisma-schema-完整定义)
- [模型说明](#模型说明)
- [关系说明](#关系说明)
- [使用说明](#使用说明)
- [数据迁移](#数据迁移)

---

## Prisma Schema 完整定义

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ==================== 枚举类型 ====================
// 注意：由于前端使用字符串值（'1', '2'等），这里使用 String 类型
// 在应用层可以使用 TypeScript 枚举或常量来管理这些值

/// 用户状态（'1'-在线，'2'-离线，'3'-异常，'4'-注销）
/// 在代码中使用：UserStatus.ONLINE = '1'
/// 
/// enum UserStatus {
///   ONLINE = '1',
///   OFFLINE = '2',
///   ABNORMAL = '3',
///   DISABLED = '4'
/// }

/// 用户性别（'male', 'female', 'unknown'）
/// 
/// enum UserGender {
///   MALE = 'male',
///   FEMALE = 'female',
///   UNKNOWN = 'unknown'
/// }

/// 菜单状态（'1'-启用，'2'-禁用）
/// 
/// enum MenuStatus {
///   ENABLED = '1',
///   DISABLED = '2'
/// }

// ==================== 用户表 ====================

model User {
  id         BigInt      @id @default(autoincrement()) @db.BigInt
  userName   String      @unique @db.VarChar(50)
  password   String      @db.VarChar(255)
  nickName   String?     @map("nick_name") @db.VarChar(50)
  email      String?     @db.VarChar(100)
  avatar     String?     @db.VarChar(500)
  userPhone  String?     @map("user_phone") @db.VarChar(20)
  userGender String?     @map("user_gender") @default("unknown") @db.VarChar(10) // 'male', 'female', 'unknown'
  status     String      @default("1") @db.VarChar(10) // '1'-在线, '2'-离线, '3'-异常, '4'-注销
  createBy   String?     @map("create_by") @db.VarChar(50)
  createTime DateTime    @default(now()) @map("create_time") @db.DateTime(0)
  updateBy   String?     @map("update_by") @db.VarChar(50)
  updateTime DateTime?   @updatedAt @map("update_time") @db.DateTime(0)
  remark     String?     @db.VarChar(500)

  // 关系
  userRoles UserRole[]

  @@index([status], name: "idx_status")
  @@index([createTime], name: "idx_create_time")
  @@map("users")
}

// ==================== 角色表 ====================

model Role {
  roleId     BigInt   @id @default(autoincrement()) @map("role_id") @db.BigInt
  roleName   String   @map("role_name") @db.VarChar(50)
  roleCode   String   @unique @map("role_code") @db.VarChar(50)
  description String? @db.VarChar(500)
  enabled    Boolean  @default(true)
  createTime DateTime @default(now()) @map("create_time") @db.DateTime(0)
  updateTime DateTime? @updatedAt @map("update_time") @db.DateTime(0)

  // 关系
  userRoles        UserRole[]
  roleMenus        RoleMenu[]
  roleMenuButtons  RoleMenuButton[]

  @@map("roles")
}

// ==================== 菜单表 ====================

model Menu {
  id           BigInt      @id @default(autoincrement()) @db.BigInt
  parentId     BigInt      @default(0) @map("parent_id") @db.BigInt
  name         String      @db.VarChar(100)
  path         String      @db.VarChar(200)
  component    String?     @db.VarChar(500)
  title        String      @db.VarChar(100)
  icon         String?     @db.VarChar(100)
  isHide       Boolean     @default(false) @map("is_hide")
  isHideTab    Boolean     @default(false) @map("is_hide_tab")
  link         String?     @db.VarChar(500)
  isIframe     Boolean     @default(false) @map("is_iframe")
  keepAlive    Boolean     @default(false) @map("keep_alive")
  isFirstLevel Boolean     @default(false) @map("is_first_level")
  fixedTab     Boolean     @default(false) @map("fixed_tab")
  activePath   String?     @map("active_path") @db.VarChar(200)
  isFullPage   Boolean     @default(false) @map("is_full_page")
  sortOrder    Int         @default(0) @map("sort_order")
  status       String      @default("1") @db.VarChar(10) // '1'-启用, '2'-禁用
  createTime   DateTime    @default(now()) @map("create_time") @db.DateTime(0)
  updateTime   DateTime?   @updatedAt @map("update_time") @db.DateTime(0)

  // 自关联关系（父子菜单）
  parent   Menu?   @relation("MenuHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children Menu[]  @relation("MenuHierarchy")

  // 关系
  menuButtons      MenuButton[]
  roleMenus        RoleMenu[]
  roleMenuButtons  RoleMenuButton[]

  @@index([parentId], name: "idx_parent_id")
  @@index([status], name: "idx_status")
  @@index([sortOrder], name: "idx_sort_order")
  @@map("menus")
}

// ==================== 菜单权限按钮表 ====================

model MenuButton {
  id         BigInt   @id @default(autoincrement()) @db.BigInt
  menuId     BigInt   @map("menu_id") @db.BigInt
  title      String   @db.VarChar(100)
  authMark   String   @map("auth_mark") @db.VarChar(100)
  sortOrder  Int      @default(0) @map("sort_order")
  createTime DateTime @default(now()) @map("create_time") @db.DateTime(0)

  // 关系
  menu           Menu              @relation(fields: [menuId], references: [id], onDelete: Cascade)
  roleMenuButtons RoleMenuButton[]

  @@unique([menuId, authMark], name: "uk_menu_auth")
  @@index([menuId], name: "idx_menu_id")
  @@map("menu_buttons")
}

// ==================== 用户角色关联表 ====================

model UserRole {
  id         BigInt   @id @default(autoincrement()) @db.BigInt
  userId     BigInt   @map("user_id") @db.BigInt
  roleId     BigInt   @map("role_id") @db.BigInt
  createTime DateTime @default(now()) @map("create_time") @db.DateTime(0)

  // 关系
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role Role @relation(fields: [roleId], references: [roleId], onDelete: Cascade)

  @@unique([userId, roleId], name: "uk_user_role")
  @@index([userId], name: "idx_user_id")
  @@index([roleId], name: "idx_role_id")
  @@map("user_roles")
}

// ==================== 角色菜单关联表 ====================

model RoleMenu {
  id         BigInt   @id @default(autoincrement()) @db.BigInt
  roleId     BigInt   @map("role_id") @db.BigInt
  menuId     BigInt   @map("menu_id") @db.BigInt
  createTime DateTime @default(now()) @map("create_time") @db.DateTime(0)

  // 关系
  role Role @relation(fields: [roleId], references: [roleId], onDelete: Cascade)
  menu Menu @relation(fields: [menuId], references: [id], onDelete: Cascade)

  @@unique([roleId, menuId], name: "uk_role_menu")
  @@index([roleId], name: "idx_role_id")
  @@index([menuId], name: "idx_menu_id")
  @@map("role_menus")
}

// ==================== 角色菜单按钮关联表 ====================

model RoleMenuButton {
  id         BigInt   @id @default(autoincrement()) @db.BigInt
  roleId     BigInt   @map("role_id") @db.BigInt
  menuId     BigInt   @map("menu_id") @db.BigInt
  buttonId   BigInt   @map("button_id") @db.BigInt
  createTime DateTime @default(now()) @map("create_time") @db.DateTime(0)

  // 关系
  role  Role       @relation(fields: [roleId], references: [roleId], onDelete: Cascade)
  menu  Menu       @relation(fields: [menuId], references: [id], onDelete: Cascade)
  button MenuButton @relation(fields: [buttonId], references: [id], onDelete: Cascade)

  @@unique([roleId, menuId, buttonId], name: "uk_role_menu_button")
  @@index([roleId], name: "idx_role_id")
  @@index([menuId], name: "idx_menu_id")
  @@map("role_menu_buttons")
}
```

---

## 模型说明

### 1. User（用户表）

**主要字段：**
- `id`: 用户ID，BigInt 自增主键
- `userName`: 用户名，唯一索引
- `password`: 密码（加密存储，建议使用 BCrypt）
- `nickName`: 昵称
- `email`: 邮箱
- `avatar`: 头像URL
- `userPhone`: 手机号
- `userGender`: 性别（String：'male'/'female'/'unknown'）
- `status`: 状态（String：'1'-在线，'2'-离线，'3'-异常，'4'-注销）
- `createBy`: 创建人
- `createTime`: 创建时间（自动设置）
- `updateBy`: 更新人
- `updateTime`: 更新时间（自动更新）
- `remark`: 备注

**索引：**
- `userName` 唯一索引
- `status` 普通索引
- `createTime` 普通索引

### 2. Role（角色表）

**主要字段：**
- `roleId`: 角色ID，BigInt 自增主键（注意：不是 `id`）
- `roleName`: 角色名称
- `roleCode`: 角色编码，唯一索引
- `description`: 角色描述
- `enabled`: 是否启用（Boolean，默认 true）
- `createTime`: 创建时间
- `updateTime`: 更新时间

**索引：**
- `roleCode` 唯一索引

### 3. Menu（菜单表）

**主要字段：**
- `id`: 菜单ID，BigInt 自增主键
- `parentId`: 父菜单ID（0 表示顶级菜单）
- `name`: 路由名称（Vue Router name）
- `path`: 路由路径
- `component`: 组件路径（如：views/system/user/index.vue）
- `title`: 菜单标题
- `icon`: 菜单图标（Iconify 图标名）
- `isHide`: 是否在菜单中隐藏
- `isHideTab`: 是否在标签页中隐藏
- `link`: 外部链接
- `isIframe`: 是否为 iframe
- `keepAlive`: 是否缓存
- `isFirstLevel`: 是否为一级菜单
- `fixedTab`: 是否固定标签页
- `activePath`: 激活菜单路径
- `isFullPage`: 是否为全屏页面
- `sortOrder`: 排序顺序
- `status`: 状态（String：'1'-启用，'2'-禁用）

**自关联关系：**
- `parent`: 父菜单（可选）
- `children`: 子菜单列表

**索引：**
- `parentId` 普通索引
- `status` 普通索引
- `sortOrder` 普通索引

### 4. MenuButton（菜单权限按钮表）

**主要字段：**
- `id`: 主键ID
- `menuId`: 菜单ID（外键）
- `title`: 按钮标题
- `authMark`: 权限标识（如：add, edit, delete）
- `sortOrder`: 排序顺序

**唯一约束：**
- `menuId` + `authMark` 组合唯一（同一菜单下权限标识不能重复）

### 5. UserRole（用户角色关联表）

**主要字段：**
- `id`: 主键ID
- `userId`: 用户ID（外键）
- `roleId`: 角色ID（外键）

**唯一约束：**
- `userId` + `roleId` 组合唯一（同一用户不能重复分配相同角色）

### 6. RoleMenu（角色菜单关联表）

**主要字段：**
- `id`: 主键ID
- `roleId`: 角色ID（外键）
- `menuId`: 菜单ID（外键）

**唯一约束：**
- `roleId` + `menuId` 组合唯一

### 7. RoleMenuButton（角色菜单按钮关联表）

**主要字段：**
- `id`: 主键ID
- `roleId`: 角色ID（外键）
- `menuId`: 菜单ID（外键）
- `buttonId`: 按钮ID（外键）

**唯一约束：**
- `roleId` + `menuId` + `buttonId` 组合唯一

---

## 关系说明

### 1. 用户与角色（多对多）

```
User ←→ UserRole ←→ Role
```

- 一个用户可以有多个角色
- 一个角色可以分配给多个用户
- 通过 `UserRole` 中间表关联

### 2. 角色与菜单（多对多）

```
Role ←→ RoleMenu ←→ Menu
```

- 一个角色可以访问多个菜单
- 一个菜单可以被多个角色访问
- 通过 `RoleMenu` 中间表关联

### 3. 角色与菜单按钮（多对多）

```
Role ←→ RoleMenuButton ←→ MenuButton
Menu ←→ RoleMenuButton ←→ MenuButton
```

- 一个角色可以拥有多个菜单按钮权限
- 一个菜单按钮可以被多个角色拥有
- 通过 `RoleMenuButton` 中间表关联

### 4. 菜单自关联（树形结构）

```
Menu (parent) ←→ Menu (children)
```

- 菜单支持多级嵌套
- 通过 `parentId` 字段实现父子关系
- 使用 Prisma 自关联关系定义

### 5. 菜单与菜单按钮（一对多）

```
Menu (1) ←→ MenuButton (N)
```

- 一个菜单可以有多个权限按钮
- 菜单按钮属于一个菜单

---

## 使用说明

### 1. 安装 Prisma

```bash
npm install prisma @prisma/client
npx prisma init
```

### 2. 配置环境变量

在 `.env` 文件中配置数据库连接：

```env
DATABASE_URL="mysql://user:password@localhost:3306/database_name?schema=public"
```

### 3. 生成 Prisma Client

```bash
npx prisma generate
```

### 4. 在 NestJS 中使用

#### 4.1 创建 Prisma Service

```typescript
// prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

#### 4.2 在 Module 中注册

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
```

#### 4.3 使用示例

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // 查询用户及其角色
  async findUserWithRoles(userId: bigint) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  // 查询用户的菜单权限
  async findUserMenus(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                roleMenus: {
                  include: {
                    menu: {
                      include: {
                        children: true,
                        menuButtons: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // 处理菜单数据，去重并构建树形结构
    // ...
    return menus;
  }

  // 创建用户
  async createUser(data: {
    userName: string;
    password: string;
    email?: string;
    roleIds?: bigint[];
  }) {
    return this.prisma.user.create({
      data: {
        userName: data.userName,
        password: data.password, // 需要先加密
        email: data.email,
        userRoles: {
          create: data.roleIds?.map((roleId) => ({
            roleId,
          })),
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }
}
```

### 5. 常用查询示例

#### 5.1 查询用户列表（分页）

```typescript
async findUsers(params: {
  current: number;
  size: number;
  userName?: string;
  status?: UserStatus;
}) {
  const skip = (params.current - 1) * params.size;
  
  const [records, total] = await Promise.all([
    this.prisma.user.findMany({
      skip,
      take: params.size,
      where: {
        userName: params.userName
          ? { contains: params.userName }
          : undefined,
        status: params.status,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        createTime: 'desc',
      },
    }),
    this.prisma.user.count({
      where: {
        userName: params.userName
          ? { contains: params.userName }
          : undefined,
        status: params.status,
      },
    }),
  ]);

  return {
    records,
    current: params.current,
    size: params.size,
    total,
  };
}
```

#### 5.2 查询菜单树

```typescript
async findMenuTree(roleIds: bigint[]) {
  // 查询角色关联的菜单ID
  const roleMenus = await this.prisma.roleMenu.findMany({
    where: {
      roleId: { in: roleIds },
    },
    select: {
      menuId: true,
    },
  });

  const menuIds = [...new Set(roleMenus.map((rm) => rm.menuId))];

  // 查询菜单详情
  const menus = await this.prisma.menu.findMany({
    where: {
      id: { in: menuIds },
      status: '1', // 或使用 MenuStatus.ENABLED
    },
    include: {
      menuButtons: {
        where: {
          roleMenuButtons: {
            some: {
              roleId: { in: roleIds },
            },
          },
        },
        orderBy: {
          sortOrder: 'asc',
        },
      },
    },
    orderBy: [
      { sortOrder: 'asc' },
      { id: 'asc' },
    ],
  });

  // 构建树形结构
  return this.buildMenuTree(menus, BigInt(0));
}

private buildMenuTree(menus: Menu[], parentId: bigint): any[] {
  return menus
    .filter((menu) => menu.parentId === parentId)
    .map((menu) => ({
      ...menu,
      children: this.buildMenuTree(menus, menu.id),
    }));
}
```

#### 5.3 分配角色菜单权限

```typescript
async assignRoleMenus(roleId: bigint, menuIds: bigint[]) {
  // 使用事务确保数据一致性
  return this.prisma.$transaction(async (tx) => {
    // 删除原有权限
    await tx.roleMenu.deleteMany({
      where: { roleId },
    });

    // 添加新权限
    await tx.roleMenu.createMany({
      data: menuIds.map((menuId) => ({
        roleId,
        menuId,
      })),
    });
  });
}
```

---

## 数据迁移

### 1. 创建迁移

```bash
npx prisma migrate dev --name init
```

### 2. 应用迁移

```bash
npx prisma migrate deploy
```

### 3. 查看迁移状态

```bash
npx prisma migrate status
```

### 4. 重置数据库（开发环境）

```bash
npx prisma migrate reset
```

### 5. 生成迁移 SQL（不应用）

```bash
npx prisma migrate dev --create-only
```

---

## 注意事项

### 1. BigInt 类型处理

Prisma 使用 `BigInt` 类型，在 JavaScript 中需要使用 `BigInt()` 或 `n` 后缀：

```typescript
// 正确
const userId = BigInt(1);
const userId2 = 1n;

// 错误
const userId = 1; // TypeScript 类型不匹配
```

### 2. 枚举类型处理

由于前端使用字符串值（'1', '2'等），Schema 中使用 String 类型。建议在应用层定义 TypeScript 枚举：

**创建枚举文件 `src/common/enums/index.ts`：**

```typescript
/// 用户状态枚举
export enum UserStatus {
  ONLINE = '1',    // 在线
  OFFLINE = '2',   // 离线
  ABNORMAL = '3',  // 异常
  DISABLED = '4',  // 注销/禁用
}

/// 用户性别枚举
export enum UserGender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

/// 菜单状态枚举
export enum MenuStatus {
  ENABLED = '1',   // 启用
  DISABLED = '2',  // 禁用
}
```

**使用示例：**

```typescript
import { UserStatus, UserGender, MenuStatus } from '@/common/enums';

// 创建用户
const user = await prisma.user.create({
  data: {
    userName: 'admin',
    password: 'hashed_password',
    status: UserStatus.ONLINE, // '1'
    userGender: UserGender.MALE, // 'male'
  },
});

// 查询菜单
const menus = await prisma.menu.findMany({
  where: {
    status: MenuStatus.ENABLED, // '1'
  },
});
```

### 3. 关系查询性能

使用 `include` 或 `select` 时要注意性能，避免 N+1 查询：

```typescript
// 好的做法：一次性查询
const users = await prisma.user.findMany({
  include: {
    userRoles: {
      include: {
        role: true,
      },
    },
  },
});

// 避免：N+1 查询
const users = await prisma.user.findMany();
for (const user of users) {
  const roles = await prisma.userRole.findMany({
    where: { userId: user.id },
  }); // 每次循环都查询数据库
}
```

### 4. 级联删除

配置了 `onDelete: Cascade` 的关系，删除父记录时会自动删除子记录：

```typescript
// 删除用户时，会自动删除 user_roles 表中的关联记录
await prisma.user.delete({
  where: { id: userId },
});
```

### 5. 唯一约束

使用 `@@unique` 定义唯一约束，Prisma 会自动创建唯一索引：

```prisma
model User {
  userName String @unique
  // ...
}
```

### 6. 索引优化

根据查询需求添加索引：

```prisma
model User {
  // ...
  @@index([status])
  @@index([createTime])
}
```

---

## 总结

本文档提供了完整的 Prisma Schema 定义，包括：

1. **7 个数据模型**：User、Role、Menu、MenuButton、UserRole、RoleMenu、RoleMenuButton
2. **状态字段**：使用 String 类型存储状态值（'1', '2'等），与前端保持一致
3. **完整的关系定义**：多对多、一对多、自关联
4. **索引和约束**：唯一索引、普通索引、外键约束
5. **使用示例**：NestJS 集成、常用查询、数据迁移

**重要提示：**
- 状态字段使用 String 类型，存储值为 '1', '2' 等字符串，与前端保持一致
- 建议在应用层定义 TypeScript 枚举常量来管理这些值，提高代码可读性和类型安全
- 所有时间字段使用 `@default(now())` 和 `@updatedAt` 自动管理

按照本文档配置 Prisma Schema，可以快速搭建符合前端需求的数据库结构。

