import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
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
import { createPaginatedResponse } from '@/common/helpers/pagination.helper';
import { PaginatedDto } from '@/common/dto/paginated.dto';
import { Prisma } from '@prisma/client';
import {
  USER_VERSION_KEY,
  getRedisKey,
} from '@/common/constants/redis-key.constants';

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

    if (!user || user.status !== '1') {
      throw new NotFoundException('用户不存在或已被禁用');
    }

    // 提取角色编码
    const roles = user.userRoles?.map((ur) => ur.role.roleCode) || [];

    // 查询用户的所有按钮权限
    // 根据文档中的 SQL 查询示例：
    // SELECT DISTINCT mb.auth_mark
    // FROM menu_buttons mb
    // INNER JOIN role_menu_buttons rmb ON mb.id = rmb.button_id
    // INNER JOIN user_roles ur ON rmb.role_id = ur.role_id
    // WHERE ur.user_id = ?
    const roleIds = user.userRoles?.map((ur) => ur.roleId) || [];

    let buttons: string[] = [];
    if (roleIds.length > 0) {
      const buttonPermissions = await this.prisma.roleMenuButton.findMany({
        where: {
          roleId: {
            in: roleIds,
          },
        },
        include: {
          button: true,
        },
      });

      // 使用 Set 去重 authMark
      const buttonSet = new Set<string>();
      buttonPermissions.forEach((rmb) => {
        if (rmb.button?.authMark) {
          buttonSet.add(rmb.button.authMark);
        }
      });
      buttons = Array.from(buttonSet);
    }

    return {
      userId: Number(user.id),
      userName: user.userName,
      nickName: user.nickName,
      email: user.email,
      avatar: user.avatar,
      roles,
      buttons,
    };
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
      userName,
      nickName,
      email,
      userPhone,
      status,
    } = query;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {};

    // 添加过滤条件
    if (userName) {
      where.userName = {
        contains: userName,
      };
    }
    if (nickName) {
      where.nickName = {
        contains: nickName,
      };
    }
    if (email) {
      where.email = {
        contains: email,
      };
    }
    if (userPhone) {
      where.userPhone = {
        contains: userPhone,
      };
    }
    if (status) {
      where.status = status;
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
        status: createUserDto.status || '1',
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
      throw new UnauthorizedException('当前密码不正确');
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
    ]);

    return { message: '密码修改成功' };
  }
}
