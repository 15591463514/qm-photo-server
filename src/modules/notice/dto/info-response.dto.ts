import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { utcToLocal } from '@/common/helpers';

/**
 * 通知信息响应 DTO
 */
export class InfoResponseDto {
  @ApiProperty({ description: '信息ID', example: 1 })
  @Transform(({ value }) => (typeof value === 'bigint' ? Number(value) : value))
  infoId: number;

  @ApiProperty({ description: '消息来源', example: 'image_upload' })
  msgSource: string;

  @ApiProperty({ description: '消息类型', example: 'success' })
  msgType: string;

  @ApiPropertyOptional({ description: '通知内容' })
  noticeContent?: string;

  @ApiProperty({ description: '通知方式', example: 3 })
  noticeMode: number;

  @ApiProperty({ description: '通知成功数量', example: 2 })
  noticeSuccess: number;

  @ApiProperty({ description: '通知总数', example: 2 })
  noticeTotal: number;

  @ApiProperty({
    description: '通知时间（本地时间，UTC+8）',
    example: '2025-01-01 08:00:00',
  })
  @Transform(({ value }) => utcToLocal(value))
  noticeTime: string;

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

