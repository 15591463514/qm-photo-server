import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ArrayMinSize, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * 批量切换状态 DTO（公共）
 * 用于批量切换实体的启用/禁用状态
 */
export class BatchToggleStatusDto {
  @ApiProperty({
    description: '实体ID数组',
    type: [Number],
    example: [1, 2, 3],
  })
  @IsArray({ message: 'ids 必须是数组' })
  @ArrayMinSize(1, { message: 'ids 数组至少包含一个元素' })
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value.map((item) => {
        const num = typeof item === 'string' ? parseInt(item, 10) : item;
        return isNaN(num) ? item : num;
      });
    }
    return value;
  })
  @IsInt({ each: true, message: 'ids 数组中的每个元素必须是整数' })
  ids: number[];

  @ApiProperty({
    description: '状态（1-启用，0-禁用）',
    example: 1,
  })
  @IsInt({ message: '状态必须是整数' })
  @Min(0, { message: '状态只能是 0 或 1' })
  @Max(1, { message: '状态只能是 0 或 1' })
  status: number;
}

