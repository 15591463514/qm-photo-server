# Redis 集成笔记

## 📝 集成步骤记录

### 1. 安装依赖

```bash
pnpm add @nestjs-modules/ioredis ioredis
```

**版本：**

- `@nestjs-modules/ioredis`: 2.0.2
- `ioredis`: 5.8.2

### 2. 创建 Redis 配置文件

**文件位置：** `src/config/redis.config.ts`

**功能：**

- 使用 `@nestjs/config` 的 `registerAs` 注册配置命名空间
- 从环境变量读取 Redis 配置
- 导出 TypeScript 类型定义

**关键代码：**

```typescript
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
```

**关键点：**

- 使用 `ReturnType<typeof redisConfig>` 自动推导类型，避免手动维护接口
- 配置项都有默认值，确保配置的健壮性
- `retryStrategy` 实现指数退避重试策略

### 3. 在 SharedModule 中集成 Redis 模块

**文件位置：** `src/shared/shared.module.ts`

**功能：**

- 将 Redis 模块配置为全局模块
- 使用 `ConfigService` 动态读取配置
- 支持密码认证和连接选项

**关键代码：**

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import redisConfig, { RedisConfig } from '../config/redis.config';

@Global()
@Module({
  imports: [
    // 配置模块（需要先加载）
    ConfigModule.forRoot({
      isGlobal: true,
      load: [redisConfig], // 添加 redisConfig
      envFilePath: ['.env', `.env.${process.env.NODE_ENV || 'development'}`],
      expandVariables: true,
    }),
    // Redis 模块
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>('redis');
        return {
          type: 'single',
          url: `redis://${redis.password}@${redis.host}:${redis.port}/${redis.db}`,
          options: redis,
        };
      },
    }),
  ],
  exports: [ConfigModule, RedisModule],
})
export class SharedModule {}
```

**关键点：**

- 使用 `forRootAsync` 异步配置，支持依赖注入
- 通过 `configService.get<RedisConfig>('redis')` 获取类型安全的配置
- `options: redis` 直接传递配置对象，简化配置
- Redis 模块设置为全局模块，其他模块无需导入即可使用

### 4. 配置环境变量

#### `.env` 文件（公共配置）

```env
# 【Redis配置】
# Redis 主机地址
REDIS_HOST=localhost
# Redis 端口
REDIS_PORT=6379
# Redis 数据库编号
REDIS_DB=0
# Redis 键前缀
REDIS_KEY_PREFIX=qm_photo:
```

#### `.env.development` 文件（开发环境）

```env
# 【Redis配置】
# Redis 密码
REDIS_PASSWORD=123456
# Redis 连接超时时间（毫秒）
REDIS_CONNECT_TIMEOUT=10000
# Redis 延迟连接
REDIS_LAZY_CONNECT=false
# Redis 最大重试次数
REDIS_MAX_RETRIES=3
# Redis 启用就绪检查
REDIS_ENABLE_READY_CHECK=true
# Redis 启用离线队列
REDIS_ENABLE_OFFLINE_QUEUE=true
```

#### `.env.production` 文件（生产环境）

```env
# 【Redis配置】
# Redis 密码
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
# Redis 连接超时时间（毫秒）
REDIS_CONNECT_TIMEOUT=10000
# Redis 延迟连接
REDIS_LAZY_CONNECT=false
# Redis 最大重试次数
REDIS_MAX_RETRIES=3
# Redis 启用就绪检查
REDIS_ENABLE_READY_CHECK=true
# Redis 启用离线队列
REDIS_ENABLE_OFFLINE_QUEUE=true
```

**配置说明：**

| 环境变量                     | 说明                             | 默认值      |
| ---------------------------- | -------------------------------- | ----------- |
| `REDIS_HOST`                 | Redis 服务器地址                 | `localhost` |
| `REDIS_PORT`                 | Redis 服务器端口                 | `6379`      |
| `REDIS_PASSWORD`             | Redis 密码（可选）               | 空字符串    |
| `REDIS_DB`                   | Redis 数据库编号                 | `0`         |
| `REDIS_KEY_PREFIX`           | 键前缀（所有键会自动添加此前缀） | `qm_photo:` |
| `REDIS_CONNECT_TIMEOUT`      | 连接超时时间（毫秒）             | `10000`     |
| `REDIS_LAZY_CONNECT`         | 延迟连接（首次使用时连接）       | `false`     |
| `REDIS_MAX_RETRIES`          | 最大重试次数                     | `3`         |
| `REDIS_ENABLE_READY_CHECK`   | 启用就绪检查                     | `true`      |
| `REDIS_ENABLE_OFFLINE_QUEUE` | 启用离线队列                     | `true`      |

### 5. Docker 配置（可选）

#### `docker-compose.dev.yml`（开发环境）

```yaml
services:
  # Redis 服务（开发环境）
  redis-dev:
    image: redis:7-alpine
    container_name: qm-photo-redis-dev
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD:-} --appendonly yes
    ports:
      - '${REDIS_PORT:-6379}:6379'
    volumes:
      - redis-data-dev:/data
    networks:
      - qm-photo-network-dev
    healthcheck:
      test: ['CMD', 'redis-cli', '-a', '${REDIS_PASSWORD:-}', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  redis-data-dev:
    driver: local

networks:
  qm-photo-network-dev:
    driver: bridge
```

#### `docker-compose.yml`（生产环境）

```yaml
services:
  # Redis 服务
  redis:
    image: redis:7-alpine
    container_name: qm-photo-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD:-} --appendonly yes
    ports:
      - '${REDIS_PORT:-6379}:6379'
    volumes:
      - redis-data:/data
    networks:
      - qm-photo-network
    healthcheck:
      test: ['CMD', 'redis-cli', '-a', '${REDIS_PASSWORD:-}', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5

  # 应用服务
  app:
    # ... 其他配置
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
      - REDIS_DB=${REDIS_DB:-0}
    depends_on:
      redis:
        condition: service_healthy

volumes:
  redis-data:
    driver: local
```

**关键点：**

- 使用 `redis:7-alpine` 镜像，体积小
- `--requirepass` 设置密码
- `--appendonly yes` 启用 AOF 持久化
- 健康检查使用密码认证
- 数据卷持久化 Redis 数据

### 6. 在服务中使用 Redis

**基本使用：**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class YourService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async someMethod() {
    // 设置值
    await this.redis.set('key', 'value');

    // 设置值并指定过期时间（秒）
    await this.redis.setex('key', 3600, 'value');

    // 获取值
    const value = await this.redis.get('key');

    // 删除键
    await this.redis.del('key');
  }
}
```

**缓存模式示例：**

```typescript
@Injectable()
export class CacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * 获取或设置缓存
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
   * 更新缓存
   */
  async updateCache(key: string, data: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  /**
   * 删除缓存
   */
  async invalidateCache(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * 批量删除缓存（使用模式匹配）
   */
  async invalidateCachePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

**分布式锁示例：**

```typescript
@Injectable()
export class LockService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * 获取分布式锁
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

  /**
   * 使用示例
   */
  async doSomethingWithLock() {
    const lockKey = 'lock:resource:123';
    const lockValue = `${Date.now()}-${Math.random()}`;
    const acquired = await this.acquireLock(lockKey, lockValue, 30);

    if (acquired) {
      try {
        // 执行业务逻辑
      } finally {
        await this.releaseLock(lockKey, lockValue);
      }
    }
  }
}
```

**常用操作示例：**

```typescript
@Injectable()
export class RedisOperationsService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  // ========== 字符串操作 ==========
  async setString(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async getString(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  // ========== Hash 操作 ==========
  async setHash(key: string, field: string, value: string): Promise<number> {
    return await this.redis.hset(key, field, value);
  }

  async getHash(key: string, field: string): Promise<string | null> {
    return await this.redis.hget(key, field);
  }

  async getAllHash(key: string): Promise<Record<string, string>> {
    return await this.redis.hgetall(key);
  }

  // ========== List 操作 ==========
  async pushList(key: string, ...values: string[]): Promise<number> {
    return await this.redis.lpush(key, ...values);
  }

  async popList(key: string): Promise<string | null> {
    return await this.redis.rpop(key);
  }

  async getListRange(
    key: string,
    start: number,
    end: number,
  ): Promise<string[]> {
    return await this.redis.lrange(key, start, end);
  }

  // ========== Set 操作 ==========
  async addSet(key: string, ...members: string[]): Promise<number> {
    return await this.redis.sadd(key, ...members);
  }

  async getSetMembers(key: string): Promise<string[]> {
    return await this.redis.smembers(key);
  }

  async isSetMember(key: string, member: string): Promise<number> {
    return await this.redis.sismember(key, member);
  }

  // ========== Sorted Set 操作 ==========
  async addSortedSet(
    key: string,
    score: number,
    member: string,
  ): Promise<number> {
    return await this.redis.zadd(key, score, member);
  }

  async getSortedSetRange(
    key: string,
    start: number,
    end: number,
  ): Promise<string[]> {
    return await this.redis.zrange(key, start, end);
  }
}
```

---

## 🚀 如何快速集成到其他项目

### 步骤 1：复制配置文件

1. **复制 Redis 配置文件**

   ```bash
   # 复制配置文件
   cp src/config/redis.config.ts <新项目>/src/config/redis.config.ts
   ```

2. **更新 SharedModule**
   - 在 `src/shared/shared.module.ts` 中导入 `redisConfig`
   - 在 `ConfigModule.forRoot` 的 `load` 数组中添加 `redisConfig`
   - 添加 `RedisModule.forRootAsync` 配置

### 步骤 2：安装依赖

```bash
pnpm add @nestjs-modules/ioredis ioredis
```

### 步骤 3：配置环境变量

在 `.env`、`.env.development`、`.env.production` 文件中添加 Redis 配置（参考上面的环境变量配置部分）。

### 步骤 4：Docker 配置（可选）

如果需要 Docker 支持，在 `docker-compose.yml` 中添加 Redis 服务配置（参考上面的 Docker 配置部分）。

### 步骤 5：验证集成

创建测试服务验证 Redis 连接：

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisTestService implements OnModuleInit {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async onModuleInit() {
    try {
      await this.redis.set('test', 'Redis is working!');
      const value = await this.redis.get('test');
      console.log('✅ Redis connection successful:', value);
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
    }
  }
}
```

---

## ✅ 配置检查清单

集成完成后，请检查以下项目：

- [ ] 已安装 `@nestjs-modules/ioredis` 和 `ioredis` 依赖
- [ ] 已创建 `src/config/redis.config.ts` 配置文件
- [ ] 已在 `SharedModule` 中导入 `redisConfig`
- [ ] 已在 `ConfigModule.forRoot` 的 `load` 数组中添加 `redisConfig`
- [ ] 已配置 `RedisModule.forRootAsync`
- [ ] 已在 `.env` 文件中添加 Redis 公共配置
- [ ] 已在 `.env.development` 文件中添加 Redis 开发环境配置
- [ ] 已在 `.env.production` 文件中添加 Redis 生产环境配置
- [ ] 如使用 Docker，已在 `docker-compose.yml` 中添加 Redis 服务
- [ ] Redis 服务可以正常连接和操作

---

## 🐛 常见问题

### Q1: Redis 连接失败怎么办？

**检查清单：**

1. 确认 Redis 服务是否启动
2. 检查 `REDIS_HOST` 和 `REDIS_PORT` 配置是否正确
3. 检查防火墙设置
4. 如果使用密码，确认 `REDIS_PASSWORD` 配置正确
5. 如果使用 Docker，确认容器是否正常运行

**调试命令：**

```bash
# 检查 Redis 是否运行
docker ps | grep redis

# 查看 Redis 日志
docker logs qm-photo-redis-dev

# 测试 Redis 连接
redis-cli -h localhost -p 6379 -a 123456 ping
```

### Q2: TypeScript 类型错误

如果遇到类型错误，确保：

1. 已正确导入 `RedisConfig` 类型
2. 使用 `configService.get<RedisConfig>('redis')` 获取配置
3. `redis.config.ts` 中已导出类型：`export type RedisConfig = ReturnType<typeof redisConfig>;`

### Q3: 键前缀不生效

确认：

1. `REDIS_KEY_PREFIX` 环境变量已配置
2. 在 `RedisModule.forRootAsync` 的 `options` 中包含了 `keyPrefix`
3. 使用 `redis.set('key', 'value')` 时，实际存储的键是 `{prefix}key`

### Q4: Docker 中 Redis 连接失败

检查：

1. Docker 网络配置是否正确
2. 应用服务中的 `REDIS_HOST` 是否设置为容器名称（如 `redis`）
3. Redis 容器的健康检查是否通过
4. 应用服务的 `depends_on` 配置是否正确

### Q5: 密码认证失败

确认：

1. Redis 服务端密码配置：`--requirepass ${REDIS_PASSWORD}`
2. 客户端连接 URL 格式：`redis://${password}@${host}:${port}/${db}`
3. 环境变量 `REDIS_PASSWORD` 是否正确设置

---

## 💡 关键要点

1. **类型安全**
   - 使用 `ReturnType<typeof redisConfig>` 自动推导类型
   - 在 `configService.get<RedisConfig>('redis')` 中使用泛型指定类型

2. **配置管理**
   - 公共配置放在 `.env`
   - 环境特定配置放在 `.env.{environment}`
   - 使用 `ConfigModule` 统一管理配置

3. **全局模块**
   - Redis 模块设置为全局模块，其他模块无需导入即可使用
   - 通过 `@InjectRedis()` 装饰器注入 Redis 实例

4. **错误处理**
   - 监听 Redis 连接错误事件
   - 实现重试策略
   - 使用健康检查确保服务可用

5. **最佳实践**
   - 使用键前缀避免键冲突
   - 为缓存设置合理的过期时间
   - 使用分布式锁处理并发问题
   - 避免在生产环境使用 `KEYS *` 命令

---

## 📚 参考资源

- [ioredis 官方文档](https://github.com/redis/ioredis)
- [@nestjs-modules/ioredis 文档](https://github.com/nest-modules/ioredis)
- [Redis 命令参考](https://redis.io/commands)
- 项目使用指南：`md/Redis使用指南.md`
- 项目示例代码：`src/common/services/redis.example.ts`

---

## 📝 集成时间估算

- **基础集成**：15-20 分钟
  - 安装依赖：2 分钟
  - 创建配置文件：5 分钟
  - 集成到 SharedModule：5 分钟
  - 配置环境变量：3 分钟
  - 测试验证：5 分钟

- **Docker 集成**：额外 10 分钟
  - 配置 docker-compose：5 分钟
  - 测试 Docker 环境：5 分钟

**总计：** 约 25-30 分钟完成完整集成
