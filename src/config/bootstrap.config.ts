import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

/**
 * 配置 CORS
 */
export function setupCors(
  app: INestApplication,
  configService: ConfigService,
): void {
  const corsOrigin = configService.get<string>('app.corsOrigin');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
}

/**
 * 配置 Swagger
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('QM Photo Server API')
    .setDescription('QM Photo Server API 文档（支持版本控制）')
    .setVersion('1.0')
    .addTag('test', '测试模块')
    .addServer('/api/v1', 'API Version 1') // 添加版本服务器
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('doc', app, document);
}

/**
 * 配置 API 版本控制
 */
export function setupApiVersioning(app: INestApplication): void {
  // 设置全局路由前缀为 /api
  app.setGlobalPrefix('api');

  // 启用 API 版本控制（URI 版本控制：/api/v1/xxx, /api/v2/xxx）
  app.enableVersioning({
    type: VersioningType.URI, // 使用 URI 版本控制
    defaultVersion: '1', // 默认版本为 v1
  });
}
