import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from 'nestjs-prisma';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { TestResponseDto } from './dto/test-response.dto';
import { createPaginatedResponse } from '@/common/helpers';
import { PaginatedDto } from '@/common/dto/paginated.dto';
import { QueryTestDto } from './dto/query-test.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class TestService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 创建测试数据
   */
  async create(createTestDto: CreateTestDto): Promise<TestResponseDto> {
    const result = await this.prisma.test.create({
      data: {
        name: createTestDto.name,
        description: createTestDto.description,
        status: createTestDto.status ?? true, // 默认为 true
      },
    });
    return plainToInstance(TestResponseDto, result, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 分页查询测试数据（排除已删除的）
   * @param query 查询参数（包含分页参数和过滤条件）
   */
  async findPaginated(
    query: QueryTestDto,
  ): Promise<PaginatedDto<TestResponseDto>> {
    const { skip, take, current, size, name, status } = query;

    // 构建查询条件
    const where: any = {
      deletedAt: null, // 软删除：只查询未删除的数据
    };

    // 添加过滤条件
    if (name) {
      where.name = {
        contains: name, // 模糊查询
      };
    }
    if (status !== undefined) {
      where.status = status;
    }

    // 并行查询数据和总数
    // 注意：Prisma 的 findMany 和 count 在查询不到数据时会正常返回空数组和 0，不会抛出异常
    const [results, totalItems] = await Promise.all([
      this.prisma.test.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take,
      }),
      this.prisma.test.count({
        where,
      }),
    ]);

    // 转换数据（即使 results 为空数组也能正常处理）
    const records = results.map((result) =>
      plainToInstance(TestResponseDto, result, {
        excludeExtraneousValues: false,
      }),
    );

    // 创建分页响应（即使没有数据也返回空的分页结果）
    return createPaginatedResponse(
      records,
      { skip, take, current, size },
      totalItems,
    );
  }

  /**
   * 查询单个测试数据
   */
  async findOne(id: number): Promise<TestResponseDto> {
    const test = await this.prisma.test.findFirst({
      where: {
        id,
        deletedAt: null, // 软删除：只查询未删除的数据
      },
    });

    if (!test) {
      throw new NotFoundException(`Test with ID ${id} not found`);
    }

    return plainToInstance(TestResponseDto, test, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 更新测试数据
   */
  async update(
    id: number,
    updateTestDto: UpdateTestDto,
  ): Promise<TestResponseDto> {
    // 先检查数据是否存在且未删除
    await this.findOne(id);

    const result = await this.prisma.test.update({
      where: { id },
      data: {
        ...updateTestDto,
        // updatedAt 由 Prisma 的 @updatedAt 自动处理，无需手动设置
      },
    });
    return plainToInstance(TestResponseDto, result, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 软删除测试数据
   */
  async remove(id: number): Promise<TestResponseDto> {
    // 先检查数据是否存在且未删除
    await this.findOne(id);

    const result = await this.prisma.test.update({
      where: { id },
      data: {
        deletedAt: new Date(), // 软删除：设置删除时间
      },
    });
    return plainToInstance(TestResponseDto, result, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 恢复已删除的数据
   */
  async restore(id: number): Promise<TestResponseDto> {
    const test = await this.prisma.test.findFirst({
      where: {
        id,
        deletedAt: { not: null }, // 查找已删除的数据
      },
    });

    if (!test) {
      throw new NotFoundException(`Deleted test with ID ${id} not found`);
    }

    const result = await this.prisma.test.update({
      where: { id },
      data: {
        deletedAt: null, // 恢复：清除删除时间
      },
    });
    return plainToInstance(TestResponseDto, result, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 查询已删除的数据
   */
  async findDeleted(): Promise<TestResponseDto[]> {
    const results = await this.prisma.test.findMany({
      where: {
        deletedAt: { not: null }, // 查询已删除的数据
      },
      orderBy: {
        deletedAt: 'desc',
      },
    });
    return results.map((result) =>
      plainToInstance(TestResponseDto, result, {
        excludeExtraneousValues: false,
      }),
    );
  }

  /**
   * 永久删除数据（硬删除）
   */
  async hardDelete(id: number): Promise<TestResponseDto> {
    await this.findOne(id);
    const result = await this.prisma.test.delete({
      where: { id },
    });
    return plainToInstance(TestResponseDto, result, {
      excludeExtraneousValues: false,
    });
  }

  /**
   * 测试缓存
   */
  async testCache() {
    const cache = await this.cacheManager.get<string>('token');
    if (cache) {
      return { token: cache };
    }
    const token = new Date().toLocaleString();
    await this.cacheManager.set('token', token, 60 * 1000);
    return { token: token };
  }

  /**
   * 测试demo
   */
  async testDemo() {
    return { message: 'test demo success' };
  }
}
