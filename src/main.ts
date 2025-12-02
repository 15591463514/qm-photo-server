import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupCors, setupSwagger } from './config/bootstrap.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // 配置应用
  setupCors(app, configService);
  setupSwagger(app);

  await app.listen(port);

  console.log(`🚀 应用运行在: http://localhost:${port}`);
  console.log(`📦 环境: ${nodeEnv}`);
  console.log(`📚 API 文档: http://localhost:${port}/api`);
}
bootstrap();
