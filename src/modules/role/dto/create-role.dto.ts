import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

/**
 * 创建角色 DTO
 */
export class CreateRoleDto {
  @ApiProperty({
    description: '角色名称',
    example: '管理员',
    maxLength: 50,
  })
  @IsString({ message: '角色名称必须是字符串' })
  @IsNotEmpty({ message: '角色名称不能为空' })
  @MaxLength(50, { message: '角色名称长度不能超过50个字符' })
  roleName: string;

  @ApiProperty({
    description: '角色编码（唯一）',
    example: 'admin',
    maxLength: 50,
  })
  @IsString({ message: '角色编码必须是字符串' })
  @IsNotEmpty({ message: '角色编码不能为空' })
  @MaxLength(50, { message: '角色编码长度不能超过50个字符' })
  roleCode: string;

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
    default: true,
  })
  @IsBoolean({ message: '启用状态必须是布尔值' })
  @IsOptional()
  enabled?: boolean;
}
