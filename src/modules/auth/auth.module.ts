import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '@/modules/user/user.module';
import { NoticeModule } from '@/modules/notice/notice.module';
import { VerificationCodeService } from './services/verification-code.service';
import { CaptchaService } from './services/captcha.service';

/**
 * 认证模块
 */
@Module({
  imports: [
    // Passport 模块
    PassportModule,

    // JWT 模块配置
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>(
          'app.jwtAccessTokenExpiresIn',
          '2h',
        );
        return {
          secret: configService.get<string>('app.jwtSecret'),
          signOptions: {
            expiresIn: expiresIn as any,
          },
        }; // JWT 模块接受 string 类型的 expiresIn
      },
    }),

    // 用户模块（使用 forwardRef 避免循环依赖）
    forwardRef(() => UserModule),

    // 通知模块（用于发送验证码邮件）
    NoticeModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    VerificationCodeService,
    CaptchaService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
