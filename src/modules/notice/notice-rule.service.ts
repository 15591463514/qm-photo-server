import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { plainToInstance } from 'class-transformer';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { QueryRuleDto } from './dto/query-rule.dto';
import { RuleResponseDto } from './dto/rule-response.dto';
import { createPaginatedResponse } from '@/common/helpers';
import { PaginatedDto } from '@/common/dto/paginated.dto';
import { Prisma } from '@prisma/client';

/**
 * 通知规则服务
 */
@Injectable()
export class NoticeRuleService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建通知规则
   */
  async create(
    createRuleDto: CreateRuleDto,
    currentUsername?: string,
  ): Promise<RuleResponseDto> {
    const data: Prisma.NotificationRuleCreateInput = {
      ruleName: createRuleDto.ruleName,
      msgSource: createRuleDto.msgSource,
      msgType: createRuleDto.msgType,
      noticeMode: createRuleDto.noticeMode,
      noticeAddress: createRuleDto.noticeAddress?.trim() || null,
      noticeAddressName: createRuleDto.noticeAddressName,
      handlerScript: createRuleDto.handlerScript,
      eventDataExample: createRuleDto.eventDataExample?.trim() || null,
      enableRecord: createRuleDto.enableRecord ?? true,
      noticeStatus: createRuleDto.noticeStatus ?? 1,
      createUsername: currentUsername,
    };

    const rule = await this.prisma.notificationRule.create({ data });
    return plainToInstance(RuleResponseDto, rule, {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    });
  }

  /**
   * 分页查询通知规则
   */
  async findPaginated(
    query: QueryRuleDto,
  ): Promise<PaginatedDto<RuleResponseDto>> {
    const { current = 1, size = 10, skip, take, msgSource, msgType } = query;

    // 构建查询条件
    const where: Prisma.NotificationRuleWhereInput = {};
    if (msgSource) {
      where.msgSource = { contains: msgSource };
    }
    if (msgType) {
      where.msgType = { contains: msgType };
    }

    // 查询总数
    const total = await this.prisma.notificationRule.count({ where });

    // 查询数据
    const records = await this.prisma.notificationRule.findMany({
      where,
      skip,
      take,
      orderBy: {
        createTime: 'desc',
      },
    });

    return createPaginatedResponse(
      plainToInstance(RuleResponseDto, records, {
        enableImplicitConversion: true,
        excludeExtraneousValues: false,
      }),
      { skip, take, current, size },
      total,
    );
  }

  /**
   * 根据ID查询通知规则
   */
  async findOne(ruleId: string): Promise<RuleResponseDto> {
    const rule = await this.prisma.notificationRule.findUnique({
      where: { ruleId: BigInt(ruleId) },
    });

    if (!rule) {
      throw new NotFoundException(`通知规则不存在: ${ruleId}`);
    }

    return plainToInstance(RuleResponseDto, rule, {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    });
  }

  /**
   * 更新通知规则
   */
  async update(
    ruleId: string,
    updateRuleDto: UpdateRuleDto,
    currentUsername?: string,
  ): Promise<RuleResponseDto> {
    // 检查规则是否存在
    const existing = await this.prisma.notificationRule.findUnique({
      where: { ruleId: BigInt(ruleId) },
    });

    if (!existing) {
      throw new NotFoundException(`通知规则不存在: ${ruleId}`);
    }

    const data: Prisma.NotificationRuleUpdateInput = {
      ...updateRuleDto,
      // 如果 noticeAddress 是空字符串，转换为 null
      noticeAddress:
        updateRuleDto.noticeAddress !== undefined
          ? updateRuleDto.noticeAddress?.trim() || null
          : undefined,
      // 如果 eventDataExample 是空字符串，转换为 null
      eventDataExample:
        updateRuleDto.eventDataExample !== undefined
          ? updateRuleDto.eventDataExample?.trim() || null
          : undefined,
      updateUsername: currentUsername,
    };

    const rule = await this.prisma.notificationRule.update({
      where: { ruleId: BigInt(ruleId) },
      data,
    });

    return plainToInstance(RuleResponseDto, rule, {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    });
  }

  /**
   * 删除通知规则
   */
  async remove(ruleId: string): Promise<void> {
    const rule = await this.prisma.notificationRule.findUnique({
      where: { ruleId: BigInt(ruleId) },
    });

    if (!rule) {
      throw new NotFoundException(`通知规则不存在: ${ruleId}`);
    }

    await this.prisma.notificationRule.delete({
      where: { ruleId: BigInt(ruleId) },
    });
  }

  /**
   * 切换规则状态（启用/禁用）
   */
  async toggleStatus(ruleId: string): Promise<RuleResponseDto> {
    const rule = await this.prisma.notificationRule.findUnique({
      where: { ruleId: BigInt(ruleId) },
    });

    if (!rule) {
      throw new NotFoundException(`通知规则不存在: ${ruleId}`);
    }

    const newStatus = rule.noticeStatus === 1 ? 0 : 1;

    const updated = await this.prisma.notificationRule.update({
      where: { ruleId: BigInt(ruleId) },
      data: { noticeStatus: newStatus },
    });

    return plainToInstance(RuleResponseDto, updated);
  }
}
