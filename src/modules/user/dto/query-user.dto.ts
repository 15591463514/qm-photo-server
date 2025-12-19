import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * 查询用户 DTO
 * 继承 PaginationDto，包含分页参数和查询条件
 */
export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '名称（用户名或昵称模糊查询）',
    example: 'admin',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '角色ID',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  roleId?: number;

  @ApiPropertyOptional({
    description: '状态',
    example: '1',
    enum: ['1', '2'],
  })
  @IsIn(['1', '2'], { message: '状态只能是 1（启用）或 2（禁用）' })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: '性别',
    example: 'male',
  })
  @IsString()
  @IsOptional()
  userGender?: string;

  @ApiPropertyOptional({
    description: '创建时间开始（注册日期开始）',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({
    description: '创建时间结束（注册日期结束）',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;
}
