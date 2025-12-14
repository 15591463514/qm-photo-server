import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 查询角色 DTO
 * 包含查询条件（不包含分页参数）
 */
export class QueryRoleDto {
  @ApiPropertyOptional({
    description: '角色ID',
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: '角色ID必须是整数' })
  @IsOptional()
  roleId?: number;

  @ApiPropertyOptional({
    description: '角色名称（模糊查询）',
    example: '管理员',
  })
  @IsString()
  @IsOptional()
  roleName?: string;

  @ApiPropertyOptional({
    description: '角色编码（模糊查询）',
    example: 'admin',
  })
  @IsString()
  @IsOptional()
  roleCode?: string;

  @ApiPropertyOptional({
    description: '角色描述（模糊查询）',
    example: '系统管理员',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
  })
  @IsBoolean({ message: '启用状态必须是布尔值' })
  @IsOptional()
  enabled?: boolean;
}
