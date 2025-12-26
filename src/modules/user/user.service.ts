import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from 'nestjs-prisma';
import * as bcrypt from 'bcrypt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserInfoResponseDto } from './dto/user-info-response.dto';
import { createPaginatedResponse } from '@/common/helpers';
import { PaginatedDto } from '@/common/dto/paginated.dto';
import { Prisma } from '@prisma/client';
import {
  USER_VERSION_KEY,
  USER_INFO_KEY,
  USER_PERMISSIONS_KEY,
  USER_TOKEN_KEY,
  getRedisKey,
} from '@/common/constants/redis-key.constants';
import { EnableStatus } from '@/common/constants/enums';

/**
 * 用户服务
 */
@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 获取当前用户信息（包含角色和按钮权限）
   * @param userId 用户ID
   * @returns 用户信息
   */
  async getUserInfo(userId: number): Promise<UserInfoResponseDto> {
    // 查询用户基本信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.status !== EnableStatus.ENABLED) {
      throw new ForbiddenException('用户已被禁用');
    }

    // 提取角色编码
    const roles = user.userRoles?.map((ur) => ur.role.roleCode) || [];

    // 获取用户按钮权限
    const permissions = await this.getPermissionsForRoles(roles);

    return {
      userId: Number(user.id),
      userName: user.userName,
      nickName: user.nickName,
      email: user.email,
      avatar: user.avatar,
      userGender: user.userGender,
      roles,
      buttons: permissions.buttons,
    };
  }

  /**
   * 查询 RoleMenuButtonDetail 视图
   * @param roleCodes 角色编码数组，不传递则查询所有数据
   * @returns 视图数据列表
   */
  async queryRoleMenuButtonDetail(roleCodes?: string[]): Promise<any[]> {
    const where: any = {
      roleEnabled: true,
      menuStatus: EnableStatus.ENABLED,
    };

    // 如果传递了角色编码数组，则查询指定角色的数据
    if (roleCodes && roleCodes.length > 0) {
      // 先查询角色ID
      const roles = await this.prisma.role.findMany({
        where: {
          roleCode: { in: roleCodes },
          enabled: true,
        },
        select: {
          roleId: true,
        },
      });

      const roleIds = roles.map((r) => r.roleId);
      if (roleIds.length === 0) {
        return [];
      }

      where.roleId = { in: roleIds };
    }

    return this.prisma.roleMenuButtonDetail.findMany({
      where,
      orderBy: [{ menuId: 'asc' }, { buttonSortOrder: 'asc' }],
    });
  }

  /**
   * 根据角色获取权限（菜单+按钮）
   * @param roleCodes 角色编码数组
   * @returns 权限信息
   */
  async getPermissionsForRoles(roleCodes: string[]): Promise<{
    menus: any[];
    buttons: string[];
  }> {
    if (!roleCodes || roleCodes.length === 0) {
      return { menus: [], buttons: [] };
    }

    // 查询视图数据（包含角色、菜单、按钮的完整信息）
    const viewData = await this.queryRoleMenuButtonDetail(roleCodes);

    // 从视图数据中提取角色ID（视图已包含角色信息，无需单独查询）
    const roleIdSet = new Set<number>();
    viewData.forEach((v) => roleIdSet.add(v.roleId));

    // 如果视图数据为空，查询角色ID（可能只有菜单权限没有按钮权限）
    let roleIds: number[] = [];
    if (roleIdSet.size > 0) {
      roleIds = Array.from(roleIdSet);
    } else {
      // 视图数据为空，查询角色ID
      const roles = await this.prisma.role.findMany({
        where: {
          roleCode: { in: roleCodes },
          enabled: true,
        },
        select: {
          roleId: true,
        },
      });
      roleIds = roles.map((r) => r.roleId);
      if (roleIds.length === 0) {
        return { menus: [], buttons: [] };
      }
    }

    // 查询所有有菜单权限的菜单（只从 RoleMenu 表查询，确保只有菜单权限的菜单才返回）
    const roleMenus = await this.prisma.roleMenu.findMany({
      where: {
        roleId: { in: roleIds },
      },
      select: {
        menuId: true,
      },
    });

    // 菜单列表：只包含有菜单权限的菜单（从 roleMenus 获取）
    const menuIdSet = new Set<number>();
    roleMenus.forEach((rm) => menuIdSet.add(rm.menuId));

    if (menuIdSet.size === 0) {
      return { menus: [], buttons: [] };
    }

    // 只查询菜单表中视图没有的字段（parentId, sortOrder 等必要字段）
    const menusFromDb = await this.prisma.menu.findMany({
      where: {
        id: { in: Array.from(menuIdSet) },
        status: EnableStatus.ENABLED,
      },
      select: {
        id: true,
        parentId: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createTime: 'asc' }],
    });

    // 从视图数据构建菜单信息映射（只包含有菜单权限的菜单）
    const menuMapFromView = new Map<number, any>();
    for (const item of viewData) {
      // 只处理有菜单权限的菜单（在 menuIdSet 中）
      if (menuIdSet.has(item.menuId) && !menuMapFromView.has(item.menuId)) {
        menuMapFromView.set(item.menuId, {
          id: item.menuId,
          name: item.menuName,
          path: item.menuPath,
          title: item.menuTitle,
          icon: item.menuIcon || undefined,
          component: item.menuComponent || undefined,
          status: item.menuStatus,
        });
      }
    }

    // 合并视图数据和数据库数据，补充 parentId 和 sortOrder
    const menuMap = new Map<number, any>();

    // 先处理有视图数据的菜单（既有菜单权限又有按钮权限）
    for (const menu of menusFromDb) {
      const viewMenu = menuMapFromView.get(menu.id);
      if (viewMenu) {
        menuMap.set(menu.id, {
          ...viewMenu,
          parentId: menu.parentId,
          sortOrder: menu.sortOrder,
        });
      }
    }

    // 处理只有菜单权限但没有按钮权限的菜单（需要查询完整信息）
    const menuIdsOnlyMenu = Array.from(menuIdSet).filter(
      (id) => !menuMapFromView.has(id),
    );

    if (menuIdsOnlyMenu.length > 0) {
      const menusOnlyMenu = await this.prisma.menu.findMany({
        where: {
          id: { in: menuIdsOnlyMenu },
          status: EnableStatus.ENABLED,
        },
        select: {
          id: true,
          parentId: true,
          name: true,
          path: true,
          component: true,
          title: true,
          icon: true,
          sortOrder: true,
          status: true,
        },
      });

      for (const menu of menusOnlyMenu) {
        menuMap.set(menu.id, {
          id: menu.id,
          parentId: menu.parentId,
          name: menu.name,
          path: menu.path,
          component: menu.component,
          title: menu.title,
          icon: menu.icon,
          sortOrder: menu.sortOrder,
          status: menu.status,
        });
      }
    }

    // 构建按钮权限集合（从所有按钮权限中提取，即使没有菜单权限也要包含）
    // 查询所有有按钮权限的记录（包括只有按钮权限的）
    const allRoleMenuButtons = await this.prisma.roleMenuButton.findMany({
      where: {
        roleId: { in: roleIds },
      },
      include: {
        button: {
          select: {
            authMark: true,
          },
        },
      },
    });

    // 提取所有按钮权限标识
    const buttonList = allRoleMenuButtons
      .map((rmb) => rmb.button?.authMark)
      .filter((authMark): authMark is string => !!authMark);

    // 构建菜单列表
    const menuList = Array.from(menuMap.values());

    return { menus: menuList, buttons: buttonList };
  }

  /**
   * 分页查询用户列表
   * @param query 查询参数（包含分页参数和过滤条件）
   * @returns 分页用户列表
   */
  async findPaginated(
    query: QueryUserDto,
  ): Promise<PaginatedDto<UserResponseDto>> {
    const {
      skip,
      take,
      current,
      size,
      name,
      roleId,
      status,
      userGender,
      startTime,
      endTime,
    } = query;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {};

    // 名称模糊查询（用户名或昵称）
    if (name && name.trim()) {
      where.OR = [
        {
          userName: {
            contains: name.trim(),
          },
        },
        {
          nickName: {
            contains: name.trim(),
          },
        },
      ];
    }

    // 角色过滤
    if (roleId !== undefined && roleId !== null) {
      const roleIdNum =
        typeof roleId === 'string' ? parseInt(roleId, 10) : roleId;
      if (!isNaN(roleIdNum)) {
        where.userRoles = {
          some: {
            roleId: roleIdNum,
          },
        };
      }
    }

    // 状态过滤
    if (status) {
      where.status = status;
    }

    // 性别过滤
    if (userGender) {
      where.userGender = userGender;
    }

    // 日期范围过滤（注册日期，即创建日期）
    if (startTime || endTime) {
      where.createTime = {};
      if (startTime) {
        where.createTime.gte = new Date(startTime);
      }
      if (endTime) {
        // 结束日期需要包含当天的23:59:59
        const endDate = new Date(endTime);
        endDate.setHours(23, 59, 59, 999);
        where.createTime.lte = endDate;
      }
    }

    // 并行查询数据和总数
    const [results, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: {
          createTime: 'desc',
        },
        skip,
        take,
      }),
      this.prisma.user.count({
        where,
      }),
    ]);

    // 转换数据（排除密码，提取角色编码）
    const records = results.map((result) => {
      const { password: _, userRoles, ...userWithoutPassword } = result;
      // 提取角色编码数组
      const roleCodes = userRoles?.map((ur) => ur.role.roleCode) || [];

      return plainToInstance(
        UserResponseDto,
        {
          ...userWithoutPassword,
          id: userWithoutPassword.id,
          userRoles: roleCodes,
        },
        {
          excludeExtraneousValues: false,
        },
      );
    });

    // 创建分页响应
    return createPaginatedResponse(
      records,
      { skip, take, current, size },
      totalItems,
    );
  }

  /**
   * 创建用户
   * @param createUserDto 创建用户 DTO
   * @param currentUserId 当前用户ID（用于记录创建人）
   * @returns 创建的用户信息
   */
  async create(
    createUserDto: CreateUserDto,
    currentUserId?: number,
  ): Promise<UserResponseDto> {
    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { userName: createUserDto.userName },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // 创建用户
    const result = await this.prisma.user.create({
      data: {
        userName: createUserDto.userName,
        password: hashedPassword,
        nickName: createUserDto.nickName,
        email: createUserDto.email,
        avatar: createUserDto.avatar,
        userPhone: createUserDto.userPhone,
        userGender: createUserDto.userGender || 'unknown',
        status: createUserDto.status || EnableStatus.ENABLED,
        createBy: currentUserId,
        remark: createUserDto.remark,
      },
    });

    // 绑定角色（如果提供了角色编码）
    if (createUserDto.roleCodes && createUserDto.roleCodes.length > 0) {
      await this.bindUserRoles(result.id, createUserDto.roleCodes);
    }

    const { password: _, ...userWithoutPassword } = result;
    return plainToInstance(
      UserResponseDto,
      {
        ...userWithoutPassword,
        id: Number(userWithoutPassword.id),
      },
      {
        excludeExtraneousValues: false,
      },
    );
  }

  /**
   * 更新用户
   * @param id 用户ID
   * @param updateUserDto 更新用户 DTO
   * @param currentUserId 当前用户ID（用于记录更新人）
   * @returns 更新后的用户信息
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserId?: number,
  ): Promise<UserResponseDto> {
    const userIdInt = parseInt(id, 10);

    // 检查用户是否存在
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userIdInt },
    });

    if (!existingUser) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }

    // 构建更新数据
    const updateData: Prisma.UserUpdateInput = {
      updateBy: currentUserId,
    };

    // 如果提供了密码，需要加密
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // 更新其他字段
    if (updateUserDto.nickName !== undefined) {
      updateData.nickName = updateUserDto.nickName;
    }
    if (updateUserDto.email !== undefined) {
      updateData.email = updateUserDto.email;
    }
    if (updateUserDto.avatar !== undefined) {
      updateData.avatar = updateUserDto.avatar;
    }
    if (updateUserDto.userPhone !== undefined) {
      updateData.userPhone = updateUserDto.userPhone;
    }
    if (updateUserDto.userGender !== undefined) {
      updateData.userGender = updateUserDto.userGender;
    }
    if (updateUserDto.status !== undefined) {
      updateData.status = updateUserDto.status;
    }
    if (updateUserDto.remark !== undefined) {
      updateData.remark = updateUserDto.remark;
    }

    // 执行更新
    const result = await this.prisma.user.update({
      where: { id: userIdInt },
      data: updateData,
    });

    // 更新角色绑定（如果提供了角色编码）
    if (updateUserDto.roleCodes !== undefined) {
      // 先删除所有现有角色关联
      await this.prisma.userRole.deleteMany({
        where: { userId: userIdInt },
      });

      // 如果提供了角色编码数组，创建新的角色关联
      if (updateUserDto.roleCodes.length > 0) {
        await this.bindUserRoles(userIdInt, updateUserDto.roleCodes);
      }
    }

    // 清除用户缓存（用户信息或角色变更后需要清除）
    await this.clearUserCache(userIdInt);

    const { password: _, ...userWithoutPassword } = result;
    return plainToInstance(
      UserResponseDto,
      {
        ...userWithoutPassword,
        id: Number(userWithoutPassword.id),
      },
      {
        excludeExtraneousValues: false,
      },
    );
  }

  /**
   * 清除用户缓存
   * @param userId 用户ID
   */
  private async clearUserCache(userId: number): Promise<void> {
    await Promise.all([
      this.cacheManager.del(getRedisKey(USER_INFO_KEY, userId)),
      this.cacheManager.del(getRedisKey(USER_PERMISSIONS_KEY, userId)),
    ]);
  }

  /**
   * 绑定用户角色
   * @param userId 用户ID
   * @param roleCodes 角色编码数组
   */
  private async bindUserRoles(
    userId: number,
    roleCodes: string[],
  ): Promise<void> {
    if (!roleCodes || roleCodes.length === 0) {
      return;
    }

    // 根据角色编码查找角色ID
    const roles = await this.prisma.role.findMany({
      where: {
        roleCode: {
          in: roleCodes,
        },
      },
      select: {
        roleId: true,
        roleCode: true,
      },
    });

    if (roles.length === 0) {
      throw new NotFoundException('未找到指定的角色');
    }

    // 检查是否所有角色编码都找到了
    const foundRoleCodes = roles.map((r) => r.roleCode);
    const notFoundRoleCodes = roleCodes.filter(
      (code) => !foundRoleCodes.includes(code),
    );

    if (notFoundRoleCodes.length > 0) {
      throw new NotFoundException(
        `未找到以下角色编码: ${notFoundRoleCodes.join(', ')}`,
      );
    }

    // 创建用户角色关联
    await this.prisma.userRole.createMany({
      data: roles.map((role) => ({
        userId,
        roleId: role.roleId,
      })),
      skipDuplicates: true, // 跳过重复的关联
    });
  }

  /**
   * 删除用户
   * @param id 用户ID
   * @returns 删除的用户信息
   */
  async remove(id: string): Promise<UserResponseDto> {
    const userIdInt = parseInt(id, 10);

    // 检查用户是否存在
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userIdInt },
    });

    if (!existingUser) {
      throw new NotFoundException(`用户 ID ${id} 不存在`);
    }

    // 检查是否是当前登录用户（防止删除自己）
    // 注意：这里需要从上下文获取当前用户ID，暂时先不检查

    // 清除用户所有缓存（删除用户前清除）
    await Promise.all([
      this.cacheManager.del(getRedisKey(USER_TOKEN_KEY, userIdInt)),
      this.cacheManager.del(getRedisKey(USER_VERSION_KEY, userIdInt)),
      this.cacheManager.del(getRedisKey(USER_INFO_KEY, userIdInt)),
      this.cacheManager.del(getRedisKey(USER_PERMISSIONS_KEY, userIdInt)),
    ]);

    // 执行删除（硬删除）
    const result = await this.prisma.user.delete({
      where: { id: userIdInt },
    });

    const { password: _, ...userWithoutPassword } = result;
    return plainToInstance(
      UserResponseDto,
      {
        ...userWithoutPassword,
        id: Number(userWithoutPassword.id),
      },
      {
        excludeExtraneousValues: false,
      },
    );
  }

  /**
   * 更改密码
   * @param userId 用户ID
   * @param changePasswordDto 更改密码 DTO
   * @returns 成功消息
   */
  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    // 验证新密码和确认密码是否一致
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException('新密码和确认密码不一致');
    }

    // 查询用户
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(
      changePasswordDto.oldPassword,
      user.password,
    );

    if (!isOldPasswordValid) {
      throw new BadRequestException('当前密码不正确');
    }

    // 检查新密码是否与旧密码相同
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }

    // 加密新密码
    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );

    // 获取当前密码版本号
    const currentVersion = await this.cacheManager.get<string>(
      getRedisKey(USER_VERSION_KEY, userId),
    );
    const newVersion = currentVersion ? parseInt(currentVersion, 10) + 1 : 1;

    // 更新密码和密码版本号
    await Promise.all([
      // 更新数据库中的密码
      this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      }),
      // 更新 Redis 中的密码版本号（使旧 Token 失效）
      this.cacheManager.set(
        getRedisKey(USER_VERSION_KEY, userId),
        newVersion.toString(),
        7 * 24 * 60 * 60 * 1000, // 7天过期时间
      ),
      // 清除用户信息缓存（密码变更后需要清除）
      this.clearUserCache(userId),
    ]);

    return { message: '密码修改成功' };
  }
}
