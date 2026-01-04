import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { plainToInstance } from 'class-transformer';
import { QueryInfoDto } from './dto/query-info.dto';
import { InfoResponseDto } from './dto/info-response.dto';
import { LogResponseDto } from './dto/log-response.dto';
import { createPaginatedResponse } from '@/common/helpers';
import { PaginatedDto } from '@/common/dto/paginated.dto';
import { Prisma } from '@prisma/client';

/**
 * 通知信息服务
 */
@Injectable()
export class NoticeInfoService {
  constructor(private prisma: PrismaService) {}

  /**
   * 分页查询通知信息
   */
  async findPaginated(query: QueryInfoDto): Promise<PaginatedDto<InfoResponseDto>> {
    const { current = 1, size = 10, skip, take, msgSource, msgType, start, end } = query;

    // 构建查询条件
    const where: Prisma.NotificationInfoWhereInput = {};
    if (msgSource) {
      where.msgSource = { contains: msgSource };
    }
    if (msgType) {
      where.msgType = { contains: msgType };
    }
    if (start || end) {
      where.noticeTime = {};
      if (start) {
        where.noticeTime.gte = new Date(start);
      }
      if (end) {
        where.noticeTime.lte = new Date(end);
      }
    }

    // 查询总数
    const total = await this.prisma.notificationInfo.count({ where });

    // 查询数据
    const records = await this.prisma.notificationInfo.findMany({
      where,
      skip,
      take,
      orderBy: {
        noticeTime: 'desc',
      },
    });

    return createPaginatedResponse(
      plainToInstance(InfoResponseDto, records, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      }),
      { skip, take, current, size },
      total,
    );
  }

  /**
   * 根据ID查询通知信息
   */
  async findOne(infoId: string): Promise<InfoResponseDto> {
    const info = await this.prisma.notificationInfo.findUnique({
      where: { infoId: BigInt(infoId) },
    });

    if (!info) {
      throw new NotFoundException(`通知信息不存在: ${infoId}`);
    }

    return plainToInstance(InfoResponseDto, info, {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    });
  }

  /**
   * 删除通知信息
   */
  async remove(infoId: string): Promise<void> {
    const info = await this.prisma.notificationInfo.findUnique({
      where: { infoId: BigInt(infoId) },
    });

    if (!info) {
      throw new NotFoundException(`通知信息不存在: ${infoId}`);
    }

    // 删除通知信息会自动删除关联的日志（CASCADE）
    await this.prisma.notificationInfo.delete({
      where: { infoId: BigInt(infoId) },
    });
  }

  /**
   * 获取通知结果明细
   * @param infoId 信息ID
   * @returns 通知结果明细列表
   */
  async getNotificationLogs(infoId: string): Promise<LogResponseDto[]> {
    const logs = await this.prisma.notificationLog.findMany({
      where: { infoId: BigInt(infoId) },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return plainToInstance(LogResponseDto, logs, {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    });
  }
}

