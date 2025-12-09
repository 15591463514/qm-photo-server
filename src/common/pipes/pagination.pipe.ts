import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { PAGINATION_CONSTANTS } from '../constants/pagination.constants';
import { PaginationDto } from '../dto/pagination.dto';

/**
 * 分页管道
 * 将分页请求参数转换为数据库查询需要的参数
 *
 * 功能：
 * 1. 验证分页参数
 * 2. 将 current 和 size 转换为 skip 和 take
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
    let current: number = PAGINATION_CONSTANTS.DEFAULT_PAGE;
    const currentVal = value.current ?? value.page;
    if (currentVal !== undefined && currentVal !== null && currentVal !== '') {
      const parsed = Number(currentVal);
      current =
        Number.isInteger(parsed) && parsed > 0
          ? parsed
          : PAGINATION_CONSTANTS.DEFAULT_PAGE;
    }

    let size: number = defaultPageSize;
    const sizeVal = value.size ?? value.pageSize;
    if (sizeVal !== undefined && sizeVal !== null && sizeVal !== '') {
      const parsed = Number(sizeVal);
      size = Number.isInteger(parsed) && parsed > 0 ? parsed : defaultPageSize;
    }

    // 验证参数范围
    if (current < 1) {
      throw new BadRequestException('当前页码必须大于 0');
    }
    if (size < 1 || size > maxPageSize) {
      throw new BadRequestException(`每页数量必须在 1-${maxPageSize} 之间`);
    }

    // 计算数据库查询参数
    const skip = (current - 1) * size;
    const take = size;

    // 创建分页参数对象
    const paginationParams: PaginationDto = {
      skip,
      take,
      current,
      size,
    };

    // 提取其他查询参数（排除分页相关字段）
    const {
      current: _current,
      page: _page,
      size: _size,
      pageSize: _pageSize,
      ...otherParams
    } = value;

    // 将分页参数和其他查询参数合并返回
    return {
      ...paginationParams,
      ...otherParams,
    };
  }
}
