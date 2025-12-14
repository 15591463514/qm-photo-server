import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { utcToLocal } from '@/common/helpers';

export class TestResponseDto {
  @ApiProperty({
    description: '测试数据 ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '创建时间（本地时间，UTC+8）',
    example: '2025-11-25 16:51:30',
  })
  @Transform(({ value }) => utcToLocal(value))
  createdAt: string;

  @ApiProperty({
    description: '更新时间（本地时间，UTC+8）',
    example: '2025-11-25 16:51:30',
  })
  @Transform(({ value }) => utcToLocal(value))
  updatedAt: string;

  @ApiProperty({
    description: '测试名称',
    example: '测试数据',
  })
  name: string;

  @ApiPropertyOptional({
    description: '测试描述',
    example: '这是一个测试描述',
  })
  description?: string | null;

  @ApiProperty({
    description: '状态',
    example: true,
  })
  status: boolean;

  @ApiPropertyOptional({
    description: '删除时间（软删除，本地时间，UTC+8）',
    example: null,
  })
  @Transform(({ value }) => utcToLocal(value))
  deletedAt?: string | null;
}
