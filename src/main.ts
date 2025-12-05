import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import {
  setupCors,
  setupSwagger,
  setupApiVersioning,
} from './config/bootstrap.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // 配置应用
  setupCors(app, configService);
  setupApiVersioning(app);
  setupSwagger(app);

  await app.listen(port);

  console.log(`🚀 应用运行在: http://localhost:${port}/api/v1`);
  console.log(`📦 环境: ${nodeEnv}`);
  console.log(`📚 API 文档: http://localhost:${port}/doc`);
  console.log(`🔢 API 版本控制已启用，默认版本: v1`);
}
bootstrap();
