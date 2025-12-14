import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { utcToLocal } from '@/common/helpers';

/**
 * 用户响应 DTO
 * 用于返回用户信息，不包含密码等敏感信息
 */
export class UserResponseDto {
  @ApiProperty({
    description: '用户ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '用户名',
    example: 'admin',
  })
  userName: string;

  @ApiPropertyOptional({
    description: '昵称',
    example: '管理员',
  })
  nickName?: string | null;

  @ApiPropertyOptional({
    description: '邮箱',
    example: 'admin@example.com',
  })
  email?: string | null;

  @ApiPropertyOptional({
    description: '头像URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatar?: string | null;

  @ApiPropertyOptional({
    description: '手机号',
    example: '13800138000',
  })
  userPhone?: string | null;

  @ApiPropertyOptional({
    description: '性别',
    example: 'male',
    enum: ['male', 'female', 'unknown'],
  })
  userGender?: string | null;

  @ApiProperty({
    description: '状态',
    example: '1',
    enum: ['1', '2'],
  })
  status: string;

  @ApiPropertyOptional({
    description: '创建人ID',
    example: 1,
  })
  createBy?: number | null;

  @ApiProperty({
    description: '创建时间（本地时间，UTC+8）',
    example: '2025-11-25 16:51:30',
  })
  @Transform(({ value }) => utcToLocal(value))
  createTime: string;

  @ApiPropertyOptional({
    description: '更新人ID',
    example: 1,
  })
  updateBy?: number | null;

  @ApiPropertyOptional({
    description: '更新时间（本地时间，UTC+8）',
    example: '2025-11-25 16:51:30',
  })
  @Transform(({ value }) => utcToLocal(value))
  updateTime?: string | null;

  @ApiPropertyOptional({
    description: '备注',
    example: '这是备注信息',
  })
  remark?: string | null;

  @ApiPropertyOptional({
    description: '角色编码列表',
    example: ['admin', 'user'],
    type: [String],
  })
  userRoles?: string[];
}
