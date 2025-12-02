import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { PAGINATION_CONSTANTS } from '../constants/pagination.constants';
import { PaginationDto } from '../dto/pagination.dto';

/**
 * 分页管道
 * 将分页请求参数转换为数据库查询需要的参数
 *
 * 功能：
 * 1. 验证分页参数
 * 2. 将 page 和 pageSize 转换为 skip 和 take
 * 3. 添加额外的分页信息到请求对象
 */
@Injectable()
export class PaginationPipe implements PipeTransform {
  transform(value: any) {
    // 获取最大每页数量和默认每页数量
    const maxPageSize = PAGINATION_CONSTANTS.MAX_PAGE_SIZE;
    const defaultPageSize = PAGINATION_CONSTANTS.DEFAULT_PAGE_SIZE;

    // 获取分页参数，设置默认值
    // 注意：查询参数可能是字符串，需要转换为数字
    // 如果值为空字符串、null、undefined，使用默认值
    let page: number;
    if (
      value?.page !== undefined &&
      value?.page !== null &&
      value?.page !== ''
    ) {
      const parsedPage = Number(value.page);
      // 如果转换后是有效数字，使用转换后的值；否则使用默认值
      page =
        Number.isInteger(parsedPage) &&
        !isNaN(parsedPage) &&
        isFinite(parsedPage)
          ? parsedPage
          : PAGINATION_CONSTANTS.DEFAULT_PAGE;
    } else {
      page = PAGINATION_CONSTANTS.DEFAULT_PAGE;
    }

    let pageSize: number;
    if (
      value?.pageSize !== undefined &&
      value?.pageSize !== null &&
      value?.pageSize !== ''
    ) {
      const parsedPageSize = Number(value.pageSize);
      // 如果转换后是有效数字，使用转换后的值；否则使用默认值
      pageSize =
        Number.isInteger(parsedPageSize) &&
        !isNaN(parsedPageSize) &&
        isFinite(parsedPageSize)
          ? parsedPageSize
          : defaultPageSize;
    } else {
      pageSize = defaultPageSize;
    }

    // 验证参数范围
    if (page < 1) {
      throw new BadRequestException('页码必须大于 0');
    }
    if (pageSize < 1 || pageSize > maxPageSize) {
      throw new BadRequestException(`每页数量必须在 1-${maxPageSize} 之间`);
    }

    // 计算数据库查询参数
    // 确保 skip 和 take 都是有效的非负整数
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 创建分页参数对象
    const paginationParams: PaginationDto = {
      skip,
      take,
      page,
      pageSize,
    };

    // 将分页参数扁平化添加到请求对象中，供 Service 使用
    // 扁平化展开，方便直接使用 skip、take 等字段
    return paginationParams;
  }
}
