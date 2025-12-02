# Swagger 集成笔记

## ⚠️ 环境要求

**Node.js 版本要求：** `>= 20.0.0`

Swagger 集成需要 Node.js 20 或更高版本。

## 📝 集成步骤记录

### 1. 安装依赖

```bash
pnpm add @nestjs/swagger swagger-ui-express
pnpm add class-validator class-transformer
```

**版本：**

- `@nestjs/swagger`: ^11.2.3
- `swagger-ui-express`: ^5.0.1
- `class-validator`: ^0.14.3
- `class-transformer`: ^0.5.1

**注意：** `class-validator` 和 `class-transformer` 用于参数验证，是 Swagger 集成的重要组成部分。

### 2. 配置 Swagger

#### `src/main.ts` 配置

**功能：**

- 配置 Swagger 文档生成
- 设置全局验证管道
- 配置 Swagger UI 访问路径

**关键代码：**

```typescript
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动过滤掉未定义的属性
      forbidNonWhitelisted: true, // 如果请求包含未定义的属性，抛出错误
      transform: true, // 自动转换类型
      transformOptions: {
        enableImplicitConversion: true, // 启用隐式类型转换
      },
    }),
  );

  // 启用 CORS
  const corsOrigin = configService.get<string>('app.corsOrigin');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // 配置 Swagger
  const config = new DocumentBuilder()
    .setTitle('QM Photo Server API')
    .setDescription('QM Photo Server API 文档')
    .setVersion('1.0')
    .addTag('test', '测试模块')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);

  console.log(`🚀 应用运行在: http://localhost:${port}`);
  console.log(`📦 环境: ${nodeEnv}`);
  console.log(`📚 API 文档: http://localhost:${port}/api`);
}
bootstrap();
```

**配置说明：**

- `DocumentBuilder` - 构建 Swagger 文档配置
  - `setTitle()` - API 文档标题
  - `setDescription()` - API 文档描述
  - `setVersion()` - API 版本号
  - `addTag()` - 添加标签，用于分组 API
- `SwaggerModule.setup()` - 设置 Swagger UI 的访问路径（这里是 `/api`）
- `ValidationPipe` - 全局验证管道配置
  - `whitelist: true` - 自动过滤掉未定义的属性
  - `forbidNonWhitelisted: true` - 如果请求包含未定义的属性，抛出错误
  - `transform: true` - 自动转换类型
  - `enableImplicitConversion: true` - 启用隐式类型转换
- `ResponseTransformInterceptor` - 全局响应转换拦截器
  - 自动包装所有响应为统一格式：`{ code, message, data }`

### 4. 在 Controller 中添加 Swagger 装饰器

#### `src/modules/test/test.controller.ts`

**功能：**

- 使用 `@ApiTags()` 为 Controller 添加标签
- 使用 `@ApiOperation()` 描述 API 操作
- 使用 `@ApiResponse()` 描述响应状态码
- 使用 `@ApiParam()` 描述路径参数
- 使用 `@ApiBody()` 描述请求体

**关键代码：**

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { TestService } from './test.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';

@ApiTags('test')
@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post()
  @ApiOperation({
    summary: '创建测试数据',
    description: '创建一个新的测试数据记录',
  })
  @ApiBody({ type: CreateTestDto })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  create(@Body() createTestDto: CreateTestDto) {
    return this.testService.create(createTestDto);
  }

  @Get()
  @ApiOperation({
    summary: '查询所有测试数据',
    description: '获取所有未删除的测试数据列表',
  })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll() {
    return this.testService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: '查询单个测试数据',
    description: '根据 ID 获取单个测试数据',
  })
  @ApiParam({ name: 'id', type: Number, description: '测试数据 ID' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '数据不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.testService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '更新测试数据',
    description: '根据 ID 更新测试数据',
  })
  @ApiParam({ name: 'id', type: Number, description: '测试数据 ID' })
  @ApiBody({ type: UpdateTestDto })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '数据不存在' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTestDto: UpdateTestDto,
  ) {
    return this.testService.update(id, updateTestDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除测试数据（软删除）',
    description: '根据 ID 软删除测试数据，数据不会真正删除，只是标记为已删除',
  })
  @ApiParam({ name: 'id', type: Number, description: '测试数据 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '数据不存在' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.testService.remove(id);
  }
}
```

