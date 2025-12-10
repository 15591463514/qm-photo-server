import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

/**
 * 更新字典类型 DTO
 */
export class UpdateDictTypeDto {
  @ApiPropertyOptional({
    description: '字典类型编码',
    example: 'user_status',
    maxLength: 100,
  })
  @IsString({ message: '字典类型编码必须是字符串' })
  @IsOptional()
  @MaxLength(100, { message: '字典类型编码长度不能超过100个字符' })
  typeCode?: string;

  @ApiPropertyOptional({
    description: '字典类型名称',
    example: '用户状态',
    maxLength: 100,
  })
  @IsString({ message: '字典类型名称必须是字符串' })
  @IsOptional()
  @MaxLength(100, { message: '字典类型名称长度不能超过100个字符' })
  typeName?: string;

  @ApiPropertyOptional({
    description: '字典类型状态（1-启用，2-禁用）',
    example: '1',
  })
  @IsString({ message: '字典类型状态必须是字符串' })
  @IsOptional()
  typeStatus?: string;
}
