# Winston 日志模块说明

本文档说明项目中 Winston 日志模块的配置和使用方式。

## 概述

项目使用 `winston` 和 `nest-winston` 进行日志记录，提供以下功能：

- ✅ 控制台输出（开发环境彩色输出，生产环境 JSON 格式）
- ✅ 文件输出（按日期轮转，自动压缩）
- ✅ 错误日志单独文件
- ✅ 异常和拒绝处理日志
- ✅ 结构化日志格式

## 安装

```bash
pnpm install winston nest-winston winston-daily-rotate-file
```

## 配置

### 环境变量

在 `.env` 文件中配置：

```env
# 日志级别: error, warn, info, http, verbose, debug, silly
LOG_LEVEL=info

# 日志目录（可选，默认为 logs）
LOG_DIR=logs
```

### 日志文件

日志文件存储在 `logs/` 目录下：

- `app-YYYY-MM-DD.log` - 所有日志（info 及以上级别）
- `error-YYYY-MM-DD.log` - 错误日志（error 级别）
- `exceptions-YYYY-MM-DD.log` - 未捕获的异常
- `rejections-YYYY-MM-DD.log` - 被拒绝的 Promise

### 日志轮转

- **单个文件最大大小**: 20MB
- **保留天数**: 14 天
- **自动压缩**: 旧日志文件会自动压缩为 `.gz` 格式

## 使用方式

### 在服务中使用

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class YourService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  someMethod() {
    // 记录不同级别的日志
    this.logger.error('错误信息', { context: 'YourService', error: error });
    this.logger.warn('警告信息', { context: 'YourService' });
    this.logger.info('信息日志', { context: 'YourService' });
    this.logger.debug('调试信息', { context: 'YourService' });
  }
}
```

### 在异常过滤器中使用

异常过滤器已经集成了 Winston，会自动记录：

- HTTP 异常（400-599）
- 未捕获的异常
- 被拒绝的 Promise

日志包含以下信息：

```json
{
  "context": "HttpExceptionFilter",
  "path": "/api/user/123",
  "method": "GET",
  "statusCode": 404,
  "message": "用户不存在",
  "stack": "...",
  "body": {},
  "query": {},
  "params": {},
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 日志级别

Winston 支持以下日志级别（从低到高）：

1. **error** - 错误信息
2. **warn** - 警告信息
3. **info** - 一般信息
4. **http** - HTTP 请求日志
5. **verbose** - 详细信息
6. **debug** - 调试信息
7. **silly** - 最详细的信息

## 环境差异

### 开发环境

- 控制台输出：彩色格式，易于阅读
- 文件输出：同时输出到文件
- 日志级别：根据 `LOG_LEVEL` 配置

### 生产环境

- 控制台输出：JSON 格式，只输出 warn 及以上级别
- 文件输出：所有日志都输出到文件
- 日志级别：根据 `LOG_LEVEL` 配置

## 日志格式

### 控制台格式（开发环境）

```
2024-01-01 12:00:00 info [HttpExceptionFilter] HTTP 404 Error: 用户不存在
```

### 文件格式（JSON）

```json
{
  "timestamp": "2024-01-01 12:00:00",
  "level": "error",
  "message": "HTTP 404 Error: 用户不存在",
  "context": "HttpExceptionFilter",
  "path": "/api/user/123",
  "method": "GET",
  "statusCode": 404,
  "stack": "...",
  "body": {},
  "query": {},
  "params": {},
  "ip": "127.0.0.1",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 日志文件管理

### 查看日志

```bash
# 查看最新的应用日志
tail -f logs/app-$(date +%Y-%m-%d).log

# 查看最新的错误日志
tail -f logs/error-$(date +%Y-%m-%d).log

# 查看异常日志
tail -f logs/exceptions-$(date +%Y-%m-%d).log
```

### 清理旧日志

日志文件会自动轮转和清理：

- 超过 14 天的日志文件会被自动删除
- 超过 20MB 的文件会自动轮转
- 旧文件会自动压缩为 `.gz` 格式

### 手动清理

```bash
# 删除所有日志文件
rm -rf logs/*.log

# 删除压缩的日志文件
rm -rf logs/*.gz
```

## 最佳实践

1. **使用适当的日志级别**
   - `error`: 错误和异常
   - `warn`: 警告信息
   - `info`: 一般信息
   - `debug`: 调试信息

2. **包含上下文信息**
   ```typescript
   this.logger.error('操作失败', {
     context: 'YourService',
     userId: 123,
     action: 'createUser',
     error: error.message,
   });
   ```

3. **不要记录敏感信息**
   - 不要记录密码、Token 等敏感信息
   - 不要记录完整的请求体（可能包含敏感数据）

4. **使用结构化日志**
   - 使用对象而不是字符串拼接
   - 便于日志分析和查询

## 相关文件

- `src/common/logger/winston.config.ts` - Winston 配置
- `src/common/filters/http-exception.filter.ts` - HTTP 异常过滤器（使用 Winston）
- `src/common/filters/all-exceptions.filter.ts` - 全局异常过滤器（使用 Winston）
- `src/app.module.ts` - Winston 模块注册
- `src/main.ts` - Winston 日志器初始化

## 故障排查

### 日志文件未生成

1. 检查 `logs/` 目录是否存在
2. 检查目录权限
3. 检查 `LOG_DIR` 环境变量配置

### 日志级别不生效

1. 检查 `LOG_LEVEL` 环境变量
2. 检查配置文件中的日志级别设置

### 日志文件过大

1. 检查 `maxSize` 配置（默认 20MB）
2. 检查 `maxFiles` 配置（默认 14 天）
3. 手动清理旧日志文件


