# 异常过滤器说明

本文档说明项目中异常过滤器的实现和使用方式。

## 异常过滤器架构

项目使用三层异常过滤器架构，确保所有异常都能被正确处理并转换为统一的响应格式。

### 执行顺序

异常过滤器的执行顺序如下（从先到后）：

1. **PrismaClientExceptionFilter** - 处理 Prisma 数据库相关异常
2. **HttpExceptionFilter** - 处理所有 HTTP 异常（BadRequestException, UnauthorizedException 等）
3. **AllExceptionsFilter** - 处理所有其他未捕获的异常（兜底）

### 响应格式

所有异常都会被转换为统一的响应格式：

```json
{
  "code": 400,
  "message": "错误消息",
  "data": null
}
```

## 异常过滤器详解

### 1. PrismaClientExceptionFilter

**位置：** `nestjs-prisma` 包提供

**功能：**
- 捕获 `PrismaClientKnownRequestError` 异常
- 将 Prisma 错误转换为 HTTP 异常
- 根据错误类型返回相应的 HTTP 状态码：
  - 唯一约束冲突 → 409 (Conflict)
  - 记录不存在 → 404 (Not Found)
  - 外键约束失败 → 400 (Bad Request)
  - 其他 Prisma 错误 → 500 (Internal Server Error)

**注意：** 此过滤器会抛出 `HttpException`，因此会被 `HttpExceptionFilter` 捕获并转换为统一格式。

### 2. HttpExceptionFilter

**位置：** `src/common/filters/http-exception.filter.ts`

**功能：**
- 捕获所有 `HttpException` 及其子类
- 处理 `ValidationPipe` 的错误（数组格式的 message）
- 将异常转换为统一的响应格式 `{ code, message, data }`
- 记录错误日志

**处理的异常类型：**
- `BadRequestException` (400)
- `UnauthorizedException` (401)
- `ForbiddenException` (403)
- `NotFoundException` (404)
- `MethodNotAllowedException` (405)
- `ConflictException` (409)
- `InternalServerErrorException` (500)
- 其他 `HttpException` 子类

**ValidationPipe 错误处理：**

当 `ValidationPipe` 验证失败时，会返回以下格式：

```json
{
  "statusCode": 400,
  "message": ["字段1验证失败", "字段2验证失败"],
  "error": "Bad Request"
}
```

`HttpExceptionFilter` 会将数组格式的 `message` 合并为字符串：

```json
{
  "code": 400,
  "message": "字段1验证失败, 字段2验证失败",
  "data": null
}
```

### 3. AllExceptionsFilter

**位置：** `src/common/filters/all-exceptions.filter.ts`

**功能：**
- 捕获所有未被其他过滤器处理的异常
- 作为最后一道防线，确保所有异常都能被处理
- 根据环境决定是否返回详细错误信息：
  - 生产环境：返回通用错误消息 "服务器内部错误，请稍后重试"
  - 开发环境：返回详细错误消息

**处理的异常类型：**
- 运行时错误
- 数据库连接错误
- 未预期的异常
- 其他所有异常

## 使用示例

### 抛出业务异常

```typescript
import { BadRequestException } from '@nestjs/common';

// 简单错误消息
throw new BadRequestException('用户名不能为空');

// 返回格式：
// {
//   "code": 400,
//   "message": "用户名不能为空",
//   "data": null
// }
```

### ValidationPipe 自动验证

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  userName: string;
}

// 如果验证失败，返回格式：
// {
//   "code": 400,
//   "message": "用户名不能为空",
//   "data": null
// }
```

### 多个验证错误

```typescript
// 如果多个字段验证失败，错误消息会合并：
// {
//   "code": 400,
//   "message": "用户名不能为空, 密码长度不能少于6位",
//   "data": null
// }
```

## 日志记录

所有异常都会被记录到日志中，包含以下信息：

- 请求路径 (`path`)
- 请求方法 (`method`)
- HTTP 状态码 (`statusCode`)
- 错误消息 (`message`)
- 时间戳 (`timestamp`)
- 错误堆栈 (`stack`)

## 注意事项

1. **异常过滤器顺序很重要**：确保 `PrismaClientExceptionFilter` 在最前面，`AllExceptionsFilter` 在最后面。

2. **不要直接返回错误响应**：应该抛出异常，让异常过滤器统一处理。

3. **生产环境安全**：`AllExceptionsFilter` 在生产环境不会返回详细的错误堆栈，防止敏感信息泄露。

4. **自定义异常**：如果需要自定义异常类型，应该继承 `HttpException`，这样会被 `HttpExceptionFilter` 处理。

## 测试

### 测试 HTTP 异常

```typescript
// 测试 BadRequestException
throw new BadRequestException('测试错误消息');

// 预期响应：
// {
//   "code": 400,
//   "message": "测试错误消息",
//   "data": null
// }
```

### 测试 ValidationPipe 错误

```typescript
// 发送无效的请求体
POST /api/user
{
  "userName": "",  // 空字符串，验证失败
  "password": "123"  // 长度不足，验证失败
}

// 预期响应：
// {
//   "code": 400,
//   "message": "用户名不能为空, 密码长度不能少于6位",
//   "data": null
// }
```

## 相关文件

- `src/common/filters/http-exception.filter.ts` - HTTP 异常过滤器
- `src/common/filters/all-exceptions.filter.ts` - 全局异常过滤器
- `src/common/class/api-response.class.ts` - 响应格式类
- `src/shared/shared.module.ts` - 过滤器注册

