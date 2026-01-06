import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiExtraModels,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NoticeRuleService } from './notice-rule.service';
import { NoticeInfoService } from './notice-info.service';
import { NoticeService } from './services/notice.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { QueryRuleDto } from './dto/query-rule.dto';
import { QueryInfoDto } from './dto/query-info.dto';
import { TriggerEventDto } from './dto/trigger-event.dto';
import { RuleResponseDto } from './dto/rule-response.dto';
import { InfoResponseDto } from './dto/info-response.dto';
import { LogResponseDto } from './dto/log-response.dto';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { PaginationPipe } from '@/common/pipes/pagination.pipe';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequiresPermissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('通知管理')
@Controller('notice')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NoticeController {
  constructor(
    private readonly ruleService: NoticeRuleService,
    private readonly infoService: NoticeInfoService,
    private readonly noticeService: NoticeService,
  ) {}

  // ==================== 规则管理 ====================

  /**
   * 获取规则列表（分页）
   */
  @Get('rules/list')
  @RequiresPermissions('notice:rules:view')
  @ApiOperation({
    summary: '获取规则列表（分页）',
    description: '分页获取通知规则列表，支持按消息来源、消息类型筛选',
  })
  @ApiExtraModels(QueryRuleDto, PaginationDto)
  @ApiQuery({ type: QueryRuleDto })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [RuleResponseDto],
    isPage: true,
  })
  findRulesPaginated(@Query(PaginationPipe) query: QueryRuleDto) {
    return this.ruleService.findPaginated(query);
  }

  /**
   * 获取规则详情
   */
  @Get('rules/:id')
  @RequiresPermissions('notice:rules:view')
  @ApiOperation({
    summary: '获取规则详情',
    description: '根据ID获取通知规则详情',
  })
  @ApiParam({ name: 'id', type: String, description: '规则ID' })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: RuleResponseDto,
  })
  findRule(@Param('id') id: string) {
    return this.ruleService.findOne(id);
  }

  /**
   * 创建规则
   */
  @Post('rules')
  @RequiresPermissions('notice:rules:add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建规则',
    description: '创建一个新的通知规则',
  })
  @ApiBody({ type: CreateRuleDto })
  @ApiResult({
    status: 201,
    description: '创建成功',
    type: RuleResponseDto,
  })
  createRule(
    @Body() createRuleDto: CreateRuleDto,
    @CurrentUser('userName') currentUsername?: string,
  ) {
    return this.ruleService.create(createRuleDto, currentUsername);
  }

  /**
   * 更新规则
   */
  @Put('rules/:id')
  @RequiresPermissions('notice:rules:edit')
  @ApiOperation({
    summary: '更新规则',
    description: '根据ID更新通知规则',
  })
  @ApiParam({ name: 'id', type: String, description: '规则ID' })
  @ApiBody({ type: UpdateRuleDto })
  @ApiResult({
    status: 200,
    description: '更新成功',
    type: RuleResponseDto,
  })
  updateRule(
    @Param('id') id: string,
    @Body() updateRuleDto: UpdateRuleDto,
    @CurrentUser('userName') currentUsername?: string,
  ) {
    return this.ruleService.update(id, updateRuleDto, currentUsername);
  }

  /**
   * 删除规则
   */
  @Delete('rules/:id')
  @RequiresPermissions('notice:rules:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除规则',
    description: '根据ID删除通知规则',
  })
  @ApiParam({ name: 'id', type: String, description: '规则ID' })
  @ApiResult({
    status: 200,
    description: '删除成功',
  })
  removeRule(@Param('id') id: string) {
    return this.ruleService.remove(id);
  }

  /**
   * 切换规则状态（启用/禁用）
   */
  @Put('rules/:id/status')
  @RequiresPermissions('notice:rules:edit')
  @ApiOperation({
    summary: '切换规则状态',
    description: '启用或禁用通知规则',
  })
  @ApiParam({ name: 'id', type: String, description: '规则ID' })
  @ApiResult({
    status: 200,
    description: '状态切换成功',
    type: RuleResponseDto,
  })
  toggleRuleStatus(@Param('id') id: string) {
    return this.ruleService.toggleStatus(id);
  }

  // ==================== 信息管理 ====================

  /**
   * 获取通知信息列表（分页）
   */
  @Get('infos/list')
  @RequiresPermissions('notice:infos:view')
  @ApiOperation({
    summary: '获取通知信息列表（分页）',
    description: '分页获取通知信息列表，支持按消息来源、消息类型、通知时间筛选',
  })
  @ApiExtraModels(QueryInfoDto, PaginationDto)
  @ApiQuery({ type: QueryInfoDto })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [InfoResponseDto],
    isPage: true,
  })
  findInfosPaginated(@Query(PaginationPipe) query: QueryInfoDto) {
    return this.infoService.findPaginated(query);
  }

  /**
   * 获取通知信息详情
   */
  @Get('infos/:id')
  @RequiresPermissions('notice:infos:view')
  @ApiOperation({
    summary: '获取通知信息详情',
    description: '根据ID获取通知信息详情',
  })
  @ApiParam({ name: 'id', type: String, description: '信息ID' })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: InfoResponseDto,
  })
  findInfo(@Param('id') id: string) {
    return this.infoService.findOne(id);
  }

  /**
   * 删除通知信息
   */
  @Delete('infos/:id')
  @RequiresPermissions('notice:infos:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除通知信息',
    description: '根据ID删除通知信息（会同时删除关联的日志记录）',
  })
  @ApiParam({ name: 'id', type: String, description: '信息ID' })
  @ApiResult({
    status: 200,
    description: '删除成功',
  })
  removeInfo(@Param('id') id: string) {
    return this.infoService.remove(id);
  }

  /**
   * 获取通知结果明细
   */
  @Get('infos/:id/logs')
  @RequiresPermissions('notice:infos:viewDetail')
  @ApiOperation({
    summary: '获取通知结果明细',
    description: '根据信息ID获取该通知的所有发送结果明细',
  })
  @ApiParam({ name: 'id', type: String, description: '信息ID' })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [LogResponseDto],
  })
  getNotificationLogs(@Param('id') id: string) {
    return this.infoService.getNotificationLogs(id);
  }

  // ==================== 事件触发 ====================

  /**
   * 触发通知事件（公开接口，供业务系统调用）
   */
  @Post('trigger')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 20000 } }) // 3次/20秒
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '触发通知事件',
    description: '触发一个通知事件，系统会根据消息来源和类型匹配规则并发送通知',
  })
  @ApiBody({ type: TriggerEventDto })
  @ApiResult({
    status: 200,
    description: '事件触发结果（可能成功、部分失败或全部失败）',
    examples: {
      success: {
        summary: '全部成功',
        value: { message: '事件已触发，通知发送成功', success: 2, total: 2 },
      },
      partial: {
        summary: '部分失败',
        value: { message: '部分通知发送失败: 成功 1/2', success: 1, total: 2 },
      },
      failed: {
        summary: '全部失败',
        value: { message: '通知发送失败: 成功 0/2', success: 0, total: 2 },
      },
      noRule: {
        summary: '未找到匹配规则',
        value: { message: '未找到匹配的规则', success: 0, total: 0 },
      },
    },
  })
  async triggerEvent(@Body() triggerEventDto: TriggerEventDto) {
    return this.noticeService.triggerEvent(
      triggerEventDto.msgSource,
      triggerEventDto.msgType,
      triggerEventDto.eventData,
      triggerEventDto.noticeAddress,
    );
  }
}
