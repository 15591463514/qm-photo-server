import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from 'nestjs-prisma';
import { CreateDictDto } from './dto/create-dict.dto';
import { UpdateDictDto } from './dto/update-dict.dto';
import { UpdateDictTypeDto } from './dto/update-dict-type.dto';
import { QueryDictDto } from './dto/query-dict.dto';
import { DictResponseDto } from './dto/dict-response.dto';
import { DictTreeResponseDto } from './dto/dict-tree-response.dto';
import { Prisma } from '@prisma/client';
import { EnableStatus } from '@/common/constants/enums';
import { DictStoreService } from './dict.store';
import { buildDictTree } from '@/common/helpers';

/**
 * 字典服务
 */
@Injectable()
export class DictService {
  constructor(
    private prisma: PrismaService,
    private dictStore: DictStoreService,
  ) {}

  /**
   * 获取字典树形结构
   * @param query 查询参数
   * @returns 树形字典列表
   */
  async getDictTree(query: QueryDictDto): Promise<DictTreeResponseDto[]> {
    const { typeCode, typeName, typeStatus, dataLabel, dataValue, status } =
      query;

    const queryValues = Object.values(query);
    const everyValueIsEmpty = queryValues.every((value) => !value);

    // 查询所有字典数据
    if (everyValueIsEmpty) {
      const dicts = await this.dictStore.getAllDicts();
      return buildDictTree(dicts);
    }

    // 构建查询条件
    const where: Prisma.DictWhereInput = {};

    if (typeCode) {
      where.typeCode = { contains: typeCode };
    }
    if (typeName) {
      where.typeName = { contains: typeName };
    }
    if (typeStatus) {
      where.typeStatus = typeStatus;
    }
    if (dataLabel) {
      where.dataLabel = { contains: dataLabel };
    }
    if (dataValue) {
      where.dataValue = { contains: dataValue };
    }
    if (status) {
      where.status = status;
    }

    // 查询所有符合条件的字典数据
    const dicts = await this.prisma.dict.findMany({
      where,
      orderBy: [
        { typeCode: 'asc' },
        { sortOrder: 'asc' },
        { createTime: 'asc' },
      ],
    });

    return buildDictTree(dicts);
  }

