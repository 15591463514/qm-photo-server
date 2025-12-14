import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRedisKey, MENU_KEY } from '@/common/constants/redis-key.constants';
import { MenuWithButtons } from '@/common/helpers';

@Injectable()
export class MenuStoreService {
  /** 菜单redis过期时间 */
  static readonly MENU_REDIS_TTL = 1000 * 60 * 60 * 24 * 3; // 3天

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 设置所有菜单数据到缓存
   */
  async setAllCacheMenus(menuData: MenuWithButtons[]) {
    await this.cacheManager.set(
      getRedisKey(MENU_KEY, 'all'),
      menuData,
      MenuStoreService.MENU_REDIS_TTL,
    );
  }

  /**
   * 获取缓存的所有菜单数据
   * @returns 所有菜单数据
   */
  async getAllCacheMenus(): Promise<MenuWithButtons[]> {
    return await this.cacheManager.get<MenuWithButtons[]>(
      getRedisKey(MENU_KEY, 'all'),
    );
  }

  /**
   * 清除缓存的所有菜单数据
   */
  async clearAllCacheMenus() {
    await this.cacheManager.del(getRedisKey(MENU_KEY, 'all'));
  }

  /**
   * 查询所有的菜单数据
   * @returns 菜单数据
   */
  async getAllMenus(): Promise<MenuWithButtons[]> {
    /** 缓存中的菜单数据 */
    const cacheMenus = await this.getAllCacheMenus();
    // 如果缓存中的菜单数据存在，则直接返回
    if (cacheMenus) {
      return cacheMenus;
    }

    /** 数据库中的菜单数据 */
    const menus = await this.prisma.menu.findMany({
      include: {
        menuButtons: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createTime: 'asc' }],
    });

    // 存储所有菜单信息到缓存
    await this.setAllCacheMenus(menus);
    return menus;
  }
}
