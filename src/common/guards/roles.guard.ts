import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@/common/decorators/roles.decorator';

/**
 * Roles Guard - 角色守卫
 * 用于验证用户是否拥有所需角色
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 读取 @Roles() 装饰器的元数据
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有角色要求，允许访问
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 从 request.user 获取用户信息
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.roles) {
      return false;
    }

    // 检查用户角色是否包含所需角色（OR 逻辑：只要有一个匹配即可）
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
