import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayMinSize, IsInt, Min, Max } from 'class-validator';

/**
 * 批量切换状态 DTO（支持字符串ID）
 * 用于批量切换实体的启用/禁用状态（规则管理等使用字符串ID的模块）
 */
export class BatchToggleStatusStringDto {
  @ApiProperty({
    description: '实体ID数组（字符串类型）',
    type: [String],
    example: ['1', '2', '3'],
  })
  @IsArray({ message: 'ids 必须是数组' })
  @ArrayMinSize(1, { message: 'ids 数组至少包含一个元素' })
  @IsString({ each: true, message: 'ids 数组中的每个元素必须是字符串' })
  ids: string[];

  @ApiProperty({
    description: '状态（1-启用，0-禁用）',
    example: 1,
  })
  @IsInt({ message: '状态必须是整数' })
  @Min(0, { message: '状态只能是 0 或 1' })
  @Max(1, { message: '状态只能是 0 或 1' })
  status: number;
}

