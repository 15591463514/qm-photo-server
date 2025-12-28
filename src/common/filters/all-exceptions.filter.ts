import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Response } from 'express';
import { ResOp } from '../class/api-response.class';

/**
 * 全局所有异常过滤器
 *
 * 功能：
 * 1. 捕获所有未处理的异常（包括非 HTTP 异常）
 * 2. 将异常转换为统一的响应格式 { code, message, data }
 * 3. 使用 Winston 记录错误日志
 * 4. 防止敏感信息泄露
 *
 * 日志策略：
 * - 只记录程序运行异常（500及以上状态码）
 * - 不记录业务逻辑错误：401（未授权/token过期）、403（权限不足）、404（资源不存在）
 * - 不记录静默404路径（浏览器插件、扫描工具等请求的无效路径）
 *
 * 注意：
 * - 此过滤器作为最后一道防线，捕获所有未被其他过滤器处理的异常
 * - 生产环境不返回详细的错误堆栈信息
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // 判断异常类型
    let status: number;
    let message: string;

    if (exception instanceof HttpException) {
      // HTTP 异常（理论上应该被 HttpExceptionFilter 处理，但作为兜底）
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as any;
        if (Array.isArray(responseObj.message)) {
          message = responseObj.message.join(', ');
        } else {
          message = responseObj.message || exception.message;
        }
      } else {
        message = exception.message;
      }
    } else {
      // 未知异常（如运行时错误、数据库连接错误等）
      status = HttpStatus.INTERNAL_SERVER_ERROR;

      // 根据环境决定是否返回详细错误信息
      const nodeEnv = process.env.NODE_ENV || 'development';
      if (nodeEnv === 'production') {
        message = '服务器内部错误，请稍后重试';
      } else {
        message =
          exception instanceof Error ? exception.message : String(exception);
      }
    }

    // 定义不需要记录日志的HTTP状态码（业务逻辑错误，非程序异常）
    // 401: 未授权（token过期等）
    // 403: 禁止访问（权限不足）
    // 404: 资源不存在
    const noLogStatusCodes = [
      HttpStatus.UNAUTHORIZED,
      HttpStatus.FORBIDDEN,
      HttpStatus.NOT_FOUND,
    ];

    // 检查是否为需要静默处理的404路径
    const isSilent404 = status === HttpStatus.NOT_FOUND;

    // 判断是否需要记录日志
    // 只记录程序运行异常（500及以上），排除业务逻辑错误和静默路径
    const shouldLog =
      status >= HttpStatus.INTERNAL_SERVER_ERROR &&
      !noLogStatusCodes.includes(status) &&
      !isSilent404;

    if (shouldLog) {
      // 程序运行异常，必须记录
      const logData = {
        context: 'AllExceptionsFilter',
        path: request.url,
        method: request.method,
        statusCode: status,
        message,
        stack: exception instanceof Error ? exception.stack : undefined,
        exception:
          exception instanceof Error ? exception.name : typeof exception,
        exceptionMessage:
          exception instanceof Error ? exception.message : String(exception),
        body: request.body,
        query: request.query,
        params: request.params,
        ip: request.ip,
        userAgent: request.get('user-agent'),
        timestamp: new Date().toISOString(),
      };
      this.logger.error(`Unhandled Exception: ${message}`, logData);
    }

    // 转换为统一格式并返回
    const errorResponse = ResOp.error(status, message);

    response.status(status).json(errorResponse);
  }
}
