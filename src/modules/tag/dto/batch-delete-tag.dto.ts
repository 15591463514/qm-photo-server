import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * 批量删除标签 DTO
 */
export class BatchDeleteTagDto {
  @ApiProperty({
    description: '标签ID数组',
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
}