  /**
   * 根据字典类型获取字典数据
   * @param typeCode 字典类型编码
   * @param status 状态（可选）
   * @returns 字典数据列表
   */
  async getDictDataByType(
    typeCode: string,
    status?: string,
  ): Promise<DictResponseDto[]> {
    const where: Prisma.DictWhereInput = {
      typeCode,
    };

    if (status) {
      where.status = status;
    }

    const dicts = await this.prisma.dict.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createTime: 'asc' }],
    });

    return plainToInstance(DictResponseDto, dicts, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 根据 ID 查询单个字典
   * @param id 字典ID
   * @returns 字典信息
   */
  async findOne(id: number): Promise<DictResponseDto> {
    const dict = await this.prisma.dict.findUnique({
      where: { id },
    });

    if (!dict) {
      throw new NotFoundException(`字典 ID ${id} 不存在`);
    }

    return plainToInstance(DictResponseDto, dict, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 创建字典
   * @param createDictDto 创建字典 DTO
   * @param userId 创建人ID
   * @returns 创建的字典信息
   */
  async create(
    createDictDto: CreateDictDto,
    userId?: number,
  ): Promise<DictResponseDto> {
    // 检查类型编码是否已存在（检查该类型编码下的第一条记录）
    const existingTypeByCode = await this.prisma.dict.findFirst({
      where: { typeCode: createDictDto.typeCode },
      select: { typeName: true },
    });

    if (existingTypeByCode) {
      // 如果类型编码已存在，检查类型名称是否一致
      if (existingTypeByCode.typeName !== createDictDto.typeName) {
        throw new ConflictException(
          `字典类型编码 ${createDictDto.typeCode} 已存在，但类型名称不匹配`,
        );
      }
    } else {
      // 如果类型编码不存在，检查类型名称是否已存在（检查是否有其他类型编码使用了相同的类型名称）
      const existingTypeByName = await this.prisma.dict.findFirst({
        where: { typeName: createDictDto.typeName },
        select: { typeCode: true },
      });

      if (existingTypeByName) {
        throw new ConflictException(
          `字典类型名称 ${createDictDto.typeName} 已存在`,
        );
      }
    }

    // 检查同一类型下字典值是否已存在
    const existingDictByValue = await this.prisma.dict.findUnique({
      where: {
        uk_type_value: {
          typeCode: createDictDto.typeCode,
          dataValue: createDictDto.dataValue,
        },
      },
    });

    if (existingDictByValue) {
      throw new ConflictException(
        `字典类型 ${createDictDto.typeCode} 下，字典值 ${createDictDto.dataValue} 已存在`,
      );
    }

    // 检查同一类型下排序是否已存在
    const sortOrder = createDictDto.sortOrder ?? 0;
    const existingDictBySort = await this.prisma.dict.findUnique({
      where: {
        uk_type_sort: {
          typeCode: createDictDto.typeCode,
          sortOrder: sortOrder,
        },
      },
    });

    if (existingDictBySort) {
      throw new ConflictException(
        `字典类型 ${createDictDto.typeCode} 下，排序 ${sortOrder} 已存在`,
      );
    }

    // 如果设置为默认值，需要将同一类型下其他字典的默认值关闭
    const isDefault = createDictDto.isDefault ?? false;
    if (isDefault) {
      await this.prisma.dict.updateMany({
        where: {
          typeCode: createDictDto.typeCode,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // 检查该类型是否已存在，如果不存在，需要设置 typeStatus
    const existingType = await this.prisma.dict.findFirst({
      where: { typeCode: createDictDto.typeCode },
      select: { typeStatus: true },
    });

    // 创建字典
    const result = await this.prisma.dict.create({
      data: {
        typeCode: createDictDto.typeCode,
        typeName: createDictDto.typeName,
        typeStatus: existingType?.typeStatus ?? EnableStatus.ENABLED, // 如果类型已存在，使用已有的 typeStatus；否则默认为启用
        dataLabel: createDictDto.dataLabel,
        dataValue: createDictDto.dataValue,
        sortOrder: createDictDto.sortOrder ?? 0,
        status: createDictDto.status ?? EnableStatus.ENABLED,
        tagStyle: createDictDto.tagStyle,
        isDefault: isDefault,
        remark: createDictDto.remark,
        createBy: userId,
      },
    });

    // 清除字典缓存
    await this.dictStore.clearAllCacheDicts();

    return plainToInstance(DictResponseDto, result, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 更新字典
   * @param id 字典ID
   * @param updateDictDto 更新字典 DTO
   * @param userId 更新人ID
   * @returns 更新后的字典信息
   */
  async update(
    id: number,
    updateDictDto: UpdateDictDto,
    userId?: number,
  ): Promise<DictResponseDto> {
    // 检查字典是否存在
    const existingDict = await this.prisma.dict.findUnique({
      where: { id },
    });

    if (!existingDict) {
      throw new NotFoundException(`字典 ID ${id} 不存在`);
    }

    // 如果更新了 typeCode 或 dataValue，检查新组合是否已存在
    const newTypeCode = updateDictDto.typeCode ?? existingDict.typeCode;
    const newDataValue = updateDictDto.dataValue ?? existingDict.dataValue;

    if (
      (updateDictDto.typeCode || updateDictDto.dataValue) &&
      (newTypeCode !== existingDict.typeCode ||
        newDataValue !== existingDict.dataValue)
    ) {
      const dictWithSameKey = await this.prisma.dict.findUnique({
        where: {
          uk_type_value: {
            typeCode: newTypeCode,
            dataValue: newDataValue,
          },
        },
      });

      if (dictWithSameKey && dictWithSameKey.id !== id) {
        throw new ConflictException(
          `字典类型 ${newTypeCode} 下，字典值 ${newDataValue} 已存在`,
        );
      }
    }

    // 如果更新了 typeCode 或 sortOrder，检查新组合是否已存在
    const newSortOrder = updateDictDto.sortOrder ?? existingDict.sortOrder;

    if (
      (updateDictDto.typeCode || updateDictDto.sortOrder !== undefined) &&
      (newTypeCode !== existingDict.typeCode ||
        newSortOrder !== existingDict.sortOrder)
    ) {
      const dictWithSameSort = await this.prisma.dict.findUnique({
        where: {
          uk_type_sort: {
            typeCode: newTypeCode,
            sortOrder: newSortOrder,
          },
        },
      });

      if (dictWithSameSort && dictWithSameSort.id !== id) {
        throw new ConflictException(
          `字典类型 ${newTypeCode} 下，排序 ${newSortOrder} 已存在`,
        );
      }
    }

    // 如果设置为默认值，需要将同一类型下其他字典的默认值关闭
    const newIsDefault = updateDictDto.isDefault;

    if (newIsDefault === true) {
      // 使用已确定的 newTypeCode（如果更新了 typeCode，使用新的；否则使用原有的）
      await this.prisma.dict.updateMany({
        where: {
          typeCode: newTypeCode,
          isDefault: true,
          id: {
            not: id, // 排除当前正在更新的字典
          },
        },
        data: {
          isDefault: false,
        },
      });
    }

    // 构建更新数据
    const updateData: Prisma.DictUpdateInput = {};

    if (updateDictDto.typeCode !== undefined) {
      updateData.typeCode = updateDictDto.typeCode;
    }
    if (updateDictDto.typeName !== undefined) {
      updateData.typeName = updateDictDto.typeName;
    }
    if (updateDictDto.dataLabel !== undefined) {
      updateData.dataLabel = updateDictDto.dataLabel;
    }
    if (updateDictDto.dataValue !== undefined) {
      updateData.dataValue = updateDictDto.dataValue;
    }
    if (updateDictDto.sortOrder !== undefined) {
      updateData.sortOrder = updateDictDto.sortOrder;
    }
    if (updateDictDto.status !== undefined) {
      updateData.status = updateDictDto.status;
    }
    if (updateDictDto.tagStyle !== undefined) {
      updateData.tagStyle = updateDictDto.tagStyle;
    }
    if (updateDictDto.isDefault !== undefined) {
      updateData.isDefault = updateDictDto.isDefault;
    }
    if (updateDictDto.remark !== undefined) {
      updateData.remark = updateDictDto.remark;
    }
    if (userId !== undefined) {
      updateData.updateBy = userId;
    }

    // 更新字典
    const result = await this.prisma.dict.update({
      where: { id },
      data: updateData,
    });

    // 清除字典缓存
    await this.dictStore.clearAllCacheDicts();

    return plainToInstance(DictResponseDto, result, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 删除字典
   * @param id 字典ID
   * @returns 删除的字典信息
   */
  async remove(id: number): Promise<DictResponseDto> {
    // 检查字典是否存在
    const existingDict = await this.prisma.dict.findUnique({
      where: { id },
    });

    if (!existingDict) {
      throw new NotFoundException(`字典 ID ${id} 不存在`);
    }

    // 删除字典
    await this.prisma.dict.delete({
      where: { id },
    });

    // 清除字典缓存
    await this.dictStore.clearAllCacheDicts();

    return plainToInstance(DictResponseDto, existingDict, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 更新字典类型
   * @param typeCode 字典类型编码
   * @param updateDictTypeDto 更新字典类型 DTO
   * @param userId 更新人ID
   * @returns 更新后的字典类型信息
   */
  async updateDictType(
    typeCode: string,
    updateDictTypeDto: UpdateDictTypeDto,
    userId?: number,
  ): Promise<void> {
    // 检查字典类型是否存在
    const existingType = await this.prisma.dict.findFirst({
      where: { typeCode },
    });

    if (!existingType) {
      throw new NotFoundException(`字典类型 ${typeCode} 不存在`);
    }

    // 如果更新了 typeCode，检查新 typeCode 是否已存在
    if (updateDictTypeDto.typeCode && updateDictTypeDto.typeCode !== typeCode) {
      const newTypeExists = await this.prisma.dict.findFirst({
        where: { typeCode: updateDictTypeDto.typeCode },
      });

      if (newTypeExists) {
        throw new ConflictException(
          `字典类型编码 ${updateDictTypeDto.typeCode} 已存在`,
        );
      }
    }

    // 构建更新数据
    const updateData: Prisma.DictUpdateInput = {};

    if (updateDictTypeDto.typeCode !== undefined) {
      updateData.typeCode = updateDictTypeDto.typeCode;
    }
    if (updateDictTypeDto.typeName !== undefined) {
      updateData.typeName = updateDictTypeDto.typeName;
    }
    if (updateDictTypeDto.typeStatus !== undefined) {
      updateData.typeStatus = updateDictTypeDto.typeStatus;
    }
    if (userId !== undefined) {
      updateData.updateBy = userId;
    }

    // 更新该类型下所有字典记录
    await this.prisma.dict.updateMany({
      where: { typeCode },
      data: updateData,
    });

    // 清除字典缓存
    await this.dictStore.clearAllCacheDicts();
  }

  /**
   * 删除字典类型（删除该类型下的所有字典数据）
   * @param typeCode 字典类型编码
   * @returns 删除的字典数量
   */
  async removeDictType(typeCode: string): Promise<number> {
    // 检查字典类型是否存在
    const existingType = await this.prisma.dict.findFirst({
      where: { typeCode },
    });

    if (!existingType) {
      throw new NotFoundException(`字典类型 ${typeCode} 不存在`);
    }

    // 删除该类型下的所有字典数据
    const result = await this.prisma.dict.deleteMany({
      where: { typeCode },
    });

    // 清除字典缓存
    await this.dictStore.clearAllCacheDicts();

    return result.count;
  }
}
