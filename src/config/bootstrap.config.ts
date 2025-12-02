import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    .setDescription('QM Photo Server API 文档')
    .setVersion('1.0')
    .addTag('test', '测试模块')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}
