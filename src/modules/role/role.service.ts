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
import { createPaginatedResponse } from '@/common/helpers/pagination.helper';
import { PaginatedDto } from '@/common/dto/paginated.dto';
import { Prisma } from '@prisma/client';

/**
 * 角色服务
 */
@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  /**
   * 分页查询角色列表
   * @param query 查询参数（包含分页参数和过滤条件）
   * @returns 分页角色列表
   */
  async findPaginated(
    query: QueryRoleDto,
  ): Promise<PaginatedDto<RoleResponseDto>> {
    const {
      skip,
      take,
      current,
      size,
      roleId,
      roleName,
      roleCode,
      description,
      enabled,
    } = query;

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

    // 并行查询数据和总数
    const [results, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        orderBy: {
          createTime: 'desc',
        },
        skip,
        take,
      }),
      this.prisma.role.count({
        where,
      }),
    ]);

    // 转换数据
    const records = results.map((result) =>
      plainToInstance(RoleResponseDto, result, {
        excludeExtraneousValues: false,
      }),
    );

    // 创建分页响应
    return createPaginatedResponse(
      records,
      { skip, take, current, size },
      total,
    );
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
}
