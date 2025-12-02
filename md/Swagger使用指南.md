# Swagger API 文档使用指南

## 📋 概述

本项目集成了 Swagger，用于自动生成和展示 API 文档。Swagger 提供了交互式的 API 文档界面，可以在浏览器中直接测试 API。

## 🚀 快速开始

### 1. 启动应用

```bash
pnpm start:dev
```

### 2. 访问 Swagger 文档

应用启动后，在浏览器中打开：

```
http://localhost:3000/api
```

你会看到一个交互式的 API 文档界面，包含所有已注册的 API 端点。

## 📝 配置说明

### main.ts 中的配置

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

// 配置 Swagger
const config = new DocumentBuilder()
  .setTitle('QM Photo Server API')
  .setDescription('QM Photo Server API 文档')
  .setVersion('1.0')
  .addTag('test', '测试模块')
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

**配置项说明：**

- `setTitle()` - API 文档标题
- `setDescription()` - API 文档描述
- `setVersion()` - API 版本号
- `addTag()` - 添加标签，用于分组 API
- `SwaggerModule.setup()` - 设置 Swagger UI 的访问路径（这里是 `/api`）

## 💻 在代码中使用 Swagger

### 1. Controller 装饰器

在 Controller 类上使用 `@ApiTags()` 装饰器，用于分组 API：

```typescript
import { ApiTags } from '@nestjs/swagger';

@ApiTags('test')
@Controller('test')
export class TestController {
  // ...
}
```

### 2. 方法装饰器

在 Controller 方法上使用装饰器来描述 API：

```typescript
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@Post()
@ApiOperation({ summary: '创建测试数据', description: '创建一个新的测试数据记录' })
@ApiBody({ type: CreateTestDto })
@ApiResponse({ status: 201, description: '创建成功' })
@ApiResponse({ status: 400, description: '请求参数错误' })
create(@Body() createTestDto: CreateTestDto) {
  return this.testService.create(createTestDto);
}
```

**常用装饰器：**

- `@ApiOperation()` - 描述 API 操作
- `@ApiResult()` - 描述响应（推荐，自动处理统一格式）
- `@ApiResponse()` - 描述响应状态码和说明（传统方式）
- `@ApiParam()` - 描述路径参数
- `@ApiQuery()` - 描述查询参数
- `@ApiBody()` - 描述请求体
- `@ApiHeader()` - 描述请求头

**注意：** 推荐使用 `@ApiResult()` 装饰器，它会自动处理统一响应格式的包装。

### 3. DTO 装饰器

