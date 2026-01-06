import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * 发送验证码 DTO
 */
export class SendVerificationCodeDto {
  @ApiProperty({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @IsNotEmpty({ message: '邮箱地址不能为空' })
  @IsString({ message: '邮箱地址必须是字符串' })
  @IsEmail({}, { message: '邮箱地址格式不正确' })
  email: string;
}

