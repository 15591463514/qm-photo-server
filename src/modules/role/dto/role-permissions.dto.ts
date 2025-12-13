import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 角色权限项 DTO
 */
export class RolePermissionItemDto {
  @ApiProperty({
    description: '菜单ID',
    example: 1,
  })
  @IsInt({ message: '菜单ID必须是整数' })
  @IsNotEmpty({ message: '菜单ID不能为空' })
  menuId: number;

  @ApiPropertyOptional({
    description: '按钮ID列表',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsOptional()
  @IsArray({ message: '按钮ID列表必须是数组' })
  @IsInt({ each: true, message: '按钮ID列表中的每个元素必须是整数' })
  buttonIds?: number[];
}

/**
 * 分配角色权限 DTO
 */
export class AssignRolePermissionsDto {
  @ApiProperty({
    description: '权限项列表',
    type: [RolePermissionItemDto],
  })
  @IsArray({ message: '权限项列表必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => RolePermissionItemDto)
  permissions: RolePermissionItemDto[];
}

/**
 * 角色权限响应 DTO
 */
export class RolePermissionsResponseDto {
  @ApiProperty({
    description: '菜单ID',
    example: 1,
  })
  menuId: number;

  @ApiProperty({
    description: '是否拥有菜单权限',
    example: true,
  })
  hasMenuPermission: boolean;

  @ApiProperty({
    description: '按钮ID列表',
    example: [1, 2, 3],
    type: [Number],
  })
  buttonIds: number[];
}
