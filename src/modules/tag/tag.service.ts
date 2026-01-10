import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from 'nestjs-prisma';
import { CreateTagDto } from './dto/create-tag.dto';
import { BatchCreateTagDto } from './dto/batch-create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { UpdateTagGroupDto } from './dto/update-tag-group.dto';
import { QueryTagDto } from './dto/query-tag.dto';
import { TagResponseDto } from './dto/tag-response.dto';
import { TagTreeResponseDto } from './dto/tag-tree-response.dto';
import { Prisma } from '@prisma/client';
import { buildTagTree } from '@/common/helpers';

/**
 * 标签服务
 */
@Injectable()
export class TagService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取标签树形结构
   * @param query 查询参数
   * @returns 树形标签列表
   */
  async getTagTree(query: QueryTagDto): Promise<TagTreeResponseDto[]> {
    const { groupCode, groupName, groupStatus, label, value, status } = query;

    const queryValues = Object.values(query);
    const everyValueIsEmpty = queryValues.every((value) => !value);

    // 构建查询条件
    const where: Prisma.TagWhereInput = {};

    if (groupCode) {
      where.groupCode = { contains: groupCode };
    }
    if (groupName) {
      where.groupName = { contains: groupName };
    }
    if (groupStatus !== undefined) {
      where.groupStatus = groupStatus;
    }
    if (label) {
      where.label = { contains: label };
    }
    if (value) {
      where.value = { contains: value };
    }
    if (status !== undefined) {
      where.status = status;
    }

    // 查询所有符合条件的标签数据
    const tags = await this.prisma.tag.findMany({
      where,
      orderBy: [{ groupCode: 'asc' }, { sort: 'asc' }, { createTime: 'asc' }],
    });

    return buildTagTree(tags);
  }

  /**
   * 根据标签组代码获取标签数据
   * @param groupCode 标签组代码
   * @param status 状态（可选）
   * @returns 标签数据列表
   */
  async getTagsByGroup(
    groupCode: string,
    status?: number,
  ): Promise<TagResponseDto[]> {
    const where: Prisma.TagWhereInput = {
      groupCode,
    };

    if (status !== undefined) {
      where.status = status;
    }

    const tags = await this.prisma.tag.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { createTime: 'asc' }],
    });

    return plainToInstance(TagResponseDto, tags, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 根据 ID 查询单个标签
   * @param id 标签ID
   * @returns 标签信息
   */
  async findOne(id: number): Promise<TagResponseDto> {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`标签 ID ${id} 不存在`);
    }

    return plainToInstance(TagResponseDto, tag, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 创建标签（单个，兼容旧接口）
   * @param createTagDto 创建标签 DTO
   * @param userId 创建人ID
   * @returns 创建的标签信息
   */
  async create(
    createTagDto: CreateTagDto,
    userId?: number,
  ): Promise<TagResponseDto> {
    const batchDto: BatchCreateTagDto = {
      groupCode: createTagDto.groupCode,
      groupName: createTagDto.groupName,
      tags: [
        {
          label: createTagDto.label,
          value: createTagDto.value,
          sort: createTagDto.sort,
          status: createTagDto.status,
          description: createTagDto.description,
        },
      ],
    };
    const results = await this.batchCreate(batchDto, userId);
    return results[0];
  }

  /**
   * 批量创建标签
   * @param batchCreateTagDto 批量创建标签 DTO
   * @param userId 创建人ID
   * @returns 创建的标签信息列表
   */
  async batchCreate(
    batchCreateTagDto: BatchCreateTagDto,
    userId?: number,
  ): Promise<TagResponseDto[]> {
    const { groupCode, groupName, tags } = batchCreateTagDto;

    // 检查组代码是否已存在（检查该组代码下的第一条记录）
    const existingGroupByCode = await this.prisma.tag.findFirst({
      where: { groupCode },
      select: { groupName: true },
    });

    if (existingGroupByCode) {
      // 如果组代码已存在，检查组名称是否一致
      if (existingGroupByCode.groupName !== groupName) {
        throw new ConflictException(
          `标签组代码 ${groupCode} 已存在，但组名称不匹配`,
        );
      }
    } else {
      // 如果组代码不存在，检查组名称是否已存在（检查是否有其他组代码使用了相同的组名称）
      const existingGroupByName = await this.prisma.tag.findFirst({
        where: { groupName },
        select: { groupCode: true },
      });

      if (existingGroupByName) {
        throw new ConflictException(`标签组名称 ${groupName} 已存在`);
      }
    }

    // 检查该组是否已存在，如果不存在，需要设置 groupStatus
    const existingGroup = await this.prisma.tag.findFirst({
      where: { groupCode },
      select: { groupStatus: true },
    });

    // 检查所有标签值是否已存在
    for (const tag of tags) {
      const tagValue = tag.value || tag.label; // 如果value为空，使用label
      const existingTagByValue = await this.prisma.tag.findUnique({
        where: {
          tags_group_code_value_key: {
            groupCode,
            value: tagValue,
          },
        },
      });

      if (existingTagByValue) {
        throw new ConflictException(
          `标签组 ${groupCode} 下，标签值 ${tagValue} 已存在`,
        );
      }
    }

    // 批量创建标签
    const createData = tags.map((tag) => ({
      groupCode,
      groupName,
      groupStatus: existingGroup?.groupStatus ?? 1, // 如果组已存在，使用已有的 groupStatus；否则默认为启用
      label: tag.label,
      value: tag.value || tag.label, // 如果value为空，使用label
      sort: tag.sort ?? 0,
      status: tag.status ?? 1,
      description: tag.description,
      createBy: userId,
    }));

    // 使用 Promise.all 批量创建
    const results = await Promise.all(
      createData.map((data) => this.prisma.tag.create({ data })),
    );

    return plainToInstance(TagResponseDto, results, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 更新标签
   * @param id 标签ID
   * @param updateTagDto 更新标签 DTO
   * @param userId 更新人ID
   * @returns 更新后的标签信息
   */
  async update(
    id: number,
    updateTagDto: UpdateTagDto,
    userId?: number,
  ): Promise<TagResponseDto> {
    // 检查标签是否存在
    const existingTag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      throw new NotFoundException(`标签 ID ${id} 不存在`);
    }

    // 如果更新了 groupCode 或 value，检查新组合是否已存在
    const newGroupCode = updateTagDto.groupCode ?? existingTag.groupCode;
    const newValue = updateTagDto.value ?? existingTag.value;

    if (
      (updateTagDto.groupCode || updateTagDto.value) &&
      (newGroupCode !== existingTag.groupCode || newValue !== existingTag.value)
    ) {
      const tagWithSameKey = await this.prisma.tag.findUnique({
        where: {
          tags_group_code_value_key: {
            groupCode: newGroupCode,
            value: newValue,
          },
        },
      });

      if (tagWithSameKey && tagWithSameKey.id !== id) {
        throw new ConflictException(
          `标签组 ${newGroupCode} 下，标签值 ${newValue} 已存在`,
        );
      }
    }

    // 构建更新数据
    const updateData: Prisma.TagUpdateInput = {};

    if (updateTagDto.groupCode !== undefined) {
      updateData.groupCode = updateTagDto.groupCode;
    }
    if (updateTagDto.groupName !== undefined) {
      updateData.groupName = updateTagDto.groupName;
    }
    if (updateTagDto.label !== undefined) {
      updateData.label = updateTagDto.label;
    }
    if (updateTagDto.value !== undefined) {
      updateData.value = updateTagDto.value;
    }
    if (updateTagDto.sort !== undefined) {
      updateData.sort = updateTagDto.sort;
    }
    if (updateTagDto.status !== undefined) {
      updateData.status = updateTagDto.status;
    }
    if (updateTagDto.description !== undefined) {
      updateData.description = updateTagDto.description;
    }
    if (userId !== undefined) {
      updateData.updateBy = userId;
    }

    // 更新标签
    const result = await this.prisma.tag.update({
      where: { id },
      data: updateData,
    });

    return plainToInstance(TagResponseDto, result, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 删除标签
   * @param id 标签ID
   * @returns 删除的标签信息
   */
  async remove(id: number): Promise<TagResponseDto> {
    // 检查标签是否存在
    const existingTag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      throw new NotFoundException(`标签 ID ${id} 不存在`);
    }

    // 删除标签
    await this.prisma.tag.delete({
      where: { id },
    });

    return plainToInstance(TagResponseDto, existingTag, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 批量删除标签
   * @param ids 标签ID数组
   * @returns 删除的标签数量
   */
  async batchRemove(ids: number[]): Promise<number> {
    if (!ids || ids.length === 0) {
      return 0;
    }

    // 检查所有标签是否存在
    const existingTags = await this.prisma.tag.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    const existingIds = existingTags.map((tag) => tag.id);
    const notFoundIds = ids.filter((id) => !existingIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new NotFoundException(
        `以下标签ID不存在: ${notFoundIds.join(', ')}`,
      );
    }

    // 批量删除标签
    const result = await this.prisma.tag.deleteMany({
      where: { id: { in: ids } },
    });

    return result.count;
  }

  /**
   * 更新标签组
   * @param groupCode 标签组代码
   * @param updateTagGroupDto 更新标签组 DTO
   * @param userId 更新人ID
   * @returns 更新后的标签组信息
   */
  async updateTagGroup(
    groupCode: string,
    updateTagGroupDto: UpdateTagGroupDto,
    userId?: number,
  ): Promise<void> {
    // 检查标签组是否存在
    const existingGroup = await this.prisma.tag.findFirst({
      where: { groupCode },
    });

    if (!existingGroup) {
      throw new NotFoundException(`标签组 ${groupCode} 不存在`);
    }

    // 如果更新了 groupCode，检查新 groupCode 是否已存在
    if (
      updateTagGroupDto.groupCode &&
      updateTagGroupDto.groupCode !== groupCode
    ) {
      const newGroupExists = await this.prisma.tag.findFirst({
        where: { groupCode: updateTagGroupDto.groupCode },
      });

      if (newGroupExists) {
        throw new ConflictException(
          `标签组代码 ${updateTagGroupDto.groupCode} 已存在`,
        );
      }
    }

    // 构建更新数据
    const updateData: Prisma.TagUpdateInput = {};

    if (updateTagGroupDto.groupCode !== undefined) {
      updateData.groupCode = updateTagGroupDto.groupCode;
    }
    if (updateTagGroupDto.groupName !== undefined) {
      updateData.groupName = updateTagGroupDto.groupName;
    }
    if (updateTagGroupDto.groupStatus !== undefined) {
      updateData.groupStatus = updateTagGroupDto.groupStatus;
    }
    if (updateTagGroupDto.description !== undefined) {
      updateData.description = updateTagGroupDto.description;
    }
    if (userId !== undefined) {
      updateData.updateBy = userId;
    }

    // 更新该组下所有标签记录
    await this.prisma.tag.updateMany({
      where: { groupCode },
      data: updateData,
    });
  }
}
