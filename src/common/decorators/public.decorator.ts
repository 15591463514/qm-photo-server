import { SetMetadata } from '@nestjs/common';

/**
 * 公开接口装饰器的元数据键
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 公开接口装饰器
 * 使用此装饰器标记的接口将跳过 JWT 认证
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('public')
 * getPublicData() {
 *   return { message: 'This is public' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
