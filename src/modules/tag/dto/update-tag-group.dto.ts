import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, MaxLength, Matches } from 'class-validator';
import { IsDictName } from '@/common/validators/dict-code.validator';

/**
 * 更新标签组 DTO
 */
export class UpdateTagGroupDto {
  @ApiPropertyOptional({
    description: '标签组代码（字母、短横线、下划线、数字，最大100字符）',
    example: 'image_tags',
    maxLength: 100,
  })
  @IsString({ message: '标签组代码必须是字符串' })
  @IsOptional()
  @MaxLength(100, { message: '标签组代码不能超过100个字符' })
  @Matches(/^[a-z0-9_-]+$/, {
    message: '标签组代码只能包含字母、短横线、下划线和数字',
  })
  groupCode?: string;

  @ApiPropertyOptional({
    description: '标签组名称（不可输入特殊字符和emoji，最大100字符）',
    example: '图片标签',
    maxLength: 100,
  })
  @IsString({ message: '标签组名称必须是字符串' })
  @IsOptional()
  @MaxLength(100, { message: '标签组名称不能超过100个字符' })
  @IsDictName({
    message: '标签组名称不能包含特殊字符和emoji',
  })
  groupName?: string;

  @ApiPropertyOptional({
    description: '标签组状态（1-启用，0-禁用）',
    example: 1,
  })
  @IsInt({ message: '标签组状态必须是整数' })
  @IsOptional()
  groupStatus?: number;

  @ApiPropertyOptional({
    description: '描述',
    example: '图片标签描述',
    maxLength: 500,
  })
  @IsString({ message: '描述必须是字符串' })
  @IsOptional()
  @MaxLength(500, { message: '描述长度不能超过500个字符' })
  description?: string;
}

