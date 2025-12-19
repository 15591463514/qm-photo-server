import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { PAGINATION_CONSTANTS } from '../constants/pagination.constants';

/**
 * 分页请求参数 DTO
 * @description 用于查询列表接口，包含分页参数
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: '当前页码，从 1 开始',
    default: PAGINATION_CONSTANTS.DEFAULT_PAGE,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: '当前页码必须是整数' })
  @Min(1, { message: '当前页码必须大于 0' })
  @IsOptional()
  current?: number = PAGINATION_CONSTANTS.DEFAULT_PAGE;

  @ApiPropertyOptional({
    description: '每页数量',
    default: PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: PAGINATION_CONSTANTS.MAX_PAGE_SIZE,
  })
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于 0' })
  @Max(PAGINATION_CONSTANTS.MAX_PAGE_SIZE, {
    message: `每页数量不能超过 ${PAGINATION_CONSTANTS.MAX_PAGE_SIZE}`,
  })
  @IsOptional()
  size?: number = PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE;

  /* mysql忽略条数 */
  public skip: number;

  /* mysql返回条数 */
  public take: number;
}

export type PaginationParams = Pick<
  PaginationDto,
  'current' | 'size' | 'skip' | 'take'
>;
