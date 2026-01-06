import { ApiProperty } from '@nestjs/swagger';

/**
 * 注册响应 DTO
 */
export class RegisterResponseDto {
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

  @ApiProperty({
    description: '提示信息',
    example: '注册成功',
  })
  message: string;

  @ApiProperty({
    description: '访问令牌（注册成功后自动登录）',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: '刷新令牌（注册成功后自动登录）',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}
