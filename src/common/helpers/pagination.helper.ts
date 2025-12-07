import { PaginationParams } from '../dto/pagination.dto';
import { PaginatedDto } from '../dto/paginated.dto';

/**
 * 创建分页响应
 * @param items 数据列表
 * @param paginationParams 分页参数
 * @param totalItems 总记录数
 * @returns 分页响应
 */
export function createPaginatedResponse<T>(
  items: T[],
  paginationParams: PaginationParams,
  totalItems: number,
): PaginatedDto<T> {
  return {
    records: items,
    current: paginationParams.current,
    size: paginationParams.size,
    total: totalItems,
  };
}
