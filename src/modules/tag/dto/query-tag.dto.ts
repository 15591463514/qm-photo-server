import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * 查询标签 DTO（用于树形结构查询）
 */
export class QueryTagDto {
  @ApiPropertyOptional({
    description: '标签组代码（模糊查询）',
    example: 'image_tags',
  })
  @IsString()
  @IsOptional()
  groupCode?: string;

  @ApiPropertyOptional({
    description: '标签组名称（模糊查询）',
    example: '图片标签',
  })
  @IsString()
  @IsOptional()
  groupName?: string;

  @ApiPropertyOptional({
    description: '标签组状态（1-启用，0-禁用）',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  groupStatus?: number;

  @ApiPropertyOptional({
    description: '标签名称（模糊查询）',
    example: '风景',
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({
    description: '标签值（模糊查询）',
    example: 'landscape',
  })
  @IsString()
  @IsOptional()
  value?: string;

  @ApiPropertyOptional({
    description: '状态（1-启用，0-禁用）',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  status?: number;
}

