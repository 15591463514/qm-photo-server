import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateTestDto {
  @ApiPropertyOptional({
    description: '测试名称',
    example: '更新后的测试数据',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '测试描述',
    example: '更新后的测试描述',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '状态',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
