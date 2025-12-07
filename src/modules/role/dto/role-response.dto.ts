import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    description: '创建时间',
    example: '2025-01-01T00:00:00.000Z',
  })
  createTime: Date;

  @ApiPropertyOptional({
    description: '更新时间',
    example: '2025-01-01T00:00:00.000Z',
  })
  updateTime?: Date | null;
}
