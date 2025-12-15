import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service';

/**
 * Local Strategy - 本地登录策略
 * 用于验证用户名和密码
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'userName', // 指定用户名字段
      passwordField: 'password',
    });
  }

  /**
   * 验证用户
   * @param userName 用户名
   * @param password 密码
   * @returns 用户信息（排除密码）
   */
  async validate(userName: string, password: string): Promise<any> {
    // validateUser 方法内部已经处理了错误，这里直接返回用户信息
    // 如果验证失败，validateUser 会抛出异常
    const user = await this.authService.validateUser(userName, password);
    return user;
  }
}
