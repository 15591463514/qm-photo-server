import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// 扩展 dayjs 插件
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 日期时间工具函数
 * 使用 dayjs 进行时间转换
 */

/**
 * 将 UTC 时间转换为本地时间（UTC+8，中国时区）
 * @param date UTC 时间（Date 对象或字符串）
 * @returns 本地时间字符串（格式：YYYY-MM-DD HH:mm:ss）
 *
 * 说明：
 * - 数据库存储的是 UTC 时间
 * - 此函数将 UTC 时间转换为中国本地时间（UTC+8）
 * - 返回简单易用的时间格式：YYYY-MM-DD HH:mm:ss（如：2025-01-01 08:00:00）
 */
export function utcToLocal(
  date: Date | string | null | undefined,
): string | null {
  if (!date) {
    return null;
  }

  try {
    // 使用 dayjs 将 UTC 时间转换为中国时区（Asia/Shanghai）
    const localDate = dayjs(date).utc().tz('Asia/Shanghai');

    if (!localDate.isValid()) {
      return null;
    }

    // 返回简单的时间格式：YYYY-MM-DD HH:mm:ss
    return localDate.format('YYYY-MM-DD HH:mm:ss');
  } catch {
    return null;
  }
}

/**
 * 将 Date 对象转换为本地时间字符串
 * @param date Date 对象
 * @returns 本地时间字符串（格式：YYYY-MM-DD HH:mm:ss）
 */
export function dateToLocalString(
  date: Date | string | null | undefined,
): string | null {
  return utcToLocal(date);
}

/**
 * 将值转换为 Date 对象
 * 用于处理从 Redis 缓存中获取的数据，Date 字段可能被序列化为字符串
 * @param value 可能是 Date 对象、字符串或 null/undefined
 * @returns Date 对象，如果输入为 null/undefined 则返回 null
 */
export function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    // 检查是否为有效日期
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}
