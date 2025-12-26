import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 当前用户信息响应 DTO
 * 用于返回当前登录用户的详细信息，包含角色和权限
 */
export class UserInfoResponseDto {
  @ApiProperty({
    description: '用户ID',
    example: 1,
  })
  userId: number;

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
    description: '性别',
    example: 'male',
    enum: ['male', 'female', 'unknown'],
  })
  userGender?: string | null;

  @ApiProperty({
    description: '角色列表',
    example: ['admin'],
    type: [String],
  })
  roles: string[];

  @ApiProperty({
    description: '按钮权限列表（格式：menuName:authMark）',
    example: ['user:add', 'user:edit', 'user:delete', 'role:view'],
    type: [String],
  })
  buttons: string[];
}
