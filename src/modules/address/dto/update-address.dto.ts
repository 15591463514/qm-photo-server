import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 更新地址 DTO
 */
export class UpdateAddressDto {
  @ApiPropertyOptional({
    description: '地址名称',
    example: '公司总部',
    maxLength: 100,
  })
  @IsString({ message: '地址名称必须是字符串' })
  @IsOptional()
  @MaxLength(100, { message: '地址名称不能超过100个字符' })
  name?: string;

  @ApiPropertyOptional({
    description: '详细地址',
    example: '北京市朝阳区xxx街道xxx号',
    maxLength: 500,
  })
  @IsString({ message: '详细地址必须是字符串' })
  @IsOptional()
  @MaxLength(500, { message: '详细地址不能超过500个字符' })
  detail?: string;

  @ApiPropertyOptional({
    description: '经度',
    example: 116.397128,
  })
  @IsNumber({}, { message: '经度必须是数字' })
  @IsOptional()
  @Type(() => Number)
  @Min(-180, { message: '经度必须在 -180 到 180 之间' })
  @Max(180, { message: '经度必须在 -180 到 180 之间' })
  longitude?: number;

  @ApiPropertyOptional({
    description: '纬度',
    example: 39.916527,
  })
  @IsNumber({}, { message: '纬度必须是数字' })
  @IsOptional()
  @Type(() => Number)
  @Min(-90, { message: '纬度必须在 -90 到 90 之间' })
  @Max(90, { message: '纬度必须在 -90 到 90 之间' })
  latitude?: number;

  @ApiPropertyOptional({
    description: '省',
    example: '北京市',
    maxLength: 50,
  })
  @IsString({ message: '省必须是字符串' })
  @IsOptional()
  @MaxLength(50, { message: '省不能超过50个字符' })
  province?: string;

  @ApiPropertyOptional({
    description: '市',
    example: '北京市',
    maxLength: 50,
  })
  @IsString({ message: '市必须是字符串' })
  @IsOptional()
  @MaxLength(50, { message: '市不能超过50个字符' })
  city?: string;

  @ApiPropertyOptional({
    description: '区/县',
    example: '朝阳区',
    maxLength: 50,
  })
  @IsString({ message: '区/县必须是字符串' })
  @IsOptional()
  @MaxLength(50, { message: '区/县不能超过50个字符' })
  district?: string;

  @ApiPropertyOptional({
    description: '行政区划代码',
    example: '110105',
    maxLength: 20,
  })
  @IsString({ message: '行政区划代码必须是字符串' })
  @IsOptional()
  @MaxLength(20, { message: '行政区划代码不能超过20个字符' })
  adcode?: string;

  @ApiPropertyOptional({
    description: '描述',
    example: '公司总部地址',
    maxLength: 500,
  })
  @IsString({ message: '描述必须是字符串' })
  @IsOptional()
  @MaxLength(500, { message: '描述长度不能超过500个字符' })
  description?: string;

  @ApiPropertyOptional({
    description: '状态（1-启用，0-禁用）',
    example: 1,
  })
  @IsInt({ message: '状态必须是整数' })
  @IsOptional()
  @Min(0, { message: '状态只能是 0 或 1' })
  @Max(1, { message: '状态只能是 0 或 1' })
  status?: number;
}

