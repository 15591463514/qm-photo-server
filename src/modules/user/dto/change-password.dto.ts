import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

/**
 * 更改密码 DTO
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: '当前密码',
    example: 'oldPassword123',
  })
  @IsString({ message: '当前密码必须是字符串' })
  @MinLength(1, { message: '当前密码不能为空' })
  oldPassword: string;

  @ApiProperty({
    description: '新密码（至少8位，包含字母和数字）',
    example: 'newPassword123',
    minLength: 8,
  })
  @IsString({ message: '新密码必须是字符串' })
  @MinLength(8, { message: '密码长度至少8位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: '密码必须包含字母和数字',
  })
  newPassword: string;

  @ApiProperty({
    description: '确认新密码',
    example: 'newPassword123',
  })
  @IsString({ message: '确认密码必须是字符串' })
  @MinLength(8, { message: '确认密码长度至少8位' })
  confirmPassword: string;
}
