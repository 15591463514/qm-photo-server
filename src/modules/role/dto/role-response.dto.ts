import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { utcToLocal } from '@/common/helpers';

/**
 * 角色响应 DTO
 * 用于返回角色信息
 */
export class RoleResponseDto {
  @ApiProperty({
    description: '角色ID',
    example: 1,
  })
  roleId: number;

  @ApiProperty({
    description: '角色名称',
    example: '管理员',
  })
  roleName: string;

  @ApiProperty({
    description: '角色编码',
    example: 'admin',
  })
  roleCode: string;

  @ApiPropertyOptional({
    description: '角色描述',
    example: '系统管理员，拥有所有权限',
  })
  description?: string | null;

  @ApiProperty({
    description: '是否启用',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: '创建时间（本地时间，UTC+8）',
    example: '2025-01-01 08:00:00',
  })
  @Transform(({ value }) => utcToLocal(value))
  createTime: string;

  @ApiPropertyOptional({
    description: '更新时间（本地时间，UTC+8）',
    example: '2025-01-01 08:00:00',
  })
  @Transform(({ value }) => utcToLocal(value))
  updateTime?: string | null;
}
