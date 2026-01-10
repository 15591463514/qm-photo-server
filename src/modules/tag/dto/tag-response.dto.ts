import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { utcToLocal } from '@/common/helpers';

/**
 * 标签响应 DTO
 * 用于返回标签信息
 */
export class TagResponseDto {
  @ApiProperty({
    description: '标签ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '标签组代码',
    example: 'image_tags',
  })
  groupCode: string;

  @ApiProperty({
    description: '标签组名称',
    example: '图片标签',
  })
  groupName: string;

  @ApiProperty({
    description: '标签组状态（1-启用，0-禁用）',
    example: 1,
  })
  groupStatus: number;

  @ApiProperty({
    description: '标签名称（显示名称）',
    example: '风景',
  })
  label: string;

  @ApiProperty({
    description: '标签值',
    example: 'landscape',
  })
  value: string;

  @ApiProperty({
    description: '排序',
    example: 0,
  })
  sort: number;

  @ApiProperty({
    description: '状态（1-启用，0-禁用）',
    example: 1,
  })
  status: number;

  @ApiPropertyOptional({
    description: '描述',
    example: '图片标签描述',
  })
  description?: string | null;

  @ApiPropertyOptional({
    description: '创建人ID',
    example: 1,
  })
  createBy?: number | null;

  @ApiProperty({
    description: '创建时间（本地时间，UTC+8）',
    example: '2025-01-01 08:00:00',
  })
  @Transform(({ value }) => utcToLocal(value))
  createTime: string;

  @ApiPropertyOptional({
    description: '更新人ID',
    example: 1,
  })
  updateBy?: number | null;

  @ApiPropertyOptional({
    description: '更新时间（本地时间，UTC+8）',
    example: '2025-01-01 08:00:00',
  })
  @Transform(({ value }) => utcToLocal(value))
  updateTime?: string | null;
}