在 DTO 类中使用 `@ApiProperty()` 和 `@ApiPropertyOptional()` 来描述属性：

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
}
```

**装饰器说明：**

- `@ApiProperty()` - 必填属性
- `@ApiPropertyOptional()` - 可选属性
- `description` - 属性描述
- `example` - 示例值
- `type` - 类型（通常自动推断）

## 📚 示例：Test 模块

### Controller 示例

```typescript
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('test')
@Controller('test')
export class TestController {
  @Get()
  @ApiOperation({ summary: '查询所有测试数据' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll() {
    return this.testService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '查询单个测试数据' })
  @ApiParam({ name: 'id', type: Number, description: '测试数据 ID' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '数据不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.testService.findOne(id);
  }
}
```

### DTO 示例

#### 请求 DTO（CreateTestDto）

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

#### 响应 DTO（TestResponseDto）

为了规范 API 返回的数据结构，需要定义响应 DTO：

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

**在 Controller 中使用响应 DTO：**

#### 使用 `@ApiResult` 装饰器（推荐）

```typescript
import { ApiResult } from '@/common/decorators/api-result.decorator';

@Get()
@ApiOperation({ summary: '查询所有测试数据' })
@ApiResult({
  status: 200,
  description: '查询成功',
  type: [TestResponseDto], // 数组类型使用 [TestResponseDto]
})
findAll() {
  return this.testService.findAll();
}

@Get(':id')
@ApiOperation({ summary: '查询单个测试数据' })
@ApiResult({
  status: 200,
  description: '查询成功',
  type: TestResponseDto, // 单个对象使用 TestResponseDto
})
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.testService.findOne(id);
}
```

**`@ApiResult` 会自动将响应包装为：**

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }  // 或 [...]
}
```

#### 使用 `@ApiResponse` 装饰器（传统方式）

```typescript
@Get()
@ApiOperation({ summary: '查询所有测试数据' })
@ApiResponse({
  status: 200,
  description: '查询成功',
  type: [TestResponseDto], // 数组类型使用 [TestResponseDto]
})
findAll() {
  return this.testService.findAll();
}

@Get(':id')
@ApiOperation({ summary: '查询单个测试数据' })
@ApiResponse({
  status: 200,
  description: '查询成功',
  type: TestResponseDto, // 单个对象使用 TestResponseDto
})
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.testService.findOne(id);
}
```

**在 Service 中转换数据：**

使用 `class-transformer` 的 `plainToInstance` 将 Prisma 返回的数据转换为响应 DTO：

```typescript
import { plainToInstance } from 'class-transformer';
import { TestResponseDto } from './dto/test-response.dto';

async findAll(): Promise<TestResponseDto[]> {
  const results = await this.prisma.test.findMany({
    where: { deletedAt: null },
  });
  return results.map((result) =>
    plainToInstance(TestResponseDto, result, {
      excludeExtraneousValues: false,
    }),
  );
}
```

## 🔧 参数验证

项目已配置全局验证管道，使用 `class-validator` 进行参数验证：

```typescript
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
```

**验证装饰器：**

- `@IsString()` - 必须是字符串
- `@IsNotEmpty()` - 不能为空
- `@IsOptional()` - 可选
- `@IsBoolean()` - 必须是布尔值
- `@IsNumber()` - 必须是数字
- `@IsEmail()` - 必须是邮箱格式
- `@Min()` / `@Max()` - 数值范围
- `@Length()` - 字符串长度

## 🎯 使用 Swagger UI 测试 API

1. **打开 Swagger 文档**：访问 `http://localhost:3000/api`

2. **查看 API 列表**：左侧显示所有 API 端点，按标签分组

3. **查看 API 详情**：点击任意 API，查看请求参数、响应格式等

4. **测试 API**：
   - 点击 "Try it out" 按钮
   - 填写请求参数
   - 点击 "Execute" 执行请求
   - 查看响应结果

5. **查看 Schema**：在页面底部可以查看所有 DTO 的定义

## 🦊 使用 Apifox 测试 API

Apifox 是一个强大的 API 协作工具，支持导入 Swagger 文档并进行测试。

### 导入 Swagger 到 Apifox

#### 步骤 1：启动应用

```bash
pnpm start:dev
```

#### 步骤 2：在 Apifox 中导入

1. 打开 Apifox
2. 选择 "导入" → "URL 导入"
3. 输入 OpenAPI JSON 地址：`http://localhost:3000/api-json`
4. 点击 "导入" 按钮

导入成功后，Apifox 会自动解析所有 API 端点，包括：

- 请求方法和路径
- 请求参数和类型
- 响应格式和示例
- API 描述和标签

### 测试 API 示例：创建测试数据

#### 请求配置

- **请求方法**：`POST`
- **请求 URL**：`http://localhost:3000/test`
- **请求头**：
  ```
  Content-Type: application/json
  ```
- **请求体**：
  ```json
  {
    "name": "测试数据",
    "description": "这是一个测试描述",
    "status": true
  }
  ```

#### 返回结果

**成功响应（201 Created）：**

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

- `id` - 自动生成的主键 ID（自增）
- `createdAt` - 创建时间（ISO 8601 格式，自动设置）
- `updatedAt` - 更新时间（ISO 8601 格式，自动更新）
- `name` - 测试名称（必填字段）
- `description` - 测试描述（可选字段）
- `status` - 状态（布尔值，可选，默认为 `true`）
- `deletedAt` - 删除时间（用于软删除，默认为 `null`）

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

**错误响应示例（400 Bad Request）：**

如果请求参数验证失败，会返回：

```json
{
  "statusCode": 400,
  "message": ["name should not be empty", "name must be a string"],
  "error": "Bad Request"
}
```

### Apifox 的优势

1. **团队协作** - 支持多人协作，共享 API 文档
2. **环境管理** - 可以配置多个环境（开发、测试、生产）
3. **自动化测试** - 支持编写测试用例和自动化测试
4. **Mock 数据** - 可以生成 Mock 数据用于前端开发
5. **接口文档** - 自动生成美观的接口文档

## 📖 常用功能

### 添加认证

如果需要添加 JWT 认证，可以在 DocumentBuilder 中配置：

```typescript
const config = new DocumentBuilder()
  .setTitle('QM Photo Server API')
  .setDescription('QM Photo Server API 文档')
  .setVersion('1.0')
  .addBearerAuth() // 添加 Bearer Token 认证
  .addTag('test', '测试模块')
  .build();
```

然后在需要认证的接口上使用：

```typescript
@ApiBearerAuth()
@Get('protected')
protectedRoute() {
  // ...
}
```

### 导出 OpenAPI JSON

Swagger 会自动生成 OpenAPI 规范文档，可以通过以下 URL 访问：

```
http://localhost:3000/api-json
```

### 自定义响应示例

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

## 🐛 常见问题

### Q1: Swagger 页面无法访问？

**检查项：**

1. 应用是否正常启动
2. 端口是否正确（默认 3000）
3. 访问路径是否正确（`/api`）

### Q2: API 文档中没有显示某些接口？

**可能原因：**

1. Controller 没有使用 `@ApiTags()` 装饰器
2. 方法没有使用 `@ApiOperation()` 装饰器
3. 模块没有正确导入到 AppModule

### Q3: 参数验证不生效？

**检查项：**

1. DTO 是否使用了 `class-validator` 装饰器
2. 是否在 `main.ts` 中配置了全局验证管道
3. 请求 Content-Type 是否为 `application/json`

### Q4: 如何隐藏某些接口？

使用 `@ApiExcludeController()` 或 `@ApiExcludeEndpoint()`：

```typescript
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('internal')
export class InternalController {
  // 这个 Controller 不会出现在 Swagger 文档中
}
```

## 📄 分页功能

项目集成了统一的分页功能，支持分页查询和响应。

### 基本使用

在 Controller 中使用分页功能：

```typescript
import { PaginationPipe } from '@/common/pipes/pagination.pipe';
import { QueryTestDto } from './dto/query-test.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ApiExtraModels, ApiQuery } from '@nestjs/swagger';

@Get()
@ApiOperation({ summary: '分页查询测试数据' })
@ApiExtraModels(QueryTestDto, PaginationDto)
@ApiQuery({ type: QueryTestDto })
@ApiResult({
  status: 200,
  description: '查询成功',
  type: [TestResponseDto],
  isPage: true, // 重要：标记为分页响应
})
findPaginated(
  @Query(PaginationPipe)
  query: QueryTestDto,
) {
  return this.testService.findPaginated(query);
}
```

### 分页响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "测试数据",
        "status": true
      }
    ],
    "meta": {
      "currentPage": 1,
      "itemsPerPage": 10,
      "totalItems": 100,
      "totalPages": 10,
      "itemCount": 10
    }
  }
}
```

**详细说明：** 查看 [分页功能使用指南](./分页功能使用指南.md)

## 📚 相关文档

- [NestJS Swagger 官方文档](https://docs.nestjs.com/openapi/introduction)
- [Swagger/OpenAPI 规范](https://swagger.io/specification/)
- [class-validator 文档](https://github.com/typestack/class-validator)
- [分页功能使用指南](./分页功能使用指南.md) - 分页功能详细使用说明

---

## 🔗 参考资源

- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)
