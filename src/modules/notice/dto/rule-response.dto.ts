import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { utcToLocal } from '@/common/helpers';

/**
 * 通知规则响应 DTO
 */
export class RuleResponseDto {
  @ApiProperty({ description: '规则ID', example: 1 })
  @Transform(({ value }) => (typeof value === 'bigint' ? Number(value) : value))
  ruleId: number;

  @ApiProperty({ description: '规则名称', example: '图片上传成功通知' })
  ruleName: string;

  @ApiProperty({ description: '消息来源', example: 'image_upload' })
  msgSource: string;

  @ApiProperty({ description: '消息类型', example: 'success' })
  msgType: string;

  @ApiProperty({ description: '通知方式', example: 3 })
  noticeMode: number;

  @ApiProperty({
    description: '通知地址',
    example: 'dev@example.com,test@example.com',
  })
  noticeAddress: string;

  @ApiPropertyOptional({ description: '通知地址名称' })
  noticeAddressName?: string;

  @ApiPropertyOptional({ description: '处理脚本' })
  handlerScript?: string;

  @ApiPropertyOptional({ description: '入参示例（JSON格式）' })
  eventDataExample?: string;

  @ApiPropertyOptional({
    description: '是否开启记录',
    example: true,
    default: true,
  })
  enableRecord?: boolean;

  @ApiPropertyOptional({ description: '创建人' })
  createUsername?: string;

  @ApiPropertyOptional({ description: '更新人' })
  updateUsername?: string;

  @ApiProperty({ description: '规则状态', example: 1 })
  noticeStatus: number;

  @ApiProperty({
    description: '创建时间（本地时间，UTC+8）',
    example: '2025-01-01 08:00:00',
  })
  @Transform(({ value }) => utcToLocal(value))
  createTime: string;

  @ApiProperty({
    description: '更新时间（本地时间，UTC+8）',
    example: '2025-01-01 08:00:00',
  })
  @Transform(({ value }) => utcToLocal(value))
  updateTime: string;
}
