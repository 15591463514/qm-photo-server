import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import {
  IsDictValue,
  IsDictName,
} from '@/common/validators/dict-code.validator';

/**
 * 更新字典 DTO
 */
export class UpdateDictDto {
  @ApiPropertyOptional({
    description: '字典类型编码（字母、短横线、下划线、数字，最大16字符）',
    example: 'user_status',
    maxLength: 16,
  })
  @IsString({ message: '字典类型编码必须是字符串' })
  @IsOptional()
  @MaxLength(16, { message: '字典类型编码不能超过16个字符' })
  @Matches(/^[a-z0-9_-]+$/, {
    message: '字典类型编码只能包含字母、短横线、下划线和数字',
  })
  typeCode?: string;

  @ApiPropertyOptional({
    description: '字典类型名称（不可输入特殊字符和emoji，最大16字符）',
    example: '用户状态',
    maxLength: 16,
  })
  @IsString({ message: '字典类型名称必须是字符串' })
  @IsOptional()
  @MaxLength(16, { message: '字典类型名称不能超过16个字符' })
  @IsDictName({
    message: '字典类型名称不能包含特殊字符和emoji',
  })
  typeName?: string;

  @ApiPropertyOptional({
    description: '字典标签（不可输入特殊字符和emoji，最大16字符）',
    example: '启用',
    maxLength: 16,
  })
  @IsString({ message: '字典标签必须是字符串' })
  @IsOptional()
  @MaxLength(16, { message: '字典标签不能超过16个字符' })
  @IsDictName({
    message: '字典标签不能包含特殊字符和emoji',
  })
  dataLabel?: string;

  @ApiPropertyOptional({
    description: '字典值（字母、短横线、下划线、数字，最大16字符）',
    example: '1',
    maxLength: 16,
  })
  @IsString({ message: '字典值必须是字符串' })
  @IsOptional()
  @MaxLength(16, { message: '字典值不能超过16个字符' })
  @IsDictValue({
    message:
      '字典值只能包含字母、短横线、下划线和数字，且不能以下划线开头或结尾',
  })
  dataValue?: string;

  @ApiPropertyOptional({
    description: '排序',
    example: 0,
  })
  @IsInt({ message: '排序必须是整数' })
  @IsOptional()
  @Min(0, { message: '排序不能小于0' })
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '状态（1-启用，2-禁用）',
    example: '1',
  })
  @IsString({ message: '状态必须是字符串' })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: '标签样式（字母、短横线、下划线、数字，最大16字符）',
    example: 'success',
    maxLength: 16,
  })
  @IsString({ message: '标签样式必须是字符串' })
  @IsOptional()
  @MaxLength(16, { message: '标签样式不能超过16个字符' })
  @Matches(/^[a-z0-9_-]+$/, {
    message: '标签样式只能包含字母、短横线、下划线和数字',
  })
  tagStyle?: string;

  @ApiPropertyOptional({
    description: '是否默认值',
    example: false,
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
