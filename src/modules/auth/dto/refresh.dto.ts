import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 刷新 Token DTO
 */
export class RefreshDto {
  @ApiProperty({
    description: 'Refresh Token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty({ message: 'Refresh Token 不能为空' })
  @IsString({ message: 'Refresh Token 必须是字符串' })
  refreshToken: string;
}
