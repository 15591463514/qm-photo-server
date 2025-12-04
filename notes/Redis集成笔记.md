# Redis 集成笔记

## 📝 集成步骤记录

### 1. 安装依赖

```bash
# 基础依赖
pnpm add @nestjs/cache-manager cache-manager

# Redis 存储适配器（cache-manager@6+ 需要使用 keyv）
pnpm add @keyv/redis keyv
```

**版本：**

- `@nestjs/cache-manager`: 3.0.1（NestJS 官方缓存模块）
- `cache-manager`: 7.2.5（缓存管理器，v6+ 版本）
- `@keyv/redis`: 5.1.4（Redis 存储适配器，基于 keyv）
- `keyv`: 5.5.4（键值存储抽象层）

**说明：**

- `@nestjs/cache-manager` 是 NestJS 官方提供的缓存模块，基于 `cache-manager` 构建
- `cache-manager@6+` 需要使用 `keyv` 作为存储抽象层
- `@keyv/redis` 提供 Redis 作为 keyv 的存储后端
- 这种架构提供了更好的灵活性和可扩展性

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
  // Cache Manager 配置
  ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 默认过期时间（秒）
  max: parseInt(process.env.REDIS_MAX || '100', 10), // 最大缓存项数
  // ioredis 连接选项
  lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
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
- `ttl` 和 `max` 是 Cache Manager 的配置项

### 3. 在 SharedModule 中集成 Cache Manager 模块

**文件位置：** `src/shared/shared.module.ts`

**功能：**

- 将 Cache Manager 模块配置为全局模块
- 使用 `ConfigService` 动态读取配置
- 使用 `cache-manager-ioredis-yet` 作为 Redis 存储后端
- 支持密码认证和连接选项

**关键代码：**

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import Keyv from 'keyv';
import KeyvRedis from '@keyv/redis';
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
    // Cache Manager 模块（使用 Redis 作为存储，基于 keyv）
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redis = configService.get<RedisConfig>('redis');
        // 构建 Redis 连接 URL
        const redisUrl = `redis://${redis.password ? `:${redis.password}@` : ''}${redis.host}:${redis.port}/${redis.db}`;

        // 使用 keyv 和 @keyv/redis 作为存储后端
        const keyvRedis = new KeyvRedis(redisUrl);

        return {
          store: new Keyv({
            store: keyvRedis,
            namespace: redis.keyPrefix, // 使用 keyPrefix 作为命名空间
            ttl: redis.ttl * 1000, // 转换为毫秒
          }),
          ttl: redis.ttl * 1000, // 默认过期时间（毫秒）
          max: redis.max, // 最大缓存项数
        };
      },
      isGlobal: true,
    }),
  ],
  exports: [ConfigModule, RedisModule],
})
export class SharedModule {}
```

**关键点：**

- 使用 `forRootAsync` 异步配置，支持依赖注入
- 通过 `configService.get<RedisConfig>('redis')` 获取类型安全的配置
- 使用 `keyv` 和 `@keyv/redis` 作为存储后端（cache-manager@6+ 的要求）
- `namespace` 用于设置键前缀，替代原来的 `keyPrefix`
- Cache Manager 模块设置为全局模块，其他模块无需导入即可使用

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
# Redis 默认过期时间（秒）
REDIS_TTL=3600
# Redis 最大缓存项数
REDIS_MAX=100
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
# Redis 默认过期时间（秒）
REDIS_TTL=3600
# Redis 最大缓存项数
REDIS_MAX=100
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
| `REDIS_TTL`                  | 默认过期时间（秒）               | `3600`      |
| `REDIS_MAX`                  | 最大缓存项数                     | `100`       |
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

### 6. 在服务中使用 Cache Manager

**基本使用：**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class YourService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async someMethod() {
    // 设置缓存（使用默认 TTL）
    await this.cacheManager.set('key', 'value');

    // 设置缓存并指定过期时间（毫秒）
    await this.cacheManager.set('key', 'value', 3600 * 1000);

    // 获取缓存
    const value = await this.cacheManager.get<string>('key');

    // 删除缓存
    await this.cacheManager.del('key');

    // 清空所有缓存
    await this.cacheManager.reset();
  }
}
```

**缓存模式示例：**

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * 获取或设置缓存（最常用的缓存模式）
   */
  async getOrSetCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = await this.cacheManager.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // 缓存未命中，执行获取函数
    const data = await fetchFn();

    // 设置缓存（ttl 单位为毫秒）
    await this.cacheManager.set(key, data, ttl ? ttl * 1000 : undefined);

    return data;
  }

  /**
   * 更新缓存
   */
  async updateCache(key: string, data: any, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, data, ttl ? ttl * 1000 : undefined);
  }

  /**
   * 删除缓存
   */
  async invalidateCache(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * 清空所有缓存
   */
  async resetCache(): Promise<void> {
    await this.cacheManager.reset();
  }

  /**
   * 检查缓存是否存在
   */
  async hasCache(key: string): Promise<boolean> {
    const value = await this.cacheManager.get(key);
    return value !== undefined;
  }
}
```

**使用装饰器缓存方法结果：**

```typescript
import { Injectable } from '@nestjs/common';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';

@Injectable()
export class UserService {
  // 使用装饰器自动缓存方法结果
  @CacheKey('user-list')
  @CacheTTL(3600) // 缓存 1 小时
  async getUserList(): Promise<User[]> {
    // 这个方法的结果会被自动缓存
    return await this.userRepository.find();
  }
}
```

**注意：** Cache Manager 主要提供简单的 key-value 缓存接口，适合缓存对象、字符串等数据。如果需要使用 Redis 的高级功能（如 Hash、List、Set、Sorted Set、分布式锁等），需要直接使用 ioredis 客户端。

**如果需要直接使用 ioredis：**

可以同时配置 ioredis 客户端用于高级功能：

```typescript
import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class AdvancedRedisService {
  // 需要单独配置 ioredis 连接
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    });
  }

  // 使用 Hash
  async setHash(key: string, field: string, value: string): Promise<number> {
    return await this.redis.hset(key, field, value);
  }

  // 使用分布式锁
  async acquireLock(
    key: string,
    value: string,
    ttl: number = 10,
  ): Promise<boolean> {
    const result = await this.redis.set(key, value, 'EX', ttl, 'NX');
    return result === 'OK';
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
