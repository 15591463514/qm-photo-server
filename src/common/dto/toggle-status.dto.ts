import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

/**
 * 切换状态 DTO（公共）
 * 用于切换实体的启用/禁用状态
 */
export class ToggleStatusDto {
  @ApiProperty({
    description: '状态（1-启用，0-禁用）',
    example: 1,
  })
  @IsInt({ message: '状态必须是整数' })
  @Min(0, { message: '状态只能是 0 或 1' })
  @Max(1, { message: '状态只能是 0 或 1' })
  status: number;
}