**装饰器说明：**

- `@ApiTags('test')` - 为 Controller 添加标签，用于在 Swagger UI 中分组
- `@ApiOperation()` - 描述 API 操作
  - `summary` - 简短描述
  - `description` - 详细描述
- `@ApiResponse()` - 描述响应状态码和说明
- `@ApiParam()` - 描述路径参数
- `@ApiBody()` - 描述请求体类型

### 5. 在 DTO 中添加 Swagger 和验证装饰器

#### `src/modules/test/dto/create-test.dto.ts`

**功能：**

- 使用 `@ApiProperty()` 描述必填属性
- 使用 `@ApiPropertyOptional()` 描述可选属性
- 使用 `class-validator` 装饰器进行参数验证

**关键代码：**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateTestDto {
  @ApiProperty({
    description: '测试名称',
    example: '测试数据',
  })
  @IsString()
  @IsNotEmpty({ message: '名称不能为空' })
  name: string;

  @ApiPropertyOptional({
    description: '测试描述',
    example: '这是一个测试描述',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '状态',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
```

#### `src/modules/test/dto/update-test.dto.ts`

**关键代码：**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateTestDto {
  @ApiPropertyOptional({
    description: '测试名称',
    example: '更新后的测试数据',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '测试描述',
    example: '更新后的测试描述',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '状态',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
```

#### `src/modules/test/dto/test-response.dto.ts`

**功能：**

- 定义 API 响应数据结构
- 使用 `@ApiProperty()` 描述响应字段
- 确保返回数据格式统一

**关键代码：**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestResponseDto {
  @ApiProperty({
    description: '测试数据 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '创建时间',
    example: '2025-11-25T16:51:30.797Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2025-11-25T16:51:30.797Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: '测试名称',
    example: '测试数据',
  })
  name: string;

  @ApiPropertyOptional({
    description: '测试描述',
    example: '这是一个测试描述',
  })
  description?: string | null;

  @ApiProperty({
    description: '状态',
    example: true,
  })
  status: boolean;

  @ApiPropertyOptional({
    description: '删除时间（软删除）',
    example: null,
  })
  deletedAt?: Date | null;
}
```

**装饰器说明：**

- `@ApiProperty()` - 必填属性，会在 Swagger 文档中标记为必填
- `@ApiPropertyOptional()` - 可选属性
  - `description` - 属性描述
  - `example` - 示例值
  - `default` - 默认值
- `@IsString()` - 验证必须是字符串
- `@IsNotEmpty()` - 验证不能为空
- `@IsOptional()` - 标记为可选
- `@IsBoolean()` - 验证必须是布尔值

### 5. 在 Service 中转换数据

**功能：**

- 使用 `class-transformer` 的 `plainToInstance` 将 Prisma 返回的数据转换为响应 DTO
- 确保返回数据结构符合 Swagger 文档定义

**关键代码：**

```typescript
import { plainToInstance } from 'class-transformer';
import { TestResponseDto } from './dto/test-response.dto';

@Injectable()
export class TestService {
  async findAll(): Promise<TestResponseDto[]> {
    const results = await this.prisma.test.findMany({
      where: { deletedAt: null },
    });
    // 将数组中的每个元素转换为响应 DTO
    return results.map((result) =>
      plainToInstance(TestResponseDto, result, {
        excludeExtraneousValues: false,
      }),
    );
  }

  async findOne(id: number): Promise<TestResponseDto> {
    const test = await this.prisma.test.findFirst({
      where: { id, deletedAt: null },
    });
    if (!test) {
      throw new NotFoundException(`Test with ID ${id} not found`);
    }
    // 将单个对象转换为响应 DTO
    return plainToInstance(TestResponseDto, test, {
      excludeExtraneousValues: false,
    });
  }
}
```

**说明：**

- `plainToInstance()` - 将普通对象转换为类实例
- `excludeExtraneousValues: false` - 允许包含 DTO 中未定义的属性
- 数组需要使用 `map()` 逐个转换

**常用验证装饰器：**

- `@IsString()` - 必须是字符串
- `@IsNumber()` - 必须是数字
- `@IsBoolean()` - 必须是布尔值
- `@IsEmail()` - 必须是邮箱格式
- `@IsNotEmpty()` - 不能为空
- `@IsOptional()` - 可选
- `@Min()` / `@Max()` - 数值范围
- `@Length()` - 字符串长度
- `@IsArray()` - 必须是数组
- `@IsDate()` - 必须是日期

---

## 🔄 使用流程

### 1. 启动应用

```bash
pnpm start:dev
```

### 2. 访问 Swagger 文档

浏览器打开：`http://localhost:3000/api`

### 3. 在 Swagger UI 中测试 API

1. 查看 API 列表（左侧）
2. 点击 API 查看详情
3. 点击 "Try it out" 按钮
4. 填写请求参数
5. 点击 "Execute" 执行请求
6. 查看响应结果

### 4. 导入到 Apifox 进行测试

Apifox 是一个强大的 API 协作工具，可以将 Swagger 文档导入进行测试和管理。

#### 导入步骤

1. **启动应用**

   ```bash
   pnpm start:dev
   ```

2. **在 Apifox 中导入**
   - 打开 Apifox
   - 选择 "导入" → "URL 导入"
   - 输入 OpenAPI JSON 地址：`http://localhost:3000/api-json`
   - 点击 "导入" 按钮

#### 测试 API 示例

**创建测试数据（POST /test）：**

- **请求方法**：`POST`
- **请求 URL**：`http://localhost:3000/test`
- **请求头**：`Content-Type: application/json`
- **请求体**：
  ```json
  {
    "name": "测试数据",
    "description": "这是一个测试描述",
    "status": true
  }
  ```

**返回结果：**

所有 API 响应都会被统一包装为以下结构：

```json
{
  "code": 201,
  "message": "success",
  "data": {
    "id": 1,
    "createdAt": "2025-11-25T16:51:30.797Z",
    "updatedAt": "2025-11-25T16:51:30.797Z",
    "name": "测试数据",
    "description": "这是一个测试描述",
    "status": true,
    "deletedAt": null
  }
}
```

**统一响应结构说明：**

- `code` - HTTP 状态码（200, 201, 400, 404 等）
- `message` - 响应消息（成功时为 "success"）
- `data` - 实际响应数据（对象或数组）

**data 字段说明：**

- `id` - 自动生成的主键 ID
- `createdAt` - 创建时间（自动设置）
- `updatedAt` - 更新时间（自动更新）
- `name` - 测试名称（必填）
- `description` - 测试描述（可选）
- `status` - 状态（可选，默认为 `true`）
- `deletedAt` - 删除时间（软删除字段，默认为 `null`）

**数组响应示例：**

查询列表接口返回：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "createdAt": "2025-11-25T16:51:30.797Z",
      "updatedAt": "2025-11-25T17:14:35.026Z",
      "name": "更新后的测试数据",
      "description": "更新后的测试描述",
      "status": false,
      "deletedAt": null
    }
  ]
}
```

---

## 🔄 如何给其他项目搭建环境

### 快速复制步骤

1. **安装依赖**

   ```bash
   pnpm add @nestjs/swagger swagger-ui-express
   pnpm add class-validator class-transformer
   ```

2. **创建响应转换拦截器**
   - 创建 `src/common/interceptors/response-transform.interceptor.ts`
   - 创建 `src/common/dto/api-response.dto.ts`

3. **配置 main.ts**
   - 导入 Swagger 相关模块
   - 配置 `DocumentBuilder`
   - 设置 `SwaggerModule.setup()`
   - 配置全局验证管道
   - 配置响应转换拦截器

3. **在 Controller 中添加装饰器**
   - 在 Controller 类上添加 `@ApiTags()`
   - 在方法上添加 `@ApiOperation()`、`@ApiResponse()` 等

4. **在 DTO 中添加装饰器**
   - 创建请求 DTO（如 `CreateTestDto`、`UpdateTestDto`）
   - 创建响应 DTO（如 `TestResponseDto`）
   - 使用 `@ApiProperty()` 或 `@ApiPropertyOptional()`
   - 添加验证装饰器（`@IsString()`、`@IsNotEmpty()` 等）

5. **在 Service 中转换数据**
   - 使用 `plainToInstance()` 将 Prisma 数据转换为响应 DTO
   - 确保返回数据结构符合 Swagger 文档定义

6. **测试**

   ```bash
   pnpm start:dev
   ```

   访问 `http://localhost:3000/api` 查看文档

