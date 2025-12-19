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
   * @returns 创建的菜单信息
   */
  async create(createMenuDto: CreateMenuDto): Promise<MenuResponseDto> {
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
   * @returns 更新后的菜单信息
   */
  async update(
    id: number,
    updateMenuDto: UpdateMenuDto,
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
    // 排除不需要更新的字段（roles 暂不支持更新）
    const { roles, ...menuUpdateFields } = updateMenuDto;

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

  /**
   * 创建菜单按钮
   * @param menuId 菜单ID
   * @param createButtonDto 创建按钮 DTO
   * @returns 创建的按钮信息
   */
  async createButton(
    menuId: number,
    createButtonDto: { title: string; authMark: string; sortOrder?: number },
  ): Promise<{
    id: number;
    menuId: number;
    title: string;
    authMark: string;
    sortOrder: number;
  }> {
    // 检查菜单是否存在
    const menu = await this.prisma.menu.findUnique({
      where: { id: menuId },
    });

    if (!menu) {
      throw new NotFoundException(`菜单 ID ${menuId} 不存在`);
    }

    // 检查同一菜单下权限标识是否已存在
    const existingButton = await this.prisma.menuButton.findFirst({
      where: {
        menuId,
        authMark: createButtonDto.authMark,
      },
    });

    if (existingButton) {
      throw new ConflictException(
        `菜单下权限标识 ${createButtonDto.authMark} 已存在`,
      );
    }

    // 创建按钮
    const button = await this.prisma.menuButton.create({
      data: {
        menuId,
        title: createButtonDto.title,
        authMark: createButtonDto.authMark,
        sortOrder: createButtonDto.sortOrder ?? 0,
      },
    });

    // 清除所有菜单数据缓存
    await this.menuStore.clearAllCacheMenus();

    return {
      id: button.id,
      menuId: button.menuId,
      title: button.title,
      authMark: button.authMark,
      sortOrder: button.sortOrder,
    };
  }

  /**
   * 更新菜单按钮
   * @param menuId 菜单ID
   * @param buttonId 按钮ID
   * @param updateButtonDto 更新按钮 DTO
   * @returns 更新后的按钮信息
   */
  async updateButton(
    menuId: number,
    buttonId: number,
    updateButtonDto: { title?: string; authMark?: string; sortOrder?: number },
  ): Promise<{
    id: number;
    menuId: number;
    title: string;
    authMark: string;
    sortOrder: number;
  }> {
    // 检查按钮是否存在
    const button = await this.prisma.menuButton.findUnique({
      where: { id: buttonId },
    });

    if (!button) {
      throw new NotFoundException(`按钮 ID ${buttonId} 不存在`);
    }

    // 检查按钮是否属于指定菜单
    if (button.menuId !== menuId) {
      throw new ConflictException(
        `按钮 ID ${buttonId} 不属于菜单 ID ${menuId}`,
      );
    }

    // 如果更新了权限标识，检查同一菜单下新权限标识是否已存在
    if (
      updateButtonDto.authMark &&
      updateButtonDto.authMark !== button.authMark
    ) {
      const existingButton = await this.prisma.menuButton.findFirst({
        where: {
          menuId,
          authMark: updateButtonDto.authMark,
          id: { not: buttonId },
        },
      });

      if (existingButton) {
        throw new ConflictException(
          `菜单下权限标识 ${updateButtonDto.authMark} 已存在`,
        );
      }
    }

    // 构建更新数据
    const updateData: {
      title?: string;
      authMark?: string;
      sortOrder?: number;
    } = {};

    if (updateButtonDto.title !== undefined) {
      updateData.title = updateButtonDto.title;
    }
    if (updateButtonDto.authMark !== undefined) {
      updateData.authMark = updateButtonDto.authMark;
    }
    if (updateButtonDto.sortOrder !== undefined) {
      updateData.sortOrder = updateButtonDto.sortOrder;
    }

    // 更新按钮
    const updatedButton = await this.prisma.menuButton.update({
      where: { id: buttonId },
      data: updateData,
    });

    // 清除所有菜单数据缓存
    await this.menuStore.clearAllCacheMenus();

    return {
      id: updatedButton.id,
      menuId: updatedButton.menuId,
      title: updatedButton.title,
      authMark: updatedButton.authMark,
      sortOrder: updatedButton.sortOrder,
    };
  }

  /**
   * 删除菜单按钮
   * @param menuId 菜单ID
   * @param buttonId 按钮ID
   * @returns 删除的按钮信息
   */
  async removeButton(
    menuId: number,
    buttonId: number,
  ): Promise<{ id: number; menuId: number; title: string; authMark: string }> {
    // 检查按钮是否存在
    const button = await this.prisma.menuButton.findUnique({
      where: { id: buttonId },
    });

    if (!button) {
      throw new NotFoundException(`按钮 ID ${buttonId} 不存在`);
    }

    // 检查按钮是否属于指定菜单
    if (button.menuId !== menuId) {
      throw new ConflictException(
        `按钮 ID ${buttonId} 不属于菜单 ID ${menuId}`,
      );
    }

    // 删除按钮（级联删除角色按钮关联）
    await this.prisma.menuButton.delete({
      where: { id: buttonId },
    });

    // 清除所有菜单数据缓存
    await this.menuStore.clearAllCacheMenus();

    return {
      id: button.id,
      menuId: button.menuId,
      title: button.title,
      authMark: button.authMark,
    };
  }
}
