import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { utcToLocal } from '@/common/helpers/date.helper';

/**
 * 字典响应 DTO
 * 用于返回字典信息
 */
export class DictResponseDto {
  @ApiProperty({
    description: '字典ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '字典类型编码',
    example: 'user_status',
  })
  typeCode: string;

  @ApiProperty({
    description: '字典类型名称',
    example: '用户状态',
  })
  typeName: string;

  @ApiProperty({
    description: '字典类型状态（1-启用，2-禁用）',
    example: '1',
  })
  typeStatus: string;

  @ApiProperty({
    description: '字典标签（显示名称）',
    example: '启用',
  })
  dataLabel: string;

  @ApiProperty({
    description: '字典值',
    example: '1',
  })
  dataValue: string;

  @ApiProperty({
    description: '排序',
    example: 0,
  })
  sortOrder: number;

  @ApiProperty({
    description: '状态（1-启用，2-禁用）',
    example: '1',
  })
  status: string;

  @ApiPropertyOptional({
    description: '标签样式',
    example: 'success',
  })
  tagStyle?: string | null;

  @ApiProperty({
    description: '是否默认值',
    example: false,
  })
  isDefault: boolean;

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

  @ApiPropertyOptional({
    description: '备注',
    example: '用户状态字典',
  })
  remark?: string | null;
}