---

## 💡 关键要点

### 1. 统一响应结构

**配置位置：** `src/common/interceptors/response-transform.interceptor.ts`

**作用：**

- 自动包装所有 API 响应为统一格式
- 确保响应结构一致性
- 便于前端统一处理

**响应格式：**

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }  // 或 [...]
}
```

**字段说明：**

- `code` - HTTP 状态码
- `message` - 响应消息（成功时为 "success"）
- `data` - 实际响应数据

### 2. 全局验证管道

**配置位置：** `src/config/bootstrap.config.ts`

**作用：**

- 自动验证请求参数
- 自动过滤未定义的属性
- 自动转换类型

**配置项：**

- `whitelist: true` - 只允许 DTO 中定义的属性
- `forbidNonWhitelisted: true` - 禁止未定义的属性
- `transform: true` - 自动转换类型
- `enableImplicitConversion: true` - 启用隐式类型转换

### 3. Swagger 装饰器使用

**Controller 装饰器：**

- `@ApiTags()` - 分组 API
- `@ApiOperation()` - 描述操作
- `@ApiResponse()` - 描述响应，使用 `type` 指定响应 DTO
- `@ApiParam()` - 描述路径参数
- `@ApiQuery()` - 描述查询参数
- `@ApiBody()` - 描述请求体

**DTO 装饰器：**

- `@ApiProperty()` - 必填属性
- `@ApiPropertyOptional()` - 可选属性

**响应 DTO 使用：**

```typescript
@ApiResponse({
  status: 200,
  description: '查询成功',
  type: TestResponseDto, // 单个对象
})

