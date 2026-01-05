import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { utcToLocal } from '@/common/helpers';

/**
 * 通知日志响应 DTO
 */
export class LogResponseDto {
  @ApiProperty({ description: '日志ID', example: 1 })
  @Transform(({ value }) => (typeof value === 'bigint' ? Number(value) : value))
  id: number;

  @ApiProperty({ description: '信息ID', example: 1 })
  @Transform(({ value }) => (typeof value === 'bigint' ? Number(value) : value))
  infoId: number;

  @ApiPropertyOptional({ description: '规则ID' })
  @Transform(({ value }) =>
    value != null && typeof value === 'bigint' ? Number(value) : value,
  )
  ruleId?: number;

  @ApiProperty({ description: '通知方式', example: 3 })
  noticeMode: number;

  @ApiProperty({ description: '通知地址', example: 'dev@example.com' })
  noticeAddress: string;

  @ApiPropertyOptional({ description: '通知结果', example: 'success' })
  noticeResult?: string;

  @ApiPropertyOptional({
    description: '通知结果时间（本地时间，UTC+8）',
    example: '2025-01-01 08:00:00',
  })
  @Transform(({ value }) => (value ? utcToLocal(value) : value))
  noticeResultTime?: string;

  @ApiPropertyOptional({
    description: '说明（失败原因等）',
    example: '收件人地址无效或被拒绝',
  })
  description?: string;

  @ApiProperty({
    description: '创建时间（本地时间，UTC+8）',
    example: '2025-01-01 08:00:00',
  })
  @Transform(({ value }) => utcToLocal(value))
  createdAt: string;
}
