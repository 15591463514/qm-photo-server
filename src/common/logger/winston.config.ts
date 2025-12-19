import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';

/**
 * Winston 日志配置
 *
 * 功能：
 * 1. 控制台输出（彩色格式，便于开发调试）
 * 2. 文件输出（按日期轮转，JSON 格式）
 * 3. 错误日志单独文件
 * 4. 异常和拒绝处理
 */
export const winstonConfig = (
  nodeEnv: string = 'development',
  logLevel: string = 'info',
): WinstonModuleOptions => {
  const isProduction = nodeEnv === 'production';
  const logDir = join(process.cwd(), 'logs');

  // JSON 格式（用于文件输出 - 生产环境）
  const jsonFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  );

  // 友好格式（用于文件输出 - 开发环境）
  const prettyFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
      const contextStr = context ? `[${context}]` : '';
      const metaStr = Object.keys(meta).length
        ? '\n' + JSON.stringify(meta, null, 2)
        : '';
      return `${timestamp} ${level.toUpperCase()} ${contextStr} ${message}${metaStr}`;
    }),
  );

  // 控制台格式（彩色输出）
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
      const contextStr = context ? `[${context}]` : '';
      const metaStr = Object.keys(meta).length
        ? JSON.stringify(meta, null, 2)
        : '';
      return `${timestamp} ${level} ${contextStr} ${message} ${metaStr}`;
    }),
  );

  // 创建按日期轮转的文件传输
  const createDailyRotateFile = (
    filename: string,
    level: string = 'info',
  ): DailyRotateFile => {
    return new DailyRotateFile({
      filename: join(logDir, filename),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level,
      // format: isProduction ? jsonFormat : prettyFormat, // 开发环境使用友好格式
      format: jsonFormat, // 开发环境使用友好格式
    });
  };

  // 构建传输列表
  const transports: winston.transport[] = [
    // 控制台输出（彩色格式）
    new winston.transports.Console({
      level: isProduction ? 'warn' : logLevel, // 生产环境只输出警告和错误
      format: consoleFormat,
    }),
    // 所有日志文件（JSON 格式）
    createDailyRotateFile('app-%DATE%.log', 'info'),
    // 错误日志单独文件（JSON 格式）
    createDailyRotateFile('error-%DATE%.log', 'error'),
  ];

  return {
    transports,
    level: logLevel,
    exceptionHandlers: [
      createDailyRotateFile('exceptions-%DATE%.log', 'error'),
    ],
    rejectionHandlers: [
      createDailyRotateFile('rejections-%DATE%.log', 'error'),
    ],
  };
};
