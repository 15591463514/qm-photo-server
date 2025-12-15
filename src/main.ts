import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import {
  setupCors,
  setupSwagger,
  setupApiVersioning,
  setupLogger,
} from './config/bootstrap.config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // 缓冲日志，等待 winston 初始化
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // 配置应用
  setupCors(app, configService);
  setupApiVersioning(app);
  setupSwagger(app);
  setupLogger(app);

  await app.listen(port);

  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`🚀 应用运行在: http://localhost:${port}/api/v1`, 'Bootstrap');
  logger.log(`📦 环境: ${nodeEnv}`, 'Bootstrap');
  logger.log(`📚 API 文档: http://localhost:${port}/doc`, 'Bootstrap');
  logger.log(`🔢 API 版本控制已启用，默认版本: v1`, 'Bootstrap');
}
bootstrap();
