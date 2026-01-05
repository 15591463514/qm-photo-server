import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * 查询通知规则 DTO
 */
export class QueryRuleDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '消息来源',
    example: 'image_upload',
  })
  @IsString()
  @IsOptional()
  msgSource?: string;

  @ApiPropertyOptional({
    description: '消息类型',
    example: 'success',
  })
  @IsString()
  @IsOptional()
  msgType?: string;
}
