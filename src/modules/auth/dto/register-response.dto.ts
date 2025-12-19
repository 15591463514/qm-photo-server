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
}
