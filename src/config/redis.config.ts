import { registerAs } from '@nestjs/config';

const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.REDIS_DB || '0', 10),
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'qm_photo:',
  // 连接选项
  lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // 集群配置（如果需要）
  enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== 'false',
  enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE !== 'false',
}));

export type RedisConfig = ReturnType<typeof redisConfig>;
export default redisConfig;
