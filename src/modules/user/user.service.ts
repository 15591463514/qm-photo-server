import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from 'nestjs-prisma';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserInfoResponseDto } from './dto/user-info-response.dto';
import { createPaginatedResponse } from '@/common/helpers/pagination.helper';
import { PaginatedDto } from '@/common/dto/paginated.dto';
import { Prisma } from '@prisma/client';

/**
 * 用户服务
 */
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

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

    // 转换数据（排除密码）
    const records = results.map((result) => {
      const { password: _, ...userWithoutPassword } = result;
      return plainToInstance(
        UserResponseDto,
        {
          ...userWithoutPassword,
          id: userWithoutPassword.id,
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
}
