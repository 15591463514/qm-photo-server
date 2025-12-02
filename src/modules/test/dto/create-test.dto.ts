import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateTestDto {
  @ApiProperty({
    description: '测试名称',
    example: '测试数据',
  })
  @IsString()
  @IsNotEmpty({ message: '名称不能为空' })
  name: string;

  @ApiPropertyOptional({
    description: '测试描述',
    example: '这是一个测试描述',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '状态',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  status?: boolean;
}
