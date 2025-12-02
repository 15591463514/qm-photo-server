import { PaginationParams } from '../dto/pagination.dto';
import { PaginatedDto, PaginationMetaDto } from '../dto/paginated.dto';

/**
 * 创建分页元数据
 * @param paginationParams 分页参数
 * @param totalItems 总记录数
 * @returns 分页元数据
 */
export function createPaginationMeta(
  paginationParams: PaginationParams,
  totalItems: number,
): PaginationMetaDto {
  const { page, pageSize } = paginationParams;

  // 处理边界情况：如果没有数据，总页数为 0
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

  // 计算当前页的实际记录数
  // 如果总记录数为 0 或当前页超出范围，返回 0
  let itemCount = 0;
  if (totalItems > 0) {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    if (startIndex < totalItems) {
      itemCount = Math.min(pageSize, totalItems - startIndex);
    }
  }

  return {
    currentPage: page,
    itemsPerPage: pageSize,
    totalItems,
    totalPages,
    itemCount,
  };
}

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
    items,
    meta: createPaginationMeta(paginationParams, totalItems),
  };
}
