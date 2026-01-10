import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * 查询地址 DTO
 * 继承 PaginationDto，包含分页参数和查询条件
 */
export class QueryAddressDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '搜索关键词（地址名称或详细地址模糊查询）',
    example: '公司',
  })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({
    description: '省',
    example: '北京市',
  })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({
    description: '市',
    example: '北京市',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: '区/县',
    example: '朝阳区',
  })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({
    description: '状态（1-启用，0-禁用）',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  status?: number;
}

