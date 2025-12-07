import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 当前用户装饰器
 * 用于从 request.user 中提取用户信息
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: any) {
 *   return user;
 * }
 *
 * // 也可以提取特定字段
 * @Get('userId')
 * getUserId(@CurrentUser('userId') userId: string) {
 *   return { userId };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // 如果指定了字段名，返回该字段的值
    return data ? user?.[data] : user;
  },
);
