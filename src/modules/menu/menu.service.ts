import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from 'nestjs-prisma';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { QueryMenuDto } from './dto/query-menu.dto';
import { MenuResponseDto } from './dto/menu-response.dto';
import { Prisma } from '@prisma/client';
import { EnableStatus } from '@/common/constants/enums';
import { MenuStoreService } from './menu.store';
import { buildMenuTree, transformMenuToDto } from '@/common/helpers';

/**
 * 菜单服务
 */
@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private menuStore: MenuStoreService,
  ) {}

  /**
   * 获取菜单树形结构
   * @param query 查询参数
   * @returns 树形菜单列表
   */
  async getMenuTree(query: QueryMenuDto): Promise<MenuResponseDto[]> {
    const { title, path, status } = query;

    // 查询条件为空，则返回所有菜单
    if (!title && !path && !status) {
      // 从缓存中获取所有菜单
      const menus = await this.menuStore.getAllMenus();
      return buildMenuTree(menus);
    }

    // 构建查询条件
    const where: Prisma.MenuWhereInput = {};

    if (title) {
      where.title = { contains: title };
    }
    if (path) {
      where.path = { contains: path };
    }
    if (status) {
      where.status = status;
    }

    // 根据条件查询菜单数据
    const menus = await this.prisma.menu.findMany({
      where,
      include: {
        menuButtons: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createTime: 'asc' }],
    });

    // 构建菜单树形结构
    const menuTree = buildMenuTree(menus);

    return menuTree;
  }

  /**
   * 根据菜单ID列表获取菜单列表
   * @param menuIds 菜单ID列表
   * @returns 菜单列表
   */
  async getMenusByMenuIds(menuIds: number[]): Promise<MenuResponseDto[]> {
    const allMenus = await this.menuStore.getAllMenus();
    const menus = allMenus.filter((menu) => menuIds.includes(menu.id));
    return menus;
  }

  /**
   * 获取菜单详情
   * @param id 菜单ID
   * @returns 菜单详情
   */
  async findOne(id: number): Promise<MenuResponseDto> {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        menuButtons: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!menu) {
      throw new NotFoundException(`菜单 ID ${id} 不存在`);
    }

    return transformMenuToDto(menu);
  }

  /**
   * 创建菜单
   * @param createMenuDto 创建菜单 DTO
   * @param userId 创建人ID
   * @returns 创建的菜单信息
   */
  async create(
    createMenuDto: CreateMenuDto,
    userId?: number,
  ): Promise<MenuResponseDto> {
    const parentId = createMenuDto.parentId ?? 0;

    // 如果指定了父菜单，检查父菜单是否存在
    if (parentId !== 0) {
      const parentMenu = await this.prisma.menu.findUnique({
        where: { id: parentId },
      });

      if (!parentMenu) {
        throw new NotFoundException(`父菜单 ID ${parentId} 不存在`);
      }
    }

    // 检查同一父菜单下路径是否已存在
    const existingMenu = await this.prisma.menu.findFirst({
      where: {
        parentId,
        path: createMenuDto.path,
      },
    });

    if (existingMenu) {
      throw new ConflictException(`父菜单下路径 ${createMenuDto.path} 已存在`);
    }

    // 创建菜单
    const menu = await this.prisma.menu.create({
      data: {
        parentId,
        name: createMenuDto.name,
        path: createMenuDto.path,
        component: createMenuDto.component,
        title: createMenuDto.title,
        icon: createMenuDto.icon,
        isHide: createMenuDto.isHide ?? false,
        isHideTab: createMenuDto.isHideTab ?? false,
        link: createMenuDto.link,
        isIframe: createMenuDto.isIframe ?? false,
        keepAlive: createMenuDto.keepAlive ?? false,
        isFirstLevel: createMenuDto.isFirstLevel ?? false,
        fixedTab: createMenuDto.fixedTab ?? false,
        activePath: createMenuDto.activePath,
        isFullPage: createMenuDto.isFullPage ?? false,
        sortOrder: createMenuDto.sortOrder ?? 0,
        status: createMenuDto.status ?? EnableStatus.ENABLED,
      },
    });

    // 创建菜单按钮
    if (createMenuDto.buttons && createMenuDto.buttons.length > 0) {
      await this.prisma.menuButton.createMany({
        data: createMenuDto.buttons.map((btn) => ({
          menuId: menu.id,
          title: btn.title,
          authMark: btn.authMark,
          sortOrder: btn.sortOrder ?? 0,
        })),
      });
    }

    // 清除所有菜单数据缓存
    await this.menuStore.clearAllCacheMenus();

    return this.findOne(menu.id);
  }

  /**
   * 更新菜单
   * @param id 菜单ID
   * @param updateMenuDto 更新菜单 DTO
   * @param userId 更新人ID
   * @returns 更新后的菜单信息
   */
  async update(
    id: number,
    updateMenuDto: UpdateMenuDto,
    userId?: number,
  ): Promise<MenuResponseDto> {
    // 检查菜单是否存在
    const existingMenu = await this.prisma.menu.findUnique({
      where: { id },
    });

    if (!existingMenu) {
      throw new NotFoundException(`菜单 ID ${id} 不存在`);
    }

    // 如果更新了父菜单ID，检查新父菜单是否存在
    if (updateMenuDto.parentId !== undefined) {
      const newParentId = updateMenuDto.parentId;
      if (newParentId !== 0) {
        const parentMenu = await this.prisma.menu.findUnique({
          where: { id: newParentId },
        });

        if (!parentMenu) {
          throw new NotFoundException(`父菜单 ID ${newParentId} 不存在`);
        }

        // 检查是否会形成循环引用
        if (newParentId === id) {
          throw new ConflictException('不能将菜单设置为自己的父菜单');
        }

        // 检查是否会形成循环引用（递归检查）
        const checkCircularReference = async (
          menuId: number,
          targetParentId: number,
        ): Promise<boolean> => {
          if (menuId === targetParentId) {
            return true;
          }

          const menu = await this.prisma.menu.findUnique({
            where: { id: targetParentId },
            select: { parentId: true },
          });

          if (!menu || menu.parentId === 0) {
            return false;
          }

          return checkCircularReference(menuId, menu.parentId);
        };

        const hasCircularReference = await checkCircularReference(
          id,
          newParentId,
        );
        if (hasCircularReference) {
          throw new ConflictException('不能形成循环引用');
        }
      }
    }

    // 如果更新了路径，检查同一父菜单下新路径是否已存在
    if (updateMenuDto.path !== undefined) {
      const parentId = updateMenuDto.parentId ?? existingMenu.parentId;
      const existingPathMenu = await this.prisma.menu.findFirst({
        where: {
          parentId,
          path: updateMenuDto.path,
          id: { not: id },
        },
      });

      if (existingPathMenu) {
        throw new ConflictException(
          `父菜单下路径 ${updateMenuDto.path} 已存在`,
        );
      }
    }

    // 构建更新数据对象
    // 排除不需要更新的字段（buttons 单独处理，roles 暂不支持更新）
    const { buttons, roles, ...menuUpdateFields } = updateMenuDto;

    // 过滤掉 undefined 值，只保留需要更新的字段
    const updateData: Prisma.MenuUpdateInput = {};

    // 遍历所有字段，只添加非 undefined 的值
    for (const [key, value] of Object.entries(menuUpdateFields)) {
      if (value !== undefined) {
        // parentId 需要特殊处理（Prisma 类型系统可能将其识别为关系字段）
        if (key === 'parentId') {
          (updateData as any).parentId = value;
        } else {
          (updateData as any)[key] = value;
        }
      }
    }

    await this.prisma.menu.update({
      where: { id },
      data: updateData,
    });

    // 更新菜单按钮
    if (updateMenuDto.buttons !== undefined) {
      // 删除所有现有按钮
      await this.prisma.menuButton.deleteMany({
        where: { menuId: id },
      });

      // 创建新按钮
      if (updateMenuDto.buttons.length > 0) {
        await this.prisma.menuButton.createMany({
          data: updateMenuDto.buttons.map((btn) => ({
            menuId: id,
            title: btn.title!,
            authMark: btn.authMark!,
            sortOrder: btn.sortOrder ?? 0,
          })),
        });
      }
    }

    // 清除所有菜单数据缓存
    await this.menuStore.clearAllCacheMenus();

    return this.findOne(id);
  }

  /**
   * 删除菜单
   * @param id 菜单ID
   * @returns 删除的菜单信息
   */
  async remove(id: number): Promise<MenuResponseDto> {
    // 检查菜单是否存在
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        children: true,
      },
    });

    if (!menu) {
      throw new NotFoundException(`菜单 ID ${id} 不存在`);
    }

    // 检查是否有子菜单
    if (menu.children && menu.children.length > 0) {
      throw new ConflictException('该菜单下存在子菜单，无法删除');
    }

    // 删除菜单（级联删除菜单按钮）
    await this.prisma.menu.delete({
      where: { id },
    });

    // 清除所有菜单数据缓存
    await this.menuStore.clearAllCacheMenus();

    return plainToInstance(MenuResponseDto, menu, {
      excludeExtraneousValues: false,
    });
  }
}
