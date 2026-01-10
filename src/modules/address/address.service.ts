import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from 'nestjs-prisma';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { QueryAddressDto } from './dto/query-address.dto';
import { AddressResponseDto } from './dto/address-response.dto';
import { Prisma } from '@prisma/client';
import { createPaginatedResponse } from '@/common/helpers';
import { PaginatedDto } from '@/common/dto/paginated.dto';

/**
 * 地址服务
 */
@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  /**
   * 分页查询地址列表
   * @param query 查询参数（包含分页参数和过滤条件）
   * @returns 分页地址列表
   */
  async findPaginated(
    query: QueryAddressDto,
  ): Promise<PaginatedDto<AddressResponseDto>> {
    const {
      skip,
      take,
      current,
      size,
      keyword,
      province,
      city,
      district,
      status,
    } = query;

    // 构建查询条件
    const where: Prisma.AddressWhereInput = {};

    // 关键词模糊查询（地址名称或详细地址）
    if (keyword && keyword.trim()) {
      where.OR = [
        {
          name: {
            contains: keyword.trim(),
          },
        },
        {
          detail: {
            contains: keyword.trim(),
          },
        },
      ];
    }

    // 省过滤
    if (province) {
      where.province = province;
    }

    // 市过滤
    if (city) {
      where.city = city;
    }

    // 区/县过滤
    if (district) {
      where.district = district;
    }

    // 状态过滤
    if (status !== undefined) {
      where.status = status;
    }

    // 并行查询数据和总数
    const [results, totalItems] = await Promise.all([
      this.prisma.address.findMany({
        where,
        orderBy: {
          createTime: 'desc',
        },
        skip,
        take,
      }),
      this.prisma.address.count({
        where,
      }),
    ]);

    // 转换数据
    const records = results.map((result) => {
      // 将 Decimal 类型转换为 number
      const address = {
        ...result,
        longitude: result.longitude ? Number(result.longitude) : null,
        latitude: result.latitude ? Number(result.latitude) : null,
      };

      return plainToInstance(AddressResponseDto, address, {
        excludeExtraneousValues: false,
      });
    });

    // 创建分页响应
    return createPaginatedResponse(
      records,
      { skip, take, current, size },
      totalItems,
    );
  }

  /**
   * 根据 ID 查询单个地址
   * @param id 地址ID
   * @returns 地址信息
   */
  async findOne(id: number): Promise<AddressResponseDto> {
    const address = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException(`地址 ID ${id} 不存在`);
    }

    // 将 Decimal 类型转换为 number
    const addressData = {
      ...address,
      longitude: address.longitude ? Number(address.longitude) : null,
      latitude: address.latitude ? Number(address.latitude) : null,
    };

    return plainToInstance(AddressResponseDto, addressData, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 创建地址
   * @param createAddressDto 创建地址 DTO
   * @param userId 创建人ID
   * @returns 创建的地址信息
   */
  async create(
    createAddressDto: CreateAddressDto,
    userId?: number,
  ): Promise<AddressResponseDto> {
    // 构建创建数据
    const createData: Prisma.AddressCreateInput = {
      name: createAddressDto.name,
      detail: createAddressDto.detail,
      longitude: createAddressDto.longitude,
      latitude: createAddressDto.latitude,
      province: createAddressDto.province,
      city: createAddressDto.city,
      district: createAddressDto.district,
      adcode: createAddressDto.adcode,
      description: createAddressDto.description,
      status: createAddressDto.status ?? 1,
      createBy: userId,
    };

    // 创建地址
    const result = await this.prisma.address.create({
      data: createData,
    });

    // 将 Decimal 类型转换为 number
    const addressData = {
      ...result,
      longitude: result.longitude ? Number(result.longitude) : null,
      latitude: result.latitude ? Number(result.latitude) : null,
    };

    return plainToInstance(AddressResponseDto, addressData, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 更新地址
   * @param id 地址ID
   * @param updateAddressDto 更新地址 DTO
   * @param userId 更新人ID
   * @returns 更新后的地址信息
   */
  async update(
    id: number,
    updateAddressDto: UpdateAddressDto,
    userId?: number,
  ): Promise<AddressResponseDto> {
    // 检查地址是否存在
    const existingAddress = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      throw new NotFoundException(`地址 ID ${id} 不存在`);
    }

    // 构建更新数据
    const updateData: Prisma.AddressUpdateInput = {};

    if (updateAddressDto.name !== undefined) {
      updateData.name = updateAddressDto.name;
    }
    if (updateAddressDto.detail !== undefined) {
      updateData.detail = updateAddressDto.detail;
    }
    if (updateAddressDto.longitude !== undefined) {
      updateData.longitude = updateAddressDto.longitude;
    }
    if (updateAddressDto.latitude !== undefined) {
      updateData.latitude = updateAddressDto.latitude;
    }
    if (updateAddressDto.province !== undefined) {
      updateData.province = updateAddressDto.province;
    }
    if (updateAddressDto.city !== undefined) {
      updateData.city = updateAddressDto.city;
    }
    if (updateAddressDto.district !== undefined) {
      updateData.district = updateAddressDto.district;
    }
    if (updateAddressDto.adcode !== undefined) {
      updateData.adcode = updateAddressDto.adcode;
    }
    if (updateAddressDto.description !== undefined) {
      updateData.description = updateAddressDto.description;
    }
    if (updateAddressDto.status !== undefined) {
      updateData.status = updateAddressDto.status;
    }
    if (userId !== undefined) {
      updateData.updateBy = userId;
    }

    // 更新地址
    const result = await this.prisma.address.update({
      where: { id },
      data: updateData,
    });

    // 将 Decimal 类型转换为 number
    const addressData = {
      ...result,
      longitude: result.longitude ? Number(result.longitude) : null,
      latitude: result.latitude ? Number(result.latitude) : null,
    };

    return plainToInstance(AddressResponseDto, addressData, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 批量切换地址状态
   * @param ids 地址ID数组
   * @param status 新状态（1-启用，0-禁用）
   * @param userId 更新人ID
   * @returns 更新的地址数量
   */
  async batchToggleStatus(
    ids: number[],
    status: number,
    userId?: number,
  ): Promise<number> {
    if (!ids || ids.length === 0) {
      return 0;
    }

    // 检查所有地址是否存在
    const existingAddresses = await this.prisma.address.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    const existingIds = existingAddresses.map((address) => address.id);
    const notFoundIds = ids.filter((id) => !existingIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new NotFoundException(
        `以下地址ID不存在: ${notFoundIds.join(', ')}`,
      );
    }

    // 批量更新状态
    const result = await this.prisma.address.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        updateBy: userId,
      },
    });

    return result.count;
  }

  /**
   * 删除地址
   * @param id 地址ID
   * @returns 删除的地址信息
   */
  async remove(id: number): Promise<AddressResponseDto> {
    // 检查地址是否存在
    const existingAddress = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress) {
      throw new NotFoundException(`地址 ID ${id} 不存在`);
    }

    // 删除地址
    await this.prisma.address.delete({
      where: { id },
    });

    // 将 Decimal 类型转换为 number
    const addressData = {
      ...existingAddress,
      longitude: existingAddress.longitude
        ? Number(existingAddress.longitude)
        : null,
      latitude: existingAddress.latitude
        ? Number(existingAddress.latitude)
        : null,
    };

    return plainToInstance(AddressResponseDto, addressData, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 批量删除地址
   * @param ids 地址ID数组
   * @returns 删除的地址数量
   */
  async batchRemove(ids: number[]): Promise<number> {
    if (!ids || ids.length === 0) {
      return 0;
    }

    // 检查所有地址是否存在
    const existingAddresses = await this.prisma.address.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    const existingIds = existingAddresses.map((address) => address.id);
    const notFoundIds = ids.filter((id) => !existingIds.includes(id));

    if (notFoundIds.length > 0) {
      throw new NotFoundException(
        `以下地址ID不存在: ${notFoundIds.join(', ')}`,
      );
    }

    // 批量删除地址
    const result = await this.prisma.address.deleteMany({
      where: { id: { in: ids } },
    });

    return result.count;
  }
}
