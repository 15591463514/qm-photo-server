import { ApiProperty } from '@nestjs/swagger';

/**
 * 分页元数据
 * @description 用于返回分页信息，包含当前页码、每页数量、总记录数、总页数、当前页记录数
 */
export class PaginationMetaDto {
  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  currentPage: number;

  @ApiProperty({
    description: '每页数量',
    example: 10,
  })
  itemsPerPage: number;

  @ApiProperty({
    description: '总记录数',
    example: 100,
  })
  totalItems: number;

  @ApiProperty({
    description: '总页数',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: '当前页记录数',
    example: 10,
  })
  itemCount: number;
}

/**
 * 分页响应 DTO
 * @description 用于返回分页数据，包含数据列表和分页信息
 */
export class PaginatedDto<T> {
  @ApiProperty({
    description: '数据列表',
    type: 'array',
  })
  items: T[];

  @ApiProperty({
    description: '分页元数据',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
