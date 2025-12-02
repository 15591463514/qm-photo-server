# NestJS 请求-响应生命周期各阶段集成指南

## 📋 目录

- [概述](#概述)
- [完整生命周期流程图](#完整生命周期流程图)
- [各阶段详细说明](#各阶段详细说明)
  - [阶段 1: 应用启动 (main.ts)](#阶段-1-应用启动-maints)
  - [阶段 2: 中间件 (Middleware)](#阶段-2-中间件-middleware)
  - [阶段 3: 守卫 (Guard)](#阶段-3-守卫-guard)
  - [阶段 4: 拦截器 (Interceptor - Pre)](#阶段-4-拦截器-interceptor---pre)
  - [阶段 5: 管道 (Pipe)](#阶段-5-管道-pipe)
  - [阶段 6: 控制器 (Controller)](#阶段-6-控制器-controller)
  - [阶段 7: 服务 (Service)](#阶段-7-服务-service)
  - [阶段 8: 拦截器 (Interceptor - Post)](#阶段-8-拦截器-interceptor---post)
  - [阶段 9: 过滤器 (Filter)](#阶段-9-过滤器-filter)
- [集成优先级](#集成优先级)
- [注意事项](#注意事项)

---

## 概述

NestJS 的请求-响应生命周期包含多个阶段，每个阶段都有其特定的职责。正确理解和使用这些阶段，可以构建出结构清晰、功能完整、易于维护的应用程序。

本文档详细说明每个阶段应该做什么，以及如何正确集成相关功能。

---

## 完整生命周期流程图

```
客户端请求
    ↓
【main.ts 应用配置】
    ├─ trust proxy (获取真实 IP)
    ├─ CORS (跨域配置)
    ├─ Helmet (安全头)
    └─ 静态资源目录
    ↓
【中间件 Middleware】
    ├─ 全局中间件 (日志、请求ID)
    ├─ 模块中间件
    └─ 路由中间件
    ↓
【守卫 Guard】
    ├─ 速率限制守卫 (防止暴力攻击)
    ├─ JWT 认证守卫 (验证用户身份)
    ├─ 角色守卫 (验证用户角色)
    ├─ 权限守卫 (验证操作权限)
    ├─ 防重复提交守卫
    └─ 演示环境守卫 (保护写操作)
    ↓
【拦截器 Interceptor (Pre)】
    ├─ 全局拦截器 pre (性能监控开始)
    ├─ 控制器拦截器 pre
    └─ 路由拦截器 pre
    ↓
【管道 Pipe】
    ├─ 全局管道 (参数校验、类型转换)
    ├─ 控制器管道
    ├─ 路由管道
    └─ 路由参数管道
    ↓
【控制器 Controller】
    ↓
【服务 Service】
    ↓
【拦截器 Interceptor (Post)】
    ├─ 路由拦截器 post
    ├─ 控制器拦截器 post
    └─ 全局拦截器 post (响应转换、日志记录)
    ↓
【过滤器 Filter】
    ├─ 路由过滤器
    ├─ 控制器过滤器
    └─ 全局过滤器 (异常处理)
    ↓
响应返回客户端
```

---

## 各阶段详细说明

### 阶段 1: 应用启动 (main.ts)

**执行时机**: 应用启动时，在所有请求处理之前

**应做的事**:
1. ✅ 信任代理配置（获取真实 IP）
2. ✅ CORS 跨域配置
3. ✅ 安全头配置（Helmet）
4. ✅ 静态资源目录配置
5. ✅ 全局路由前缀（可选）
6. ✅ Swagger 文档配置（可选）

**代码示例**:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // ✅ 1. 信任代理（获取真实 IP）
  // 设置后，如果服务经过代理 req.ips 将是一个[]。可以获得真实ip
  app.set('trust proxy', true);

  // ✅ 2. CORS 跨域配置
  const cors = configService.get('cors');
  if (cors) {
    app.enableCors();
  }

  // ✅ 3. 安全头（Helmet）
  // 设置 HTTP 标头来帮助保护应用免受一些众所周知的 Web 漏洞的影响
  app.use(
    helmet({
      contentSecurityPolicy: false, // 取消https强制转换
    }),
  );

  // ✅ 4. 静态资源目录
  app.useStaticAssets(join(__dirname, '../static'));

  // ✅ 5. 上传文件目录（可选）
  const uploadPath = configService.get('uploadPath');
  if (uploadPath) {
    app.useStaticAssets(uploadPath);
  }

  // ✅ 6. 全局路由前缀（可选）
  // app.setGlobalPrefix('api');

  // ✅ 7. Swagger 文档（可选）
  // if (configService.get('isOpenDoc')) {
  //   setupSwagger(app);
  // }

  // 读取环境变量里的项目启动端口
  const port = configService.get('port');
  await app.listen(port);
  console.log(`应用运行在: http://localhost:${port}`);
}
bootstrap();
```

---

### 阶段 2: 中间件 (Middleware)

**执行顺序**: 全局中间件 → 模块中间件 → 路由中间件

**应做的事**:
1. ✅ 请求日志记录
2. ✅ 请求 ID 生成
3. ✅ 请求时间记录
4. ✅ 请求体解析（如需要）
5. ✅ 压缩（gzip）

**代码示例**:

```typescript
// src/common/middleware/logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // ✅ 记录请求开始时间
    req['startTime'] = Date.now();
    
    // ✅ 生成请求 ID
    req['requestId'] = nanoid();
    
    // ✅ 记录请求信息
    console.log(`[${req.method}] ${req.url} - ${req.ip} - ${req['requestId']}`);
    
    next();
  }
}

// 在模块中使用
// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 全局应用
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*');
    
    // 或指定路由
    // consumer
    //   .apply(LoggerMiddleware)
    //   .forRoutes('users', 'posts');
  }
}
```

---

### 阶段 3: 守卫 (Guard)

**执行顺序**: 全局守卫 → 控制器守卫 → 路由守卫

**应做的事**:
1. ✅ 认证（JWT Token 验证）
2. ✅ 授权（角色/权限验证）
3. ✅ 速率限制（防止暴力攻击）
4. ✅ 防重复提交
5. ✅ 演示环境保护

**代码示例**:

```typescript
// 在 SharedModule 中注册（按执行顺序）
// src/shared/shared.module.ts
import {
  APP_GUARD,
} from '@nestjs/core';
import { ThrottlerBehindProxyGuard } from 'src/common/guards/throttler-behind-proxy.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RoleAuthGuard } from 'src/common/guards/role-auth.guard';
import { PermissionAuthGuard } from 'src/common/guards/permission-auth.guard';
import { RepeatSubmitGuard } from 'src/common/guards/repeat-submit.guard';
import { DemoEnvironmentGuard } from 'src/common/guards/demo-environment.guard';

@Global()
@Module({
  providers: [
    // ✅ 1. 速率限制守卫（最先执行，防止暴力攻击）
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    
    // ✅ 2. JWT 认证守卫（验证用户身份）
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    
    // ✅ 3. 角色守卫（验证用户角色）
    {
      provide: APP_GUARD,
      useClass: RoleAuthGuard,
    },
    
    // ✅ 4. 权限守卫（验证操作权限）
    {
      provide: APP_GUARD,
      useClass: PermissionAuthGuard,
    },
    
    // ✅ 5. 防重复提交守卫
    {
      provide: APP_GUARD,
      useClass: RepeatSubmitGuard,
    },
    
    // ✅ 6. 演示环境守卫（最后执行，保护写操作）
    {
      provide: APP_GUARD,
      useClass: DemoEnvironmentGuard,
    },
  ],
})
export class SharedModule {}
```

**守卫职责说明**:

- **速率限制守卫**: 防止暴力攻击，限制单位时间内的请求次数
- **JWT 认证守卫**: 验证 Token，将用户信息挂载到 `request.user`
- **角色守卫**: 验证用户是否具有访问该接口的角色
- **权限守卫**: 验证用户是否具有操作权限
- **防重复提交守卫**: 基于 Redis 防止短时间内重复提交相同请求
- **演示环境守卫**: 在演示环境下限制写操作（增删改）

---

### 阶段 4: 拦截器 (Interceptor - Pre)

**执行顺序**: 全局拦截器 pre → 控制器拦截器 pre → 路由拦截器 pre

**应做的事**:
1. ✅ 请求参数预处理
2. ✅ 请求日志记录
3. ✅ 性能监控（开始计时）
4. ✅ 数据权限处理

**代码示例**:

```typescript
// src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // ✅ 记录请求开始时间
    const now = Date.now();
    request['startTime'] = now;
    
    // ✅ 记录请求参数
    console.log(`请求参数:`, {
      url: request.url,
      method: request.method,
      body: request.body,
      query: request.query,
      params: request.params,
      user: request.user,
    });
    
    return next.handle();
  }
}
```

---

### 阶段 5: 管道 (Pipe)

**执行顺序**: 全局管道 → 控制器管道 → 路由管道 → 路由参数管道

**应做的事**:
1. ✅ 参数校验（class-validator）
2. ✅ 类型转换（class-transformer）
3. ✅ 数据清洗（白名单）
4. ✅ 参数解析（ParseIntPipe、ParseBoolPipe 等）

**代码示例**:

```typescript
// 在 SharedModule 中注册全局管道
// src/shared/shared.module.ts
import { ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';

@Global()
@Module({
  providers: [
    // ✅ 全局参数校验管道
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,        // 自动过滤未声明的属性
        transform: true,        // 自动类型转换
        forbidNonWhitelisted: false, // 是否禁止非白名单属性
        transformOptions: {
          enableImplicitConversion: true, // 启用隐式转换
        },
      }),
    },
  ],
})
export class SharedModule {}

// DTO 示例
// src/common/dto/pagination.dto.ts
import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageNum?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 10;
}

// 路由参数管道示例
// src/modules/user/user.controller.ts
import { ParseIntPipe } from '@nestjs/common';

@Controller('users')
export class UserController {
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    // id 自动转换为 number 类型
    return this.userService.findOne(id);
  }
}
```

---

### 阶段 6: 控制器 (Controller)

**应做的事**:
1. ✅ 接收请求
2. ✅ 调用服务层
3. ✅ 返回响应

**代码示例**:

```typescript
// src/modules/user/user.controller.ts
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RequiresPermissions } from 'src/common/decorators/requires-permissions.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequiresPermissions('system:user:list')
  async findAll(@Query() query: PaginationDto) {
    // ✅ 调用服务层处理业务逻辑
    return this.userService.findAll(query);
  }

  @Post()
  @RequiresPermissions('system:user:add')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }
}
```

---

### 阶段 7: 服务 (Service)

**应做的事**:
1. ✅ 业务逻辑处理
2. ✅ 数据库操作
3. ✅ 调用其他服务
4. ✅ 数据转换

**代码示例**:

```typescript
// src/modules/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateUserDto } from './dto/create-user.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll(query: PaginationDto) {
    // ✅ 业务逻辑处理
    const { pageNum, pageSize } = query;
    
    // ✅ 数据库查询
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count(),
    ]);
    
    // ✅ 返回数据
    return { list: data, total };
  }

  async create(createUserDto: CreateUserDto) {
    // ✅ 业务逻辑处理
    // ✅ 数据转换
    // ✅ 数据库操作
    return this.prisma.user.create({
      data: createUserDto,
    });
  }
}
```

---

### 阶段 8: 拦截器 (Interceptor - Post)

**执行顺序**: 路由拦截器 post → 控制器拦截器 post → 全局拦截器 post

**⚠️ 重要**: 拦截器 post 阶段的执行顺序是**从下往上**，即最后注册的先执行。

**应做的事**:
1. ✅ 响应数据转换（统一格式）
2. ✅ 操作日志记录
3. ✅ 性能监控（计算耗时）
4. ✅ 响应数据加密（如需要）

**代码示例**:

```typescript
// 在 SharedModule 中注册（注意顺序：从下往上执行）
// src/shared/shared.module.ts
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OperationLogInterceptor } from 'src/common/interceptors/operation-log.interceptor';
import { ReponseTransformInterceptor } from 'src/common/interceptors/reponse-transform.interceptor';

