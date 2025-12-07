import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsIn,
  MinLength,
  Matches,
} from 'class-validator';

/**
 * 更新用户 DTO
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: '密码（至少8位，包含字母和数字）',
    example: '12345678',
    minLength: 8,
  })
  @IsString()
  @IsOptional()
  @MinLength(8, { message: '密码长度至少8位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: '密码必须包含字母和数字',
  })
  password?: string;

  @ApiPropertyOptional({
    description: '昵称',
    example: '管理员',
  })
  @IsString()
  @IsOptional()
  nickName?: string;

  @ApiPropertyOptional({
    description: '邮箱',
    example: 'admin@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: '头像URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    description: '手机号',
    example: '13800138000',
  })
  @IsString()
  @IsOptional()
  userPhone?: string;

  @ApiPropertyOptional({
    description: '性别',
    example: 'male',
    enum: ['male', 'female', 'unknown'],
  })
  @IsIn(['male', 'female', 'unknown'], {
    message: '性别只能是 male、female 或 unknown',
  })
  @IsOptional()
  userGender?: string;

  @ApiPropertyOptional({
    description: '状态',
    example: '1',
    enum: ['1', '2'],
  })
  @IsIn(['1', '2'], { message: '状态只能是 1（启用）或 2（禁用）' })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: '备注',
    example: '这是备注信息',
  })
  @IsString()
  @IsOptional()
  remark?: string;
}
