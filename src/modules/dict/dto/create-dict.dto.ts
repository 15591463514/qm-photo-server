import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import {
  IsDictCode,
  IsDictValue,
} from '@/common/validators/dict-code.validator';

/**
 * 创建字典 DTO
 */
export class CreateDictDto {
  @ApiProperty({
    description: '字典类型编码',
    example: 'user_status',
    maxLength: 100,
  })
  @IsString({ message: '字典类型编码必须是字符串' })
  @IsNotEmpty({ message: '字典类型编码不能为空' })
  @MaxLength(100, { message: '字典类型编码长度不能超过100个字符' })
  @IsDictCode({
    message: '字典类型编码只能包含小写字母和下划线，且不能以下划线开头或结尾',
  })
  typeCode: string;

  @ApiProperty({
    description: '字典类型名称',
    example: '用户状态',
    maxLength: 100,
  })
  @IsString({ message: '字典类型名称必须是字符串' })
  @IsNotEmpty({ message: '字典类型名称不能为空' })
  @MaxLength(100, { message: '字典类型名称长度不能超过100个字符' })
  typeName: string;

  @ApiProperty({
    description: '字典标签（显示名称）',
    example: '启用',
    maxLength: 100,
  })
  @IsString({ message: '字典标签必须是字符串' })
  @IsNotEmpty({ message: '字典标签不能为空' })
  @MaxLength(100, { message: '字典标签长度不能超过100个字符' })
  dataLabel: string;

  @ApiProperty({
    description: '字典值',
    example: '1',
    maxLength: 100,
  })
  @IsString({ message: '字典值必须是字符串' })
  @IsNotEmpty({ message: '字典值不能为空' })
  @MaxLength(100, { message: '字典值长度不能超过100个字符' })
  @IsDictValue({
    message: '字典值只能包含小写字母、数字和下划线，且不能以下划线开头或结尾',
  })
  dataValue: string;

  @ApiPropertyOptional({
    description: '排序',
    example: 0,
    default: 0,
  })
  @IsInt({ message: '排序必须是整数' })
  @IsOptional()
  @Min(0, { message: '排序不能小于0' })
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '状态（1-启用，2-禁用）',
    example: '1',
    default: '1',
  })
  @IsString({ message: '状态必须是字符串' })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: '标签样式',
    example: 'success',
    maxLength: 100,
  })
  @IsString({ message: '标签样式必须是字符串' })
  @IsOptional()
  @MaxLength(100, { message: '标签样式长度不能超过100个字符' })
  tagStyle?: string;

  @ApiPropertyOptional({
    description: '是否默认值',
    example: false,
    default: false,
  })
  @IsBoolean({ message: '是否默认值必须是布尔值' })
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: '备注',
    example: '用户状态字典',
    maxLength: 500,
  })
  @IsString({ message: '备注必须是字符串' })
  @IsOptional()
  @MaxLength(500, { message: '备注长度不能超过500个字符' })
  remark?: string;
}
