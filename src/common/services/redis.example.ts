/**
 * Redis 使用示例
 * 
 * 此文件展示了如何在 NestJS 服务中使用 Redis
 * 注意：这是一个示例文件，实际使用时请删除此文件或将其移动到文档目录
 */

import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisExampleService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * 设置字符串值
   */
  async setString(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  /**
   * 获取字符串值
   */
  async getString(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  /**
   * 删除键
   */
  async delete(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<number> {
    return await this.redis.exists(key);
  }

  /**
   * 设置过期时间（秒）
   */
  async expire(key: string, seconds: number): Promise<number> {
    return await this.redis.expire(key, seconds);
  }

  /**
   * 设置 Hash 值
   */
  async setHash(
    key: string,
    field: string,
    value: string,
  ): Promise<number> {
    return await this.redis.hset(key, field, value);
  }

  /**
   * 获取 Hash 值
   */
  async getHash(key: string, field: string): Promise<string | null> {
    return await this.redis.hget(key, field);
  }

  /**
   * 获取所有 Hash 字段和值
   */
  async getAllHash(key: string): Promise<Record<string, string>> {
    return await this.redis.hgetall(key);
  }

  /**
   * 设置 List 值（从左侧推入）
   */
  async pushList(key: string, ...values: string[]): Promise<number> {
    return await this.redis.lpush(key, ...values);
  }

  /**
   * 获取 List 值（从右侧弹出）
   */
  async popList(key: string): Promise<string | null> {
    return await this.redis.rpop(key);
  }

  /**
   * 获取 List 范围
   */
  async getListRange(
    key: string,
    start: number,
    end: number,
  ): Promise<string[]> {
    return await this.redis.lrange(key, start, end);
  }

  /**
   * 设置 Set 值
   */
  async addSet(key: string, ...members: string[]): Promise<number> {
    return await this.redis.sadd(key, ...members);
  }

  /**
   * 获取 Set 所有成员
   */
  async getSetMembers(key: string): Promise<string[]> {
    return await this.redis.smembers(key);
  }

  /**
   * 检查 Set 成员是否存在
   */
  async isSetMember(key: string, member: string): Promise<number> {
    return await this.redis.sismember(key, member);
  }

  /**
   * 设置 Sorted Set 值
   */
  async addSortedSet(
    key: string,
    score: number,
    member: string,
  ): Promise<number> {
    return await this.redis.zadd(key, score, member);
  }

  /**
   * 获取 Sorted Set 范围（按分数排序）
   */
  async getSortedSetRange(
    key: string,
    start: number,
    end: number,
  ): Promise<string[]> {
    return await this.redis.zrange(key, start, end);
  }

  /**
   * 获取 Sorted Set 范围（带分数）
   */
  async getSortedSetRangeWithScores(
    key: string,
    start: number,
    end: number,
  ): Promise<Array<{ score: number; member: string }>> {
    const results = await this.redis.zrange(key, start, end, 'WITHSCORES');
    const pairs: Array<{ score: number; member: string }> = [];
    for (let i = 0; i < results.length; i += 2) {
      pairs.push({
        member: results[i],
        score: parseFloat(results[i + 1]),
      });
    }
    return pairs;
  }

  /**
   * 缓存示例：获取或设置缓存
   */
  async getOrSetCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 3600,
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // 缓存未命中，执行获取函数
    const data = await fetchFn();

    // 设置缓存
    await this.redis.setex(key, ttl, JSON.stringify(data));

    return data;
  }

  /**
   * 分布式锁示例
   */
  async acquireLock(
    key: string,
    value: string,
    ttl: number = 10,
  ): Promise<boolean> {
    const result = await this.redis.set(key, value, 'EX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * 释放分布式锁
   */
  async releaseLock(key: string, value: string): Promise<void> {
    // Lua 脚本确保只删除自己设置的锁
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(script, 1, key, value);
  }
}

