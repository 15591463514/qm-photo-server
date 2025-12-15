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
 * 全局 HTTP 异常过滤器
 * 
 * 功能：
 * 1. 统一处理所有 HTTP 异常
 * 2. 将异常转换为统一的响应格式 { code, message, data }
 * 3. 处理 ValidationPipe 的错误（数组格式的 message）
 * 4. 使用 Winston 记录错误日志
 * 
 * 注意：
 * - 此过滤器处理 HttpException 及其子类（BadRequestException, UnauthorizedException 等）
 * - PrismaClientExceptionFilter 会优先处理 Prisma 相关异常
 * - 未知异常会被 NestJS 默认处理（返回 500）
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // 提取错误消息
    let message: string;
    if (typeof exceptionResponse === 'string') {
      // 简单字符串错误消息
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;
      
      // 处理 ValidationPipe 的错误格式
      // ValidationPipe 返回格式: { message: string[], error: string, statusCode: number }
      if (Array.isArray(responseObj.message)) {
        // 将数组格式的错误消息合并为字符串
        message = responseObj.message.join(', ');
      } else if (typeof responseObj.message === 'string') {
        message = responseObj.message;
      } else {
        // 如果没有 message 字段，使用异常默认消息
        message = exception.message || '请求处理失败';
      }
    } else {
      message = exception.message || '请求处理失败';
    }

    // 使用 Winston 记录错误日志
    const logData = {
      context: 'HttpExceptionFilter',
      path: request.url,
      method: request.method,
      statusCode: status,
      message,
      stack: exception.stack,
      body: request.body,
      query: request.query,
      params: request.params,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      timestamp: new Date().toISOString(),
    };

    // 根据状态码选择日志级别
    if (status >= 500) {
      this.logger.error(`HTTP ${status} Error: ${message}`, logData);
    } else if (status >= 400) {
      this.logger.warn(`HTTP ${status} Error: ${message}`, logData);
    } else {
      this.logger.info(`HTTP ${status} Error: ${message}`, logData);
    }

    // 转换为统一格式并返回
    const errorResponse = ResOp.error(status, message);
    
    response.status(status).json(errorResponse);
  }
}

