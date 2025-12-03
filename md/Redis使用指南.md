# Redis 使用指南

## 📋 目录

- [概述](#概述)
- [配置说明](#配置说明)
- [基本使用](#基本使用)
- [常用操作示例](#常用操作示例)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 概述

本项目使用 `@nestjs-modules/ioredis` 和 `ioredis` 集成 Redis 缓存服务。

### 功能特性

- ✅ 全局 Redis 模块，可在任何服务中直接使用
- ✅ 支持连接池和自动重连
- ✅ 支持密码认证
- ✅ 支持键前缀配置
- ✅ 支持 Docker 容器化部署

---

## 配置说明

### 环境变量配置

Redis 配置通过环境变量进行管理，支持不同环境的独立配置。

#### 公共配置 (`.env`)

```env
# Redis 基础配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_KEY_PREFIX=qm_photo:
```

#### 开发环境配置 (`.env.development`)

```env
# Redis 开发环境配置
REDIS_PASSWORD=
REDIS_CONNECT_TIMEOUT=10000
REDIS_LAZY_CONNECT=false
REDIS_MAX_RETRIES=3
REDIS_ENABLE_READY_CHECK=true
REDIS_ENABLE_OFFLINE_QUEUE=true
```

#### 生产环境配置 (`.env.production`)

```env
# Redis 生产环境配置
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
REDIS_CONNECT_TIMEOUT=10000
REDIS_LAZY_CONNECT=false
REDIS_MAX_RETRIES=3
REDIS_ENABLE_READY_CHECK=true
REDIS_ENABLE_OFFLINE_QUEUE=true
```

### 配置参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `REDIS_HOST` | Redis 服务器地址 | `localhost` |
| `REDIS_PORT` | Redis 服务器端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码（可选） | 空字符串 |
| `REDIS_DB` | Redis 数据库编号 | `0` |
| `REDIS_KEY_PREFIX` | 键前缀（所有键会自动添加此前缀） | `qm_photo:` |
| `REDIS_CONNECT_TIMEOUT` | 连接超时时间（毫秒） | `10000` |
| `REDIS_LAZY_CONNECT` | 延迟连接（首次使用时连接） | `false` |
| `REDIS_MAX_RETRIES` | 最大重试次数 | `3` |
| `REDIS_ENABLE_READY_CHECK` | 启用就绪检查 | `true` |
| `REDIS_ENABLE_OFFLINE_QUEUE` | 启用离线队列 | `true` |

---

## 基本使用

### 1. 在服务中注入 Redis

由于 Redis 模块已配置为全局模块，可以在任何服务中直接使用：

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class YourService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async someMethod() {
    // 使用 Redis
    await this.redis.set('key', 'value');
    const value = await this.redis.get('key');
  }
}
```

### 2. 使用配置服务获取 Redis 配置

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class YourService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async someMethod() {
    const keyPrefix = this.configService.get<string>('redis.keyPrefix');
    const fullKey = `${keyPrefix}user:123`;
    await this.redis.set(fullKey, 'value');
  }
}
```

---

## 常用操作示例

### 字符串操作

```typescript
// 设置值
await this.redis.set('key', 'value');

// 设置值并指定过期时间（秒）
await this.redis.setex('key', 3600, 'value');

// 获取值
const value = await this.redis.get('key');

// 删除键
await this.redis.del('key');

// 检查键是否存在
const exists = await this.redis.exists('key');

// 设置过期时间
await this.redis.expire('key', 3600);

// 获取剩余过期时间
const ttl = await this.redis.ttl('key');
```

### Hash 操作

```typescript
// 设置 Hash 字段
await this.redis.hset('user:123', 'name', 'John');
await this.redis.hset('user:123', 'email', 'john@example.com');

// 获取 Hash 字段
const name = await this.redis.hget('user:123', 'name');

// 获取所有 Hash 字段和值
const user = await this.redis.hgetall('user:123');
// 返回: { name: 'John', email: 'john@example.com' }

// 删除 Hash 字段
await this.redis.hdel('user:123', 'email');

// 检查 Hash 字段是否存在
const exists = await this.redis.hexists('user:123', 'name');
```

### List 操作

```typescript
// 从左侧推入
await this.redis.lpush('list:key', 'item1', 'item2');

// 从右侧推入
await this.redis.rpush('list:key', 'item3');

// 从左侧弹出
const item = await this.redis.lpop('list:key');

// 从右侧弹出
const item = await this.redis.rpop('list:key');

// 获取列表范围
const items = await this.redis.lrange('list:key', 0, -1);

// 获取列表长度
const length = await this.redis.llen('list:key');
```

### Set 操作

```typescript
// 添加成员
await this.redis.sadd('set:key', 'member1', 'member2');

// 获取所有成员
const members = await this.redis.smembers('set:key');

// 检查成员是否存在
const exists = await this.redis.sismember('set:key', 'member1');

// 删除成员
await this.redis.srem('set:key', 'member1');

// 获取成员数量
const count = await this.redis.scard('set:key');
```

### Sorted Set 操作

```typescript
// 添加成员（带分数）
await this.redis.zadd('sorted:key', 100, 'member1');
await this.redis.zadd('sorted:key', 200, 'member2');

// 获取范围（按分数排序）
const members = await this.redis.zrange('sorted:key', 0, -1);

// 获取范围（带分数）
const results = await this.redis.zrange('sorted:key', 0, -1, 'WITHSCORES');

// 获取成员分数
const score = await this.redis.zscore('sorted:key', 'member1');

// 获取排名
const rank = await this.redis.zrank('sorted:key', 'member1');
```

---

## 最佳实践

### 1. 缓存模式

#### 缓存穿透防护

```typescript
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
```

#### 缓存更新策略

```typescript
// 更新缓存
async updateCache(key: string, data: any, ttl: number = 3600): Promise<void> {
  await this.redis.setex(key, ttl, JSON.stringify(data));
}

// 删除缓存
async invalidateCache(key: string): Promise<void> {
  await this.redis.del(key);
}

// 批量删除缓存（使用模式匹配）
async invalidateCachePattern(pattern: string): Promise<void> {
  const keys = await this.redis.keys(pattern);
  if (keys.length > 0) {
    await this.redis.del(...keys);
  }
}
```

### 2. 分布式锁

```typescript
async acquireLock(
  key: string,
  value: string,
  ttl: number = 10,
): Promise<boolean> {
  const result = await this.redis.set(key, value, 'EX', ttl, 'NX');
  return result === 'OK';
}

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

// 使用示例
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
```

### 3. 键命名规范

建议使用以下命名规范：

```
{prefix}:{module}:{resource}:{id}
```

示例：
- `qm_photo:user:profile:123` - 用户资料
- `qm_photo:session:token:abc123` - 会话令牌
- `qm_photo:cache:api:users` - API 缓存
- `qm_photo:lock:order:456` - 订单锁

### 4. 错误处理

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class YourService {
  private readonly logger = new Logger(YourService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {
    // 监听错误事件
    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    // 监听连接事件
    this.redis.on('connect', () => {
      this.logger.log('Redis connected');
    });
  }

  async safeGet(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error(`Redis get error for key ${key}:`, error);
      return null; // 返回默认值或抛出异常
    }
  }
}
```

---

## 常见问题

### Q1: Redis 连接失败怎么办？

**检查清单：**
1. 确认 Redis 服务是否启动
2. 检查 `REDIS_HOST` 和 `REDIS_PORT` 配置是否正确
3. 检查防火墙设置
4. 如果使用 Docker，确认容器是否正常运行

**调试命令：**
```bash
# 检查 Redis 是否运行
docker ps | grep redis

# 查看 Redis 日志
docker logs qm-photo-redis-dev

# 测试 Redis 连接
redis-cli -h localhost -p 6379 ping
```

### Q2: 如何查看 Redis 中的数据？

**使用 Redis CLI：**
```bash
# 连接 Redis
redis-cli -h localhost -p 6379

# 查看所有键（注意：生产环境慎用，数据量大时会影响性能）
KEYS *

# 查看特定模式的键
KEYS qm_photo:user:*

# 查看键的值
GET qm_photo:user:123

# 查看键的类型
TYPE qm_photo:user:123

# 查看键的过期时间
TTL qm_photo:user:123
```

**使用 Redis Desktop Manager：**
推荐使用 Redis Desktop Manager 等图形化工具查看和管理 Redis 数据。

### Q3: 键前缀的作用是什么？

键前缀用于：
1. **命名空间隔离**：避免不同项目或模块的键冲突
2. **批量操作**：可以方便地批量删除某个前缀的所有键
3. **监控和调试**：便于识别键的来源和用途

### Q4: 如何清空 Redis 数据？

**⚠️ 警告：清空操作会删除所有数据，请谨慎使用！**

```bash
# 清空当前数据库
redis-cli FLUSHDB

# 清空所有数据库
redis-cli FLUSHALL
```

**在代码中清空（谨慎使用）：**
```typescript
// 清空当前数据库
await this.redis.flushdb();

// 清空所有数据库
await this.redis.flushall();
```

### Q5: Redis 内存不足怎么办？

**解决方案：**
1. **设置过期时间**：为缓存数据设置合理的过期时间
2. **使用 LRU 淘汰策略**：在 Redis 配置中启用 `maxmemory-policy allkeys-lru`
3. **定期清理**：定期清理过期或无用的键
4. **数据压缩**：对于大对象，考虑压缩后再存储

### Q6: 如何监控 Redis 性能？

**使用 Redis 命令：**
```bash
# 查看 Redis 信息
redis-cli INFO

# 查看内存使用情况
redis-cli INFO memory

# 查看命令统计
redis-cli INFO stats

# 监控实时命令
redis-cli MONITOR
```

---

## 📚 参考资源

- [ioredis 官方文档](https://github.com/redis/ioredis)
- [@nestjs-modules/ioredis 文档](https://github.com/nest-modules/ioredis)
- [Redis 命令参考](https://redis.io/commands)
- 项目示例代码：`src/common/services/redis.example.ts`

---

## 🔗 相关文档

- [环境配置与启动指南](./环境配置与启动指南.md) - Redis 环境变量配置
- [Docker使用指南](./Docker使用指南.md) - Redis Docker 部署

