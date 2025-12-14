import { MenuResponseDto } from '@/modules/menu/dto/menu-response.dto';
import { MenuButton } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

/**
 * 菜单数据类型（包含查询的临时按钮数据，用于构建菜单树形结构）
 */
export interface MenuWithButtons extends MenuResponseDto {
  menuButtons: MenuButton[];
}

/**
 * 将菜单按钮转换为响应 DTO 格式
 * @param buttons 菜单按钮数组
 * @returns 转换后的按钮数组
 */
export function transformMenuButtons(buttons: MenuButton[]) {
  return buttons.map((btn) => ({
    id: btn.id,
    menuId: btn.menuId,
    title: btn.title,
    authMark: btn.authMark,
    sortOrder: btn.sortOrder,
    createTime: btn.createTime,
  }));
}

/**
 * 将菜单数据转换为响应 DTO
 * @param menu 菜单数据（包含按钮）
 * @returns 转换后的菜单 DTO
 */
export function transformMenuToDto(menu: MenuWithButtons): MenuResponseDto {
  return plainToInstance(
    MenuResponseDto,
    {
      ...menu,
      buttons: transformMenuButtons(menu.menuButtons || []),
      children: [], // 初始化子菜单数组
    },
    {
      excludeExtraneousValues: false,
    },
  );
}

/**
 * 通过菜单数据构建菜单树形结构
 *
 * @param menus 菜单数据数组（包含按钮信息）
 * @returns 构建好的菜单树形结构（根节点数组）
 *
 * @example
 * ```typescript
 * const menus = [
 *   { id: 1, parentId: 0, name: '系统管理', menuButtons: [] },
 *   { id: 2, parentId: 1, name: '用户管理', menuButtons: [] },
 * ];
 * const tree = buildMenuTree(menus);
 * // 返回: [{ id: 1, children: [{ id: 2 }] }]
 * ```
 */
export function buildMenuTree(menus: MenuWithButtons[]): MenuResponseDto[] {
  // 边界情况：空数组直接返回
  if (!menus || menus.length === 0) {
    return [];
  }

  // 使用 Map 存储所有菜单节点，便于快速查找
  const menuMap = new Map<number, MenuResponseDto>();
  const rootMenus: MenuResponseDto[] = [];

  // 第一步：创建所有菜单节点并建立映射关系
  for (const menu of menus) {
    // 跳过无效数据（缺少必要字段）
    if (!menu.id) {
      continue;
    }

    const menuDto = transformMenuToDto(menu);
    menuMap.set(menu.id, menuDto);
  }

  // 第二步：构建父子关系
  for (const menu of menus) {
    const menuDto = menuMap.get(menu.id);
    if (!menuDto) {
      continue; // 跳过无效节点
    }

    /** 父节点ID */
    const parentId = menu.parentId || 0;

    // 如果父节点ID为0，则将当前节点添加到根节点数组中
    if (parentId === 0) {
      rootMenus.push(menuDto);
      continue;
    }

    // 查找父节点并添加到其 children 数组中
    const parent = menuMap.get(parentId);

    // 如果父节点不存在，也将当前节点添加到根节点数组中（处理数据不一致的情况）
    if (!parent) {
      rootMenus.push(menuDto);
      continue;
    }

    // 确保父节点的 children 数组已初始化
    if (!parent.children) {
      parent.children = [];
    }
    parent.children.push(menuDto);
  }

  return rootMenus;
}