@ApiResponse({
  status: 200,
  description: '查询成功',
  type: [TestResponseDto], // 数组类型
})
```

### 4. 参数验证

**验证装饰器：**

- 使用 `class-validator` 装饰器
- 在 DTO 中定义验证规则
- 全局验证管道自动处理

**验证流程：**

1. 请求到达 Controller
2. 全局验证管道拦截
3. 根据 DTO 中的装饰器验证
4. 验证失败返回 400 错误
5. 验证成功继续处理

### 5. 类型转换

**自动转换：**

- 字符串转数字
- 字符串转布尔值
- 字符串转日期

**示例：**

```typescript
// 路径参数自动转换
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  // id 自动转换为 number
}
```

### 6. 响应数据转换

**使用 `class-transformer` 转换响应数据：**

- 在 Service 中使用 `plainToInstance()` 将 Prisma 数据转换为响应 DTO
- 确保返回数据结构符合 Swagger 文档定义
- 数组需要使用 `map()` 逐个转换

**示例：**

```typescript
import { plainToInstance } from 'class-transformer';

// 单个对象转换
const result = await this.prisma.test.create({...});
return plainToInstance(TestResponseDto, result, {
  excludeExtraneousValues: false,
});

// 数组转换
const results = await this.prisma.test.findMany({...});
return results.map((result) =>
  plainToInstance(TestResponseDto, result, {
    excludeExtraneousValues: false,
  }),
);
```

---

## 📚 参考文档

- [NestJS Swagger 官方文档](https://docs.nestjs.com/openapi/introduction)
- [Swagger/OpenAPI 规范](https://swagger.io/specification/)
- [class-validator 文档](https://github.com/typestack/class-validator)
- [class-transformer 文档](https://github.com/typestack/class-transformer)
- [Apifox 官方文档](https://apifox.com/help/)

## 🦊 Apifox 集成说明

### 导入 Swagger 到 Apifox

Apifox 支持通过 URL 或文件导入 Swagger/OpenAPI 文档。

#### URL 导入方式（推荐）

1. **确保应用运行**

   ```bash
   pnpm start:dev
   ```

2. **在 Apifox 中导入**
   - 打开 Apifox
   - 选择 "导入" → "URL 导入"
   - 输入：`http://localhost:3000/api-json`
   - 点击 "导入"

