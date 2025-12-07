import { Global, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule as CacheManagerModule } from '@nestjs/cache-manager';
import { PrismaModule } from 'nestjs-prisma';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientExceptionFilter } from 'nestjs-prisma';
import { createKeyv } from '@keyv/redis';
import appConfig from '../config/app.config';
import databaseConfig from '../config/database.config';
import redisConfig, { RedisConfig } from '../config/redis.config';
import { ResponseTransformInterceptor } from '@/common/interceptors/response-transform.interceptor';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

/**
 * 共享模块 - 包含全局配置和公共服务
 */
@Global()
@Module({
  imports: [
    /**
     * 配置模块
     */
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig],
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
      expandVariables: true,
    }),
    /**
     * Cache Manager 模块（使用 Redis 作为存储，基于 keyv）
     */
    CacheManagerModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>('redis');
        // 构建 Redis 连接 URL
        const redisUrl = `redis://${redis.host}:${redis.port}/${redis.db}`;

        // 使用 createKeyv 创建 Keyv 实例，并设置命名空间
        const keyvStore = createKeyv(redisUrl, {
          namespace: redis.keyPrefix,
          keyPrefixSeparator: '',
        });

        console.log(redisUrl);

        return {
          stores: [keyvStore], // 使用 stores 数组（cache-manager v6+ 的要求）
          ttl: redis.ttl * 1000, // 默认过期时间（毫秒）
        };
      },
      isGlobal: true,
    }),
    /**
     * Prisma 模块
     */
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        prismaOptions: {
          log: [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' },
          ],
          errorFormat: 'pretty',
        },
      },
    }),
  ],
  providers: [
    /**
     * 全局参数校验管道
     */
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // 自动过滤掉未定义的属性
        transform: true, // 自动转换类型
        transformOptions: {
          enableImplicitConversion: true, // 启用隐式类型转换
        },
      }),
    },
    /**
     * Prisma 异常过滤器
     * 捕获 PrismaClientKnownRequestError，并返回适当的 HTTP 状态码
     * 例如：唯一约束冲突返回 409，记录不存在返回 404 等
     */
    {
      provide: APP_FILTER,
      useFactory: ({ httpAdapter }: HttpAdapterHost) => {
        return new PrismaClientExceptionFilter(httpAdapter);
      },
      inject: [HttpAdapterHost],
    },
    /**
     * 全局响应转换拦截器
     */
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
    /**
     * 全局 JWT 认证守卫
     * 所有接口默认需要 JWT 认证，除非使用 @Public() 装饰器标记
     */
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    /**
     * 全局角色守卫
     * 验证用户是否拥有所需角色（通过 @Roles() 装饰器指定）
     */
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [ConfigModule, PrismaModule, CacheManagerModule],
})
export class SharedModule {}
