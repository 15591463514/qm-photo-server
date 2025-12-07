import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';

/**
 * JWT Auth Guard - JWT 认证守卫
 * 用于验证 JWT Token，支持 @Public() 装饰器跳过认证
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * 检查是否需要认证
   * 如果接口标记了 @Public()，则跳过认证
   */
  canActivate(context: ExecutionContext) {
    // 检查是否有 @Public() 装饰器
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), // 方法上的装饰器
      context.getClass(), // 类上的装饰器
    ]);

    // 如果是公开接口，直接放行
    if (isPublic) {
      return true;
    }

    // 否则调用父类方法，触发 JwtStrategy.validate()
    return super.canActivate(context);
  }

  /**
   * 处理验证结果
   */
  handleRequest(err: any, user: any, info: any) {
    // 添加调试日志，查看验证失败的原因
    if (err || !user || !user.userName) {
      console.error('JWT 验证失败:', {
        err: err?.message || err,
        user: user ? '存在但缺少 userName' : '不存在',
        info: info?.message || info,
        hasUser: !!user,
        userKeys: user ? Object.keys(user) : [],
      });
      throw err || new UnauthorizedException('登录状态已过期');
    }
    // 返回用户对象，挂载到 request.user
    return user;
  }
}
