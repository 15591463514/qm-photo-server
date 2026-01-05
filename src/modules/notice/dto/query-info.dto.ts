import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * 查询通知信息 DTO
 */
export class QueryInfoDto extends PaginationDto {
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

  @ApiPropertyOptional({
    description: '通知时间开始',
    example: '2024-01-01 00:00:00',
  })
  @IsDateString()
  @IsOptional()
  start?: string;

  @ApiPropertyOptional({
    description: '通知时间结束',
    example: '2024-12-31 23:59:59',
  })
  @IsDateString()
  @IsOptional()
  end?: string;
}