#### 测试 API 示例

**POST /test - 创建测试数据**

**请求配置：**

- 方法：`POST`
- URL：`http://localhost:3000/test`
- Headers：`Content-Type: application/json`
- Body：
  ```json
  {
    "name": "测试数据",
    "description": "这是一个测试描述",
    "status": true
  }
  ```

**成功响应（201）：**

所有 API 响应都会被统一包装为以下结构：

```json
{
  "code": 201,
  "message": "success",
  "data": {
    "id": 1,
    "createdAt": "2025-11-25T16:51:30.797Z",
    "updatedAt": "2025-11-25T16:51:30.797Z",
    "name": "测试数据",
    "description": "这是一个测试描述",
    "status": true,
    "deletedAt": null
  }
}
```

**统一响应结构说明：**

- `code` - HTTP 状态码（200, 201, 400, 404 等）
- `message` - 响应消息（成功时为 "success"）
- `data` - 实际响应数据（对象或数组）

**data 字段说明：**

- `id` - 主键，自增
- `createdAt` - 创建时间（ISO 8601）
- `updatedAt` - 更新时间（ISO 8601）
- `name` - 名称（必填）
- `description` - 描述（可选）
- `status` - 状态（布尔值，可选，默认 `true`）
- `deletedAt` - 删除时间（软删除，默认 `null`）

**数组响应示例：**

查询列表接口返回：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "createdAt": "2025-11-25T16:51:30.797Z",
      "updatedAt": "2025-11-25T17:14:35.026Z",
      "name": "更新后的测试数据",
      "description": "更新后的测试描述",
      "status": false,
      "deletedAt": null
    }
  ]
}
```

---

## 🔧 常见问题

### Q1: Swagger 页面无法访问？

**错误信息：** 404 或页面无法加载

**检查项：**

1. 应用是否正常启动
2. 端口是否正确（默认 3000）
3. 访问路径是否正确（`/api`）
4. `main.ts` 中是否配置了 Swagger

**解决方案：**

```bash
# 检查应用是否运行
curl http://localhost:3000/api-json

# 如果返回 JSON，说明 Swagger 配置正确
```

### Q2: API 文档中没有显示某些接口？

**可能原因：**

1. Controller 没有使用 `@ApiTags()` 装饰器
2. 方法没有使用 `@ApiOperation()` 装饰器
3. 模块没有正确导入到 AppModule

**解决方案：**

```typescript
// 确保 Controller 有 @ApiTags()
@ApiTags('test')
@Controller('test')
export class TestController {
  // 确保方法有 @ApiOperation()
  @ApiOperation({ summary: '查询数据' })
  @Get()
  findAll() {
    // ...
  }
}
```

### Q3: 参数验证不生效？

**检查项：**

1. DTO 是否使用了 `class-validator` 装饰器
2. 是否在 `main.ts` 中配置了全局验证管道
3. 请求 Content-Type 是否为 `application/json`

**解决方案：**

```typescript
// 1. 确保 DTO 有验证装饰器
export class CreateTestDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

// 2. 确保 main.ts 有全局验证管道
app.useGlobalPipes(new ValidationPipe({...}));

