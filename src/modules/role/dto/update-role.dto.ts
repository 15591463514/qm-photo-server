import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength, Matches } from 'class-validator';

/**
 * 更新角色 DTO
 */
export class UpdateRoleDto {
  @ApiPropertyOptional({
    description: '角色名称',
    example: '管理员',
    maxLength: 50,
  })
  @IsString({ message: '角色名称必须是字符串' })
  @IsOptional()
  @MaxLength(50, { message: '角色名称长度不能超过50个字符' })
  roleName?: string;

  @ApiPropertyOptional({
    description: '角色编码（唯一，只能是小写字母，最大16个字符）',
    example: 'admin',
    maxLength: 16,
  })
  @IsString({ message: '角色编码必须是字符串' })
  @IsOptional()
  @MaxLength(16, { message: '角色编码不能超过16个字符' })
  @Matches(/^[a-z]+$/, {
    message: '角色编码只能包含小写字母',
  })
  roleCode?: string;

  @ApiPropertyOptional({
    description: '角色描述',
    example: '系统管理员，拥有所有权限',
    maxLength: 500,
  })
  @IsString({ message: '角色描述必须是字符串' })
  @IsOptional()
  @MaxLength(500, { message: '角色描述长度不能超过500个字符' })
  description?: string;

  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
  })
  @IsBoolean({ message: '启用状态必须是布尔值' })
  @IsOptional()
  enabled?: boolean;
}
