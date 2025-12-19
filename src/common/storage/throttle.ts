import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import {
  getRedisKey,
  THROTTLE_RECORD_KEY,
} from '../constants/redis-key.constants';

/**
 * Redis 限流存储适配器
 * 使用 cacheManager 将限流数据存储在 Redis 中，设置 7 天过期时间
 */
@Injectable()
export class CacheThrottlerStorage implements ThrottlerStorage {
  private readonly defaultTtl = 5 * 1000; // 5 秒（毫秒）

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    // 使用 key + throttlerName 作为完整的 Redis key
    const redisKey = `${key}:${throttlerName}`;

    // 从缓存获取当前计数
    const cached = await this.cacheManager.get<number>(redisKey);
    const count = cached ?? 0;

    // 如果超过限制，返回封禁信息
    if (count >= limit) {
      console.log('触发了限流策略', key, count, limit);
      // 设置过期时间
      const expireTime = Math.min(ttl, this.defaultTtl);
      const timeToExpire = Math.floor(expireTime / 1000); // 转换为秒

      // 当触发了限流策略，记录一份数据到redis，一周后过期
      await this.cacheManager.set(
        getRedisKey(THROTTLE_RECORD_KEY, key),
        count + 1,
        7 * 24 * 60 * 60 * 1000,
      );

      return {
        totalHits: count + 1,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire: blockDuration ? Math.floor(blockDuration / 1000) : 0,
      };
    }

    // 增加计数
    const newCount = count + 1;

    // 设置过期时间
    const expireTime = Math.min(ttl, this.defaultTtl);

    // 存储到 Redis，设置过期时间（cache-manager 的 set 方法 TTL 单位是毫秒）
    await this.cacheManager.set(redisKey, newCount, expireTime);

    return {
      totalHits: newCount,
      timeToExpire: Math.floor(expireTime / 1000), // 转换为秒
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