// 3. 确保请求头正确
Content-Type: application/json
```

### Q4: 如何隐藏某些接口？

**使用 `@ApiExcludeController()` 或 `@ApiExcludeEndpoint()`：**

```typescript
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('internal')
export class InternalController {
  // 这个 Controller 不会出现在 Swagger 文档中
}
```

### Q5: 如何添加认证？

**在 DocumentBuilder 中配置：**

```typescript
const config = new DocumentBuilder()
  .setTitle('API')
  .setDescription('API 文档')
  .setVersion('1.0')
  .addBearerAuth() // 添加 Bearer Token 认证
  .build();
```

**在需要认证的接口上使用：**

```typescript
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Get('protected')
protectedRoute() {
  // ...
}
```

### Q6: 如何自定义响应示例？

**使用 `@ApiResponse()` 的 `schema` 选项：**

```typescript
@ApiResponse({
  status: 200,
  description: '查询成功',
  schema: {
    example: {
      id: 1,
      name: '测试数据',
      description: '这是一个测试描述',
      status: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  },
})
```

---

## 📝 配置检查清单

- [ ] 已安装 `@nestjs/swagger` 和 `swagger-ui-express`
- [ ] 已安装 `class-validator` 和 `class-transformer`
- [ ] 创建了响应转换拦截器 `response-transform.interceptor.ts`
- [ ] 创建了统一响应 DTO `api-response.dto.ts`
- [ ] `main.ts` 中已配置响应转换拦截器
- [ ] `main.ts` 中已配置 Swagger
- [ ] `main.ts` 中已配置全局验证管道
- [ ] Controller 使用了 `@ApiTags()` 装饰器
- [ ] Controller 方法使用了 `@ApiOperation()` 装饰器
- [ ] Controller 的 `@ApiResponse()` 中使用了 `ApiResponseDto` 类型
- [ ] DTO 使用了 `@ApiProperty()` 或 `@ApiPropertyOptional()` 装饰器
- [ ] DTO 使用了验证装饰器（`@IsString()`、`@IsNotEmpty()` 等）
- [ ] 创建了响应 DTO（如 `TestResponseDto`）
- [ ] Service 中使用 `plainToInstance()` 转换响应数据
- [ ] 应用启动后可以访问 `http://localhost:3000/api`
- [ ] Swagger UI 中可以看到所有 API 端点
- [ ] Swagger UI 中可以看到统一的响应结构（code, message, data）
- [ ] 可以在 Swagger UI 中测试 API
- [ ] API 响应被正确包装为统一格式

---

## 🎯 最佳实践

### 1. 完整的 API 文档

**为每个接口添加：**

- `@ApiOperation()` - 操作描述
- `@ApiResponse()` - 响应状态码
- `@ApiParam()` / `@ApiQuery()` - 参数描述
- `@ApiBody()` - 请求体描述

### 2. 详细的 DTO 文档

**为每个属性添加：**

- `description` - 属性描述
- `example` - 示例值
- `default` - 默认值（如果有）

### 3. 严格的参数验证

**使用验证装饰器：**

- 必填字段使用 `@IsNotEmpty()`
- 可选字段使用 `@IsOptional()`
- 类型验证使用 `@IsString()`、`@IsNumber()` 等
- 范围验证使用 `@Min()`、`@Max()` 等

### 4. 统一的错误响应

**定义统一的错误响应格式：**

```typescript
@ApiResponse({
  status: 400,
  description: '请求参数错误',
  schema: {
    example: {
      statusCode: 400,
      message: ['name should not be empty'],
      error: 'Bad Request',
    },
  },
})
```

---

## 📊 项目文件结构

```
src/
├── main.ts                    # Swagger 配置
├── modules/
│   └── test/
│       ├── test.controller.ts # Controller 装饰器
│       └── dto/
│           ├── create-test.dto.ts  # DTO 装饰器
│           └── update-test.dto.ts  # DTO 装饰器
└── ...
```

---

## 🔗 相关文档

- 项目文档：`md/Swagger使用指南.md` - 给开发者看的 Swagger 使用指南
- 项目文档：`md/集成指南.md` - 集成方案总览
