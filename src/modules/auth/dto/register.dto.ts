import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  MaxLength,
} from 'class-validator';

/**
 * 注册 DTO
 */
export class RegisterDto {
  @ApiProperty({
    description: '账号（3-20个字符，字母开头，只能包含字母、数字、下划线）',
    example: 'admin',
    minLength: 3,
    maxLength: 20,
  })
  @IsNotEmpty({ message: '账号不能为空' })
  @IsString({ message: '账号必须是字符串' })
  @MinLength(3, { message: '账号长度不能少于3位' })
  @MaxLength(20, { message: '账号长度不能超过20位' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]{2,19}$/, {
    message: '账号必须以字母开头，只能包含字母、数字和下划线',
  })
  username: string;

  @ApiProperty({
    description: '密码（至少8位，包含字母和数字）',
    example: '12345678',
    minLength: 8,
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString({ message: '密码必须是字符串' })
  @MinLength(8, { message: '密码长度不能少于8位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: '密码必须包含字母和数字',
  })
  password: string;
}
