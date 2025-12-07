import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

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
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
