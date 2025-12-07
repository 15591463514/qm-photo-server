import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local Auth Guard - 本地认证守卫
 * 用于登录接口，使用 Local Strategy 验证用户名和密码
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
