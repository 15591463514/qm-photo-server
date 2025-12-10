import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DictResponseDto } from './dict-response.dto';

/**
 * 字典树形响应 DTO
 * 用于返回树形结构的字典数据（第一级是字典类型，第二级是字典数据）
 */
export class DictTreeResponseDto {
  @ApiProperty({
    description: '字典类型编码（第一级节点）',
    example: 'user_status',
  })
  typeCode: string;

  @ApiProperty({
    description: '字典类型名称（第一级节点）',
    example: '用户状态',
  })
  typeName: string;

  @ApiProperty({
    description: '字典类型状态（1-启用，2-禁用）',
    example: '1',
  })
  typeStatus: string;

  @ApiProperty({
    description: '是否为类型节点（第一级）',
    example: true,
  })
  isType: boolean;

  @ApiProperty({
    description: '子节点（字典数据列表）',
    type: [DictResponseDto],
  })
  children: DictResponseDto[];

  @ApiPropertyOptional({
    description: '字典数据数量',
    example: 2,
  })
  dataCount?: number;

  @ApiPropertyOptional({
    description: '创建时间（取最早的数据）',
    example: '2025-01-01 10:00:00',
  })
  createTime?: string;
}
