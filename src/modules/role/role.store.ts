import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRedisKey, ROLE_KEY } from '@/common/constants/redis-key.constants';
import { Role } from '@prisma/client';

@Injectable()
export class RoleStoreService {
  /** 角色redis过期时间 */
  static readonly ROLE_REDIS_TTL = 1000 * 60 * 60 * 24 * 3; // 3天

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 设置所有角色数据到缓存
   */
  async setAllCacheRoles(roleData: Role[]) {
    await this.cacheManager.set(
      getRedisKey(ROLE_KEY, 'all'),
      roleData,
      RoleStoreService.ROLE_REDIS_TTL,
    );
  }

  /**
   * 获取缓存的所有角色数据
   * @returns 所有角色数据
   */
  async getAllCacheRoles(): Promise<Role[]> {
    return await this.cacheManager.get<Role[]>(getRedisKey(ROLE_KEY, 'all'));
  }

  /**
   * 清除缓存的所有角色数据
   */
  async clearAllCacheRoles() {
    await this.cacheManager.del(getRedisKey(ROLE_KEY, 'all'));
  }

  /**
   * 查询所有的角色数据
   * @returns 角色数据
   */
  async getAllRoles(): Promise<Role[]> {
    /** 缓存中的角色数据 */
    const cacheRoles = await this.getAllCacheRoles();
    // 如果缓存中的角色数据存在，则直接返回
    if (cacheRoles) {
      return cacheRoles;
    }

    /** 数据库中的角色数据 */
    const roles = await this.prisma.role.findMany({
      orderBy: {
        createTime: 'desc',
      },
    });

    // 存储所有角色信息到缓存
    await this.setAllCacheRoles(roles);
    return roles;
  }
}
