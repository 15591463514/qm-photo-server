import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRedisKey, DICT_KEY } from '@/common/constants/redis-key.constants';
import { Dict } from '@prisma/client';
import { toDate } from '@/common/helpers/date.helper';

@Injectable()
export class DictStoreService {
  /** 字典redis过期时间 */
  static readonly DICT_REDIS_TTL = 1000 * 60 * 60 * 24 * 3; // 3天

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 设置所有字典数据到缓存
   */
  async setAllCacheDicts(dictData: Dict[]) {
    await this.cacheManager.set(
      getRedisKey(DICT_KEY, 'all'),
      dictData,
      DictStoreService.DICT_REDIS_TTL,
    );
  }

  /**
   * 获取缓存的所有字典数据
   * @returns 所有字典数据
   */
  async getAllCacheDicts(): Promise<Dict[] | null> {
    const cached = await this.cacheManager.get<Dict[]>(
      getRedisKey(DICT_KEY, 'all'),
    );

    if (!cached) {
      return null;
    }

    // Redis 缓存中的数据，Date 字段会被序列化为字符串，需要转换回 Date 对象
    return cached.map((dict) => ({
      ...dict,
      createTime: toDate(dict.createTime) || new Date(),
      updateTime: toDate(dict.updateTime),
    })) as Dict[];
  }

  /**
   * 清除缓存的所有字典数据
   */
  async clearAllCacheDicts() {
    await this.cacheManager.del(getRedisKey(DICT_KEY, 'all'));
  }

  /**
   * 查询所有的字典数据
   * @returns 字典数据
   */
  async getAllDicts(): Promise<Dict[]> {
    /** 缓存中的字典数据 */
    const cacheDicts = await this.getAllCacheDicts();
    // 如果缓存中的字典数据存在，则直接返回
    if (cacheDicts) {
      return cacheDicts;
    }

    /** 数据库中的字典数据 */
    const dicts = await this.prisma.dict.findMany({
      orderBy: [
        { typeCode: 'asc' },
        { sortOrder: 'asc' },
        { createTime: 'asc' },
      ],
    });

    // 存储所有字典信息到缓存
    await this.setAllCacheDicts(dicts);
    return dicts;
  }
}
