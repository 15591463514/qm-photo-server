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

/**
 * 菜单服务
 */
@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取菜单树形结构
   * @param query 查询参数
   * @returns 树形菜单列表
   */
  async getMenuTree(query: QueryMenuDto): Promise<MenuResponseDto[]> {
    const { name, path, status } = query;

    // 构建查询条件
    const where: Prisma.MenuWhereInput = {};

    if (name) {
      where.name = { contains: name };
    }
    if (path) {
      where.path = { contains: path };
    }
    if (status) {
      where.status = status;
    }

    // 查询所有菜单
    const menus = await this.prisma.menu.findMany({
      where,
      include: {
        menuButtons: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createTime: 'asc' }],
    });

    // 构建树形结构
    const menuMap = new Map<number, MenuResponseDto>();
    const rootMenus: MenuResponseDto[] = [];

    // 第一遍遍历：创建所有菜单节点
    for (const menu of menus) {
      const menuDto = plainToInstance(
        MenuResponseDto,
        {
          ...menu,
          buttons: menu.menuButtons.map((btn) => ({
            id: btn.id,
            menuId: btn.menuId,
            title: btn.title,
            authMark: btn.authMark,
            sortOrder: btn.sortOrder,
            createTime: btn.createTime,
          })),
          children: [],
        },
        {
          excludeExtraneousValues: false,
        },
      );

      menuMap.set(menu.id, menuDto);
    }

    // 第二遍遍历：构建父子关系
    for (const menu of menus) {
      const menuDto = menuMap.get(menu.id)!;

      if (menu.parentId === 0) {
        // 根节点
        rootMenus.push(menuDto);
      } else {
        // 子节点
        const parent = menuMap.get(menu.parentId);
        if (parent) {
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(menuDto);
        }
      }
    }

    return rootMenus;
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

    return plainToInstance(
      MenuResponseDto,
      {
        ...menu,
        buttons: menu.menuButtons.map((btn) => ({
          id: btn.id,
          menuId: btn.menuId,
          title: btn.title,
          authMark: btn.authMark,
          sortOrder: btn.sortOrder,
          createTime: btn.createTime,
        })),
      },
      {
        excludeExtraneousValues: false,
      },
    );
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

    // 更新菜单
    const updateData: Prisma.MenuUpdateInput = {};

    if (updateMenuDto.parentId !== undefined) {
      // 使用类型断言，因为Prisma类型系统可能将parentId识别为关系字段
      (updateData as any).parentId = updateMenuDto.parentId;
    }
    if (updateMenuDto.name !== undefined) {
      updateData.name = updateMenuDto.name;
    }
    if (updateMenuDto.path !== undefined) {
      updateData.path = updateMenuDto.path;
    }
    if (updateMenuDto.component !== undefined) {
      updateData.component = updateMenuDto.component;
    }
    if (updateMenuDto.title !== undefined) {
      updateData.title = updateMenuDto.title;
    }
    if (updateMenuDto.icon !== undefined) {
      updateData.icon = updateMenuDto.icon;
    }
    if (updateMenuDto.isHide !== undefined) {
      updateData.isHide = updateMenuDto.isHide;
    }
    if (updateMenuDto.isHideTab !== undefined) {
      updateData.isHideTab = updateMenuDto.isHideTab;
    }
    if (updateMenuDto.link !== undefined) {
      updateData.link = updateMenuDto.link;
    }
    if (updateMenuDto.isIframe !== undefined) {
      updateData.isIframe = updateMenuDto.isIframe;
    }
    if (updateMenuDto.keepAlive !== undefined) {
      updateData.keepAlive = updateMenuDto.keepAlive;
    }
    if (updateMenuDto.isFirstLevel !== undefined) {
      updateData.isFirstLevel = updateMenuDto.isFirstLevel;
    }
    if (updateMenuDto.fixedTab !== undefined) {
      updateData.fixedTab = updateMenuDto.fixedTab;
    }
    if (updateMenuDto.activePath !== undefined) {
      updateData.activePath = updateMenuDto.activePath;
    }
    if (updateMenuDto.isFullPage !== undefined) {
      updateData.isFullPage = updateMenuDto.isFullPage;
    }
    if (updateMenuDto.sortOrder !== undefined) {
      updateData.sortOrder = updateMenuDto.sortOrder;
    }
    if (updateMenuDto.status !== undefined) {
      updateData.status = updateMenuDto.status;
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

    return plainToInstance(MenuResponseDto, menu, {
      excludeExtraneousValues: false,
    });
  }
}
