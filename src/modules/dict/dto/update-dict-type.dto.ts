import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';
import { IsDictName } from '@/common/validators/dict-code.validator';

/**
 * 更新字典类型 DTO
 */
export class UpdateDictTypeDto {
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
    description: '字典类型状态（1-启用，2-禁用）',
    example: '1',
  })
  @IsString({ message: '字典类型状态必须是字符串' })
  @IsOptional()
  typeStatus?: string;
}
