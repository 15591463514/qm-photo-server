import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * 查询字典 DTO（用于树形结构查询）
 */
export class QueryDictDto {
  @ApiPropertyOptional({
    description: '字典类型编码（模糊查询）',
    example: 'user_status',
  })
  @IsString()
  @IsOptional()
  typeCode?: string;

  @ApiPropertyOptional({
    description: '字典类型名称（模糊查询）',
    example: '用户状态',
  })
  @IsString()
  @IsOptional()
  typeName?: string;

  @ApiPropertyOptional({
    description: '字典类型状态（1-启用，2-禁用）',
    example: '1',
  })
  @IsString()
  @IsOptional()
  typeStatus?: string;

  @ApiPropertyOptional({
    description: '字典标签（模糊查询）',
    example: '启用',
  })
  @IsString()
  @IsOptional()
  dataLabel?: string;

  @ApiPropertyOptional({
    description: '字典值（模糊查询）',
    example: '1',
  })
  @IsString()
  @IsOptional()
  dataValue?: string;

  @ApiPropertyOptional({
    description: '状态（1-启用，2-禁用）',
    example: '1',
  })
  @IsString()
  @IsOptional()
  status?: string;
}
