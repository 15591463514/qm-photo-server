import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from 'nestjs-prisma';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import {
  AssignRolePermissionsDto,
  RolePermissionsResponseDto,
} from './dto/role-permissions.dto';
import { Prisma, Role } from '@prisma/client';
import { RoleStoreService } from './role.store';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  USER_INFO_KEY,
  USER_PERMISSIONS_KEY,
  getRedisKey,
} from '@/common/constants/redis-key.constants';

/**
 * 角色服务
 */
@Injectable()
export class RoleService {
  constructor(
    private prisma: PrismaService,
    private roleStore: RoleStoreService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 将角色转换为响应 DTO
   * @param role 角色
   * @returns 响应 DTO
   */
  private roleToResponseDto(role: Role): RoleResponseDto {
    return plainToInstance(RoleResponseDto, role, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 查询角色列表
   * @param query 查询参数（过滤条件）
   * @returns 角色列表
   */
  async findAll(query: QueryRoleDto): Promise<RoleResponseDto[]> {
    const { roleId, roleName, roleCode, description, enabled } = query;

    const queryValues = Object.values(query);
    const everyValueIsEmpty = queryValues.every((value) => !value);

    if (everyValueIsEmpty) {
      const roles = await this.roleStore.getAllRoles();
      return roles.map(this.roleToResponseDto);
    }
    // 构建查询条件
    const where: Prisma.RoleWhereInput = {};

    // 添加过滤条件
    if (roleId) {
      where.roleId = roleId;
    }
    if (roleName) {
      where.roleName = {
        contains: roleName,
      };
    }
    if (roleCode) {
      where.roleCode = {
        contains: roleCode,
      };
    }
    if (description) {
      where.description = {
        contains: description,
      };
    }
    if (enabled !== undefined) {
      where.enabled = enabled;
    }

    // 查询所有符合条件的角色
    const results = await this.prisma.role.findMany({
      where,
      orderBy: {
        createTime: 'desc',
      },
    });

    // 转换数据
    return results.map(this.roleToResponseDto);
  }

  /**
   * 根据 ID 查询单个角色
   * @param roleId 角色ID
   * @returns 角色信息
   */
  async findOne(roleId: number): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({
      where: { roleId },
    });

    if (!role) {
      throw new NotFoundException(`角色 ID ${roleId} 不存在`);
    }

    return plainToInstance(RoleResponseDto, role, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 创建角色
   * @param createRoleDto 创建角色 DTO
   * @returns 创建的角色信息
   */
  async create(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    // 检查角色编码是否已存在
    const existingRole = await this.prisma.role.findUnique({
      where: { roleCode: createRoleDto.roleCode },
    });

    if (existingRole) {
      throw new ConflictException('角色编码已存在');
    }

    // 创建角色
    const result = await this.prisma.role.create({
      data: {
        roleName: createRoleDto.roleName,
        roleCode: createRoleDto.roleCode,
        description: createRoleDto.description,
        enabled: createRoleDto.enabled ?? true,
      },
    });

    return plainToInstance(RoleResponseDto, result, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 更新角色
   * @param roleId 角色ID
   * @param updateRoleDto 更新角色 DTO
   * @returns 更新后的角色信息
   */
  async update(
    roleId: number,
    updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    // 检查角色是否存在
    const existingRole = await this.prisma.role.findUnique({
      where: { roleId },
    });

    if (!existingRole) {
      throw new NotFoundException(`角色 ID ${roleId} 不存在`);
    }

    // 如果更新了角色编码，检查新编码是否已存在
    if (
      updateRoleDto.roleCode &&
      updateRoleDto.roleCode !== existingRole.roleCode
    ) {
      const roleWithSameCode = await this.prisma.role.findUnique({
        where: { roleCode: updateRoleDto.roleCode },
      });

      if (roleWithSameCode) {
        throw new ConflictException('角色编码已存在');
      }
    }

    // 构建更新数据
    const updateData: Prisma.RoleUpdateInput = {};

    if (updateRoleDto.roleName !== undefined) {
      updateData.roleName = updateRoleDto.roleName;
    }
    if (updateRoleDto.roleCode !== undefined) {
      updateData.roleCode = updateRoleDto.roleCode;
    }
    if (updateRoleDto.description !== undefined) {
      updateData.description = updateRoleDto.description;
    }
    if (updateRoleDto.enabled !== undefined) {
      updateData.enabled = updateRoleDto.enabled;
    }

    // 执行更新
    const result = await this.prisma.role.update({
      where: { roleId },
      data: updateData,
    });

    return plainToInstance(RoleResponseDto, result, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 删除角色
   * @param roleId 角色ID
   * @returns 删除的角色信息
   */
  async remove(roleId: number): Promise<RoleResponseDto> {
    // 检查角色是否存在
    const existingRole = await this.prisma.role.findUnique({
      where: { roleId },
      include: {
        userRoles: true,
      },
    });

    if (!existingRole) {
      throw new NotFoundException(`角色 ID ${roleId} 不存在`);
    }

    // 检查是否有用户使用该角色
    if (existingRole.userRoles && existingRole.userRoles.length > 0) {
      throw new ConflictException('该角色已被用户使用，无法删除');
    }

    // 执行删除（级联删除关联的菜单和按钮权限）
    const result = await this.prisma.role.delete({
      where: { roleId },
    });

    return plainToInstance(RoleResponseDto, result, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 获取角色权限
   * @param roleId 角色ID
   * @returns 角色权限列表（菜单权限和按钮权限）
   */
  async getRolePermissions(
    roleId: number,
  ): Promise<RolePermissionsResponseDto[]> {
    // 检查角色是否存在
    const role = await this.prisma.role.findUnique({
      where: { roleId },
    });

    if (!role) {
      throw new NotFoundException(`角色 ID ${roleId} 不存在`);
    }

    // 并行查询菜单权限和按钮权限
    const [roleMenus, roleMenuButtons] = await Promise.all([
      this.prisma.roleMenu.findMany({
        where: { roleId },
        select: {
          menuId: true,
        },
      }),
      this.prisma.roleMenuButton.findMany({
        where: { roleId },
        select: {
          menuId: true,
          buttonId: true,
        },
      }),
    ]);

    // 收集所有有权限的菜单ID（包括菜单权限和按钮权限）
    const menuIdSet = new Set<number>();
    roleMenus.forEach((rm) => menuIdSet.add(rm.menuId));
    roleMenuButtons.forEach((rmb) => menuIdSet.add(rmb.menuId));

    // 按菜单ID分组，收集每个菜单的按钮ID列表
    const buttonMap = new Map<number, number[]>();
    for (const rmb of roleMenuButtons) {
      if (!buttonMap.has(rmb.menuId)) {
        buttonMap.set(rmb.menuId, []);
      }
      buttonMap.get(rmb.menuId)!.push(rmb.buttonId);
    }

    // 转换为响应格式
    const permissions: RolePermissionsResponseDto[] = [];
    for (const menuId of menuIdSet) {
      const hasMenuPermission = roleMenus.some((rm) => rm.menuId === menuId);
      permissions.push({
        menuId,
        hasMenuPermission,
        buttonIds: buttonMap.get(menuId) || [],
      });
    }

    return permissions;
  }

  /**
   * 分配角色权限
   * @param roleId 角色ID
   * @param assignDto 权限分配 DTO
   */
  async assignRolePermissions(
    roleId: number,
    assignDto: AssignRolePermissionsDto,
  ): Promise<void> {
    // 检查角色是否存在
    const role = await this.prisma.role.findUnique({
      where: { roleId },
    });

    if (!role) {
      throw new NotFoundException(`角色 ID ${roleId} 不存在`);
    }

    // 使用事务确保数据一致性
    await this.prisma.$transaction(async (tx) => {
      // 1. 删除该角色的所有现有权限（菜单权限和按钮权限）
      await Promise.all([
        tx.roleMenu.deleteMany({
          where: { roleId },
        }),
        tx.roleMenuButton.deleteMany({
          where: { roleId },
        }),
      ]);

      // 2. 准备插入的菜单权限和按钮权限
      const menuPermissionsToCreate: Prisma.RoleMenuCreateManyInput[] = [];
      const buttonPermissionsToCreate: Prisma.RoleMenuButtonCreateManyInput[] =
        [];

      for (const permission of assignDto.permissions) {
        // 验证菜单是否存在
        const menu = await tx.menu.findUnique({
          where: { id: permission.menuId },
        });

        if (!menu) {
          throw new NotFoundException(`菜单 ID ${permission.menuId} 不存在`);
        }

        // 只要权限项在列表中，就表示有菜单权限
        // 添加菜单权限
        menuPermissionsToCreate.push({
          roleId,
          menuId: permission.menuId,
        });

        // 如果有按钮权限，验证并添加按钮权限
        if (permission.buttonIds && permission.buttonIds.length > 0) {
          for (const buttonId of permission.buttonIds) {
            const button = await tx.menuButton.findUnique({
              where: { id: buttonId },
            });

            if (!button) {
              throw new NotFoundException(`按钮 ID ${buttonId} 不存在`);
            }

            // 验证按钮是否属于该菜单
            if (button.menuId !== permission.menuId) {
              throw new ConflictException(
                `按钮 ID ${buttonId} 不属于菜单 ID ${permission.menuId}`,
              );
            }

            buttonPermissionsToCreate.push({
              roleId,
              menuId: permission.menuId,
              buttonId,
            });
          }
        }
      }

      // 批量插入权限
      if (menuPermissionsToCreate.length > 0) {
        await tx.roleMenu.createMany({
          data: menuPermissionsToCreate,
        });
      }

      if (buttonPermissionsToCreate.length > 0) {
        await tx.roleMenuButton.createMany({
          data: buttonPermissionsToCreate,
        });
      }
    });

    // 清除所有拥有该角色的用户的缓存（权限变更后需要清除）
    await this.clearUsersCacheByRole(roleId);
  }

  /**
   * 清除拥有指定角色的所有用户的缓存
   * @param roleId 角色ID
   */
  private async clearUsersCacheByRole(roleId: number): Promise<void> {
    // 查询所有拥有该角色的用户
    const userRoles = await this.prisma.userRole.findMany({
      where: { roleId },
      select: { userId: true },
    });

    if (userRoles.length === 0) {
      return;
    }

    // 清除这些用户的缓存
    const userIds = userRoles.map((ur) => ur.userId);
    await Promise.all(
      userIds.map((userId) =>
        Promise.all([
          this.cacheManager.del(getRedisKey(USER_INFO_KEY, userId)),
          this.cacheManager.del(getRedisKey(USER_PERMISSIONS_KEY, userId)),
        ]),
      ),
    );
  }
}
