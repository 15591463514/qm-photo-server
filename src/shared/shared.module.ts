import { Global, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'nestjs-prisma';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientExceptionFilter } from 'nestjs-prisma';
import appConfig from '../config/app.config';
import databaseConfig from '../config/database.config';
import { ResponseTransformInterceptor } from '@/common/interceptors/response-transform.interceptor';

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
      load: [appConfig, databaseConfig],
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
      expandVariables: true,
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
  ],
  exports: [ConfigModule, PrismaModule],
})
export class SharedModule {}
