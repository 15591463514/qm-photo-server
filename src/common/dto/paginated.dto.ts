import { ApiProperty } from '@nestjs/swagger';

/**
 * 分页响应 DTO
 * @description 用于返回分页数据，包含数据列表和分页信息
 */
export class PaginatedDto<T> {
  @ApiProperty({
    description: '数据列表',
    type: 'array',
  })
  records: T[];

  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  current: number;

  @ApiProperty({
    description: '每页数量',
    example: 10,
  })
  size: number;

  @ApiProperty({
    description: '总记录数',
    example: 100,
  })
  total: number;
}
