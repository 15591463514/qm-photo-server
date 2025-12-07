import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * 查询用户 DTO
 * 继承 PaginationDto，包含分页参数和查询条件
 */
export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '用户名（模糊查询）',
    example: 'admin',
  })
  @IsString()
  @IsOptional()
  userName?: string;

  @ApiPropertyOptional({
    description: '昵称（模糊查询）',
    example: '管理员',
  })
  @IsString()
  @IsOptional()
  nickName?: string;

  @ApiPropertyOptional({
    description: '邮箱（模糊查询）',
    example: 'admin@example.com',
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: '手机号（模糊查询）',
    example: '13800138000',
  })
  @IsString()
  @IsOptional()
  userPhone?: string;

  @ApiPropertyOptional({
    description: '状态',
    example: '1',
    enum: ['1', '2'],
  })
  @IsIn(['1', '2'], { message: '状态只能是 1（启用）或 2（禁用）' })
  @IsOptional()
  status?: string;
}
