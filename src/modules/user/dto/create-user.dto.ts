import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsIn,
  MinLength,
  Matches,
} from 'class-validator';

/**
 * 创建用户 DTO
 */
export class CreateUserDto {
  @ApiProperty({
    description: '用户名（唯一）',
    example: 'admin',
  })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  userName: string;

  @ApiProperty({
    description: '密码（至少8位，包含字母和数字）',
    example: '12345678',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(8, { message: '密码长度至少8位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: '密码必须包含字母和数字',
  })
  password: string;

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
    default: 'unknown',
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
    default: '1',
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

  @ApiPropertyOptional({
    description: '角色编码列表',
    example: ['admin', 'user'],
    type: [String],
  })
  @IsString({ each: true, message: '角色编码必须是字符串数组' })
  @IsOptional()
  roleCodes?: string[];
}
