import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * 查询测试数据 DTO
 * 继承 PaginationDto，包含分页参数和查询条件
 */
export class QueryTestDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '测试名称（模糊查询）',
    example: '测试',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '状态',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
