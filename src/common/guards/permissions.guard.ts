import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionOptions,
  PermissionLogical,
} from '@/common/decorators/permissions.decorator';

/**
 * Permissions Guard - 权限守卫
 * 用于验证用户是否拥有所需权限
 *
 * 验证逻辑：
 * 1. 如果接口没有 @RequiresPermissions() 装饰器，直接放行
 * 2. 如果有装饰器，检查用户权限列表
 * 3. 支持 AND/OR 逻辑
 * 4. 超级管理员（R_SUPER）拥有所有权限
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 读取 @RequiresPermissions() 装饰器的元数据
    const permissionOptions =
      this.reflector.getAllAndOverride<PermissionOptions>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // 如果没有权限要求，允许访问
    if (!permissionOptions || !permissionOptions.permissions?.length) {
      return true;
    }

    // 从 request.user 获取用户信息
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('用户未登录');
    }

    // 获取用户权限列表（从 user.buttons 获取按钮权限）
    const userPermissions: string[] = user.buttons || [];
    const userRoles: string[] = user.roles || [];

    // 检查是否为超级管理员（R_SUPER 拥有所有权限）
    if (userRoles.includes('R_SUPER')) {
      return true;
    }

    // 如果没有权限，拒绝访问
    if (userPermissions.length === 0) {
      throw new ForbiddenException('暂无权限访问，请联系管理员');
    }

    // 根据逻辑关系验证权限
    const { permissions: requiredPermissions, logical } = permissionOptions;
    const logicalType = logical || PermissionLogical.AND;

    let hasPermission = false;

    if (logicalType === PermissionLogical.OR) {
      // OR 逻辑：只要有一个权限匹配即可
      hasPermission = requiredPermissions.some((permission) =>
        userPermissions.includes(permission),
      );
    } else {
      // AND 逻辑：所有权限都必须匹配
      hasPermission = requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );
    }

    // 验证失败，抛出异常
    if (!hasPermission) {
      throw new ForbiddenException('暂无权限访问，请联系管理员');
    }

    return true;
  }
}
