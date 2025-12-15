import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';

/**
 * Winston 日志配置
 * 
 * 功能：
 * 1. 控制台输出（开发环境）
 * 2. 文件输出（按日期轮转）
 * 3. 错误日志单独文件
 * 4. 日志格式统一
 */
export const winstonConfig = (
  nodeEnv: string = 'development',
  logLevel: string = 'info',
): WinstonModuleOptions => {
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';

  // 日志目录
  const logDir = join(process.cwd(), 'logs');

  // 通用日志格式
  const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  );

  // 控制台格式（开发环境使用彩色输出）
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
      const contextStr = context ? `[${context}]` : '';
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} ${level} ${contextStr} ${message} ${metaStr}`;
    }),
  );

  // 文件格式（生产环境使用 JSON 格式）
  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  );

  // 通用文件传输配置
  const createDailyRotateFile = (
    filename: string,
    level: string = 'info',
  ): DailyRotateFile => {
    return new DailyRotateFile({
      filename: join(logDir, filename),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true, // 压缩旧日志
      maxSize: '20m', // 单个文件最大 20MB
      maxFiles: '14d', // 保留 14 天的日志
      level,
      format: fileFormat,
    });
  };

  const transports: winston.transport[] = [];

  // 开发环境：控制台输出
  if (isDevelopment) {
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: consoleFormat,
      }),
    );
  }

  // 生产环境：文件输出
  if (isProduction) {
    // 所有日志
    transports.push(createDailyRotateFile('app-%DATE%.log', 'info'));

    // 错误日志单独文件
    transports.push(createDailyRotateFile('error-%DATE%.log', 'error'));

    // 控制台输出（生产环境也输出，但使用 JSON 格式）
    transports.push(
      new winston.transports.Console({
        level: 'warn', // 生产环境只输出警告和错误
        format: fileFormat,
      }),
    );
  } else {
    // 非生产环境也输出到文件（便于调试）
    transports.push(createDailyRotateFile('app-%DATE%.log', 'info'));
    transports.push(createDailyRotateFile('error-%DATE%.log', 'error'));
  }

  return {
    transports,
    // 全局日志级别
    level: logLevel,
    // 异常处理
    exceptionHandlers: [
      new DailyRotateFile({
        filename: join(logDir, 'exceptions-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
      }),
    ],
    // 拒绝处理（处理被拒绝的 Promise）
    rejectionHandlers: [
      new DailyRotateFile({
        filename: join(logDir, 'rejections-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: fileFormat,
      }),
    ],
  };
};

