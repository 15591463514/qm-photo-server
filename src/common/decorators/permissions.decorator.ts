import { SetMetadata } from '@nestjs/common';

/**
 * 权限装饰器的元数据键
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * 权限逻辑枚举
 */
export enum PermissionLogical {
  AND = 'AND', // 需要同时拥有所有权限
  OR = 'OR', // 只需要拥有其中一个权限
}

/**
 * 权限装饰器选项
 */
export interface PermissionOptions {
  /** 权限标识列表 */
  permissions: string[];
  /** 逻辑关系：AND（需要所有权限）或 OR（需要其中一个权限），默认为 AND */
  logical?: PermissionLogical;
}

/**
 * 权限装饰器
 * 用于标记接口需要的权限
 *
 * @param permissions 权限标识列表，可以是字符串数组或单个字符串
 * @param logical 逻辑关系：AND（需要所有权限）或 OR（需要其中一个权限），默认为 AND
 * @example
 * ```typescript
 * // 需要单个权限
 * @RequiresPermissions('menu:view')
 * @Get('tree')
 * getMenuTree() {
 *   return this.menuService.getMenuTree();
 * }
 *
 * // 需要多个权限（AND 逻辑：需要同时拥有所有权限）
 * @RequiresPermissions('user:add', 'user:edit')
 * @Post()
 * createUser() {
 *   return this.userService.create();
 * }
 *
 * // 需要多个权限（OR 逻辑：只需要拥有其中一个权限）
 * @RequiresPermissions(['user:add', 'user:edit'], PermissionLogical.OR)
 * @Get('list')
 * getUserList() {
 *   return this.userService.findAll();
 * }
 * ```
 */
export const RequiresPermissions = (
  permissions: string | string[],
  logical: PermissionLogical = PermissionLogical.AND,
) => {
  // 统一转换为数组
  const permissionArray = Array.isArray(permissions)
    ? permissions
    : [permissions];

  return SetMetadata(PERMISSIONS_KEY, {
    permissions: permissionArray,
    logical,
  } as PermissionOptions);
};
