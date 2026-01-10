import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { utcToLocal } from '@/common/helpers';

/**
 * 地址响应 DTO
 * 用于返回地址信息
 */
export class AddressResponseDto {
  @ApiProperty({
    description: '地址ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: '地址名称',
    example: '公司总部',
  })
  name: string;

  @ApiProperty({
    description: '详细地址',
    example: '北京市朝阳区xxx街道xxx号',
  })
  detail: string;

  @ApiProperty({
    description: '经度',
    example: 116.397128,
  })
  longitude: number;

  @ApiProperty({
    description: '纬度',
    example: 39.916527,
  })
  latitude: number;

  @ApiPropertyOptional({
    description: '省',
    example: '北京市',
  })
  province?: string | null;

  @ApiPropertyOptional({
    description: '市',
    example: '北京市',
  })
  city?: string | null;

  @ApiPropertyOptional({
    description: '区/县',
    example: '朝阳区',
  })
  district?: string | null;

  @ApiPropertyOptional({
    description: '行政区划代码',
    example: '110105',
  })
  adcode?: string | null;

  @ApiPropertyOptional({
    description: '描述',
    example: '公司总部地址',
  })
  description?: string | null;

  @ApiProperty({
    description: '状态（1-启用，0-禁用）',
    example: 1,
  })
  status: number;

  @ApiPropertyOptional({
    description: '创建人ID',
    example: 1,
  })
  createBy?: number | null;

  @ApiProperty({
    description: '创建时间（本地时间，UTC+8）',
    example: '2025-01-01 08:00:00',
  })
  @Transform(({ value }) => utcToLocal(value))
  createTime: string;

  @ApiPropertyOptional({
    description: '更新人ID',
    example: 1,
  })
  updateBy?: number | null;

  @ApiPropertyOptional({
    description: '更新时间（本地时间，UTC+8）',
    example: '2025-01-01 08:00:00',
  })
  @Transform(({ value }) => utcToLocal(value))
  updateTime?: string | null;
}