@Global()
@Module({
  providers: [
    /**
     * 注：拦截器中的 handle 从下往上执行
     * （ReponseTransformInterceptor ----> OperationLogInterceptor）
     * 返回值依次传递
     */
    
    // ✅ 1. 操作日志记录拦截器（先执行，记录原始数据）
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationLogInterceptor,
    },
    
    // ✅ 2. 全局返回值转化拦截器（后执行，转换响应格式）
    {
      provide: APP_INTERCEPTOR,
      useClass: ReponseTransformInterceptor,
    },
  ],
})
export class SharedModule {}

// 响应转换拦截器
// src/common/interceptors/reponse-transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AjaxResult } from '../class/ajax-result.class';
import { KEEP_KEY } from '../contants/decorator.contant';

@Injectable()
export class ReponseTransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 检查是否需要保持原始响应格式
        const keep = this.reflector.getAllAndOverride<boolean>(KEEP_KEY, [
          context.getHandler(),
          context.getClass(),
        ]);
        if (keep) return data;
        
        // ✅ 统一响应格式
        const response = context.switchToHttp().getResponse();
        response.header('Content-Type', 'application/json; charset=utf-8');
        return AjaxResult.success(data);
      }),
    );
  }
}

// 操作日志拦截器
// src/common/interceptors/operation-log.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LogOption } from '../decorators/log.decorator';
import dayjs from 'dayjs';

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(
    private readonly operLogService: OperLogService,
  ) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logOption = this.reflector.get<LogOption>(
      LOG_KEY_METADATA,
      context.getHandler(),
    );
    
    if (!logOption) {
      return next.handle();
    }
    
    const startTime = dayjs();
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      tap({
        next: (data) => {
          // ✅ 记录操作日志（异步，不阻塞响应）
          this.log(context, data, logOption, startTime);
        },
        error: (err) => {
          // ✅ 记录错误日志
          this.log(context, err, logOption, startTime);
        },
      }),
    );
  }
  
  private async log(context, data, logOption, startTime) {
    const request = context.switchToHttp().getRequest();
    const costTime = dayjs().diff(startTime, 'millisecond');
    
    // 记录操作日志
    await this.operLogService.record({
      title: logOption.title,
      url: request.url,
      method: request.method,
      costTime,
      status: 'success',
      // ... 其他信息
    });
  }
}
```

---

### 阶段 9: 过滤器 (Filter)

**执行顺序**: 路由过滤器 → 控制器过滤器 → 全局过滤器

**应做的事**:
1. ✅ 异常捕获和处理
2. ✅ 统一错误响应格式
3. ✅ 错误日志记录
4. ✅ 错误通知（如需要）

**代码示例**:

```typescript
// 在 SharedModule 中注册全局过滤器
// src/shared/shared.module.ts
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from 'src/common/filters/all-exception.filter';

