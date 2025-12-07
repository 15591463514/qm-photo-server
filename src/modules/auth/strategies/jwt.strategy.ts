import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';

/**
 * JWT Strategy - JWT 验证策略
 * 用于验证 JWT Token 的有效性
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从请求头提取 Token
      ignoreExpiration: false, // 不忽略过期时间
      secretOrKey: configService.get<string>('app.jwtSecret'),
      passReqToCallback: true, // 传递 request 对象
    });
  }

  /**
   * 验证 Token 并返回用户信息
   * @param request 请求对象
   * @param payload JWT Payload
   * @returns 用户信息（附加到 request.user）
   */
  async validate(request: Request, payload: JwtPayload) {
    console.log('JWT Strategy validate 被调用', { payload });
    const { userId, pv } = payload;

    // 从请求头提取完整 Token
    const authorization = request.headers.authorization || '';
    const token = authorization.slice(7); // 去掉 "Bearer " 前缀

    // 验证 Token 有效性（包括 Token 一致性、密码版本号等）
    const user = await this.authService.validateToken(userId, pv || 1, token);
    console.log('validateToken 返回的用户信息:', user);
    // 返回值会被 JwtAuthGuard.handleRequest() 接收
    return user || { userId };
  }
}
