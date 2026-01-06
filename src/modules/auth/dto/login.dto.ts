import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * 登录 DTO
 */
export class LoginDto {
  @ApiProperty({
    description: '账号或邮箱（支持用户名或邮箱地址登录）',
    example: 'admin 或 user@example.com',
  })
  @IsNotEmpty({ message: '账号或邮箱不能为空' })
  @IsString({ message: '账号或邮箱必须是字符串' })
  @MinLength(3, { message: '账号或邮箱长度不能少于3位' })
  account: string;

  @ApiProperty({
    description: '密码',
    example: '123456',
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(6, { message: '密码长度不能少于6位' })
  password: string;

  @ApiProperty({
    description: '验证码ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: '验证码ID不能为空' })
  @IsString({ message: '验证码ID必须是字符串' })
  captchaId: string;

  @ApiProperty({
    description: '验证码文本',
    example: '1234',
  })
  @IsNotEmpty({ message: '验证码不能为空' })
  @IsString({ message: '验证码必须是字符串' })
  captchaText: string;
}