@Global()
@Module({
  providers: [
    // ✅ 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class SharedModule {}

// 异常过滤器
// src/common/filters/all-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AjaxResult } from '../class/ajax-result.class';
import { ApiException } from '../exceptions/api.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    
    // ✅ 解析异常类型
    const { status, result } = this.errorResult(exception);
    
    // ✅ 记录错误日志
    console.error('异常捕获:', exception);
    
    // ✅ 返回统一错误格式
    response.header('Content-Type', 'application/json; charset=utf-8');
    response.status(status).json(result);
  }

  /* 解析错误类型，获取状态码和返回值 */
  errorResult(exception: unknown) {
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const code =
      exception instanceof ApiException
        ? (exception as ApiException).getErrCode()
        : status;

    let message: string;
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      message = (response as any).message ?? response;
    } else {
      message = `${exception}`;
    }
    
    return {
      status,
      result: AjaxResult.error(message, code),
    };
  }
}
```

---

## 集成优先级

### 🔴 必须集成（核心功能）

这些功能是构建一个完整应用的基础，必须优先集成：

1. **全局异常过滤器** - 统一异常处理
2. **全局参数校验管道** - 数据验证和类型转换
3. **响应转换拦截器** - 统一响应格式
4. **配置管理模块** - 环境配置管理

### 🟡 建议集成（安全功能）

这些功能提供安全保障，强烈建议集成：

5. **JWT 认证守卫** - 用户身份验证
6. **速率限制守卫** - 防止暴力攻击
7. **Helmet 安全头** - HTTP 安全防护
8. **CORS 配置** - 跨域资源共享

### 🟢 可选集成（增强功能）

这些功能可以增强应用的功能和可维护性：

9. **操作日志拦截器** - 记录操作日志
10. **防重复提交守卫** - 防止重复提交
11. **角色/权限守卫** - 细粒度权限控制
12. **请求日志中间件** - 请求追踪

---

## 注意事项

### 1. 执行顺序

- **守卫**: 按注册顺序执行
- **拦截器 post**: 从下往上执行（最后注册的先执行）
- **过滤器**: 按注册顺序执行

### 2. 性能考虑

- 在拦截器中记录耗时，避免影响响应速度
- 日志记录应该异步进行，不阻塞响应
- 避免在守卫中进行复杂的数据库查询

### 3. 异常处理

- 过滤器应该捕获所有异常，返回统一格式
- 使用自定义异常类（ApiException）提供更详细的错误信息
- 记录详细的错误日志，便于排查问题

### 4. 日志记录

- **中间件**: 记录请求信息（URL、方法、IP等）
- **拦截器**: 记录响应信息（状态码、耗时等）
- **过滤器**: 记录异常信息（错误类型、堆栈等）

### 5. 配置管理

- 全局配置在 `main.ts` 中设置
- 模块级配置在 `SharedModule` 中注册
- 使用 `ConfigModule` 统一管理配置

### 6. 响应格式

- 使用拦截器统一响应格式
- 提供 `@Keep()` 装饰器跳过格式转换
- 错误响应也要统一格式

### 7. 安全最佳实践

- 始终使用 Helmet 设置安全头
- 在生产环境关闭 CORS 或严格配置
- 使用速率限制防止暴力攻击
- 验证和清理所有用户输入

---

## 总结

正确理解和使用 NestJS 的生命周期各阶段，可以构建出：

- ✅ **结构清晰** - 职责分明，易于维护
- ✅ **功能完整** - 涵盖认证、授权、日志、异常处理等
- ✅ **安全可靠** - 多层安全防护
- ✅ **性能优化** - 合理的性能监控和优化
- ✅ **易于扩展** - 模块化设计，便于扩展

按照本文档的指南，可以逐步构建一个生产级别的 NestJS 应用。

---

## 参考资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [NestJS 生命周期](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [NestJS 中间件](https://docs.nestjs.com/middleware)
- [NestJS 守卫](https://docs.nestjs.com/guards)
- [NestJS 拦截器](https://docs.nestjs.com/interceptors)
- [NestJS 管道](https://docs.nestjs.com/pipes)
- [NestJS 异常过滤器](https://docs.nestjs.com/exception-filters)

---

**文档更新时间**: 2024年

**作者**: 项目团队


