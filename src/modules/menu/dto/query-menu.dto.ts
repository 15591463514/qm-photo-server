import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * 查询菜单 DTO
 */
export class QueryMenuDto {
  @ApiPropertyOptional({
    description: '菜单名称（模糊查询）',
    example: '用户',
  })
  @IsString({ message: '菜单名称必须是字符串' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '路由路径（模糊查询）',
    example: '/system',
  })
  @IsString({ message: '路由路径必须是字符串' })
  @IsOptional()
  path?: string;

  @ApiPropertyOptional({
    description: '状态（1-启用，2-禁用）',
    example: '1',
  })
  @IsString({ message: '状态必须是字符串' })
  @IsOptional()
  status?: string;
}

