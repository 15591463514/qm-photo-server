import { SetMetadata } from '@nestjs/common';

/**
 * 角色装饰器的元数据键
 */
export const ROLES_KEY = 'roles';

/**
 * 角色装饰器
 * 用于标记接口需要的角色
 *
 * @param roles 需要的角色编码列表
 * @example
 * ```typescript
 * @Roles('admin')
 * @Get('admin-only')
 * getAdminData() {
 *   return { message: 'Admin only' };
 * }
 *
 * @Roles('admin', 'user')
 * @Get('admin-or-user')
 * getData() {
 *   return { message: 'Admin or user' };
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
