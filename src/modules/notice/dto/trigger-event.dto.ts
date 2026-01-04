import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

/**
 * 触发事件通知 DTO
 */
export class TriggerEventDto {
  @ApiProperty({
    description: '消息来源',
    example: 'image_upload',
  })
  @IsString()
  @IsNotEmpty({ message: '消息来源不能为空' })
  msgSource: string;

  @ApiProperty({
    description: '消息类型',
    example: 'success',
  })
  @IsString()
  @IsNotEmpty({ message: '消息类型不能为空' })
  msgType: string;

  @ApiProperty({
    description: '事件数据（JSON对象）',
    example: {
      image_name: 'photo.jpg',
      image_size: '2.5MB',
      upload_time: '2024-01-15 10:30:00',
      uploader: 'username',
    },
  })
  @IsObject()
  @IsNotEmpty({ message: '事件数据不能为空' })
  eventData: Record<string, any>;

  @ApiPropertyOptional({
    description: '测试通知地址（可选，如果提供则使用此地址替代规则中的通知地址）',
    example: 'test@example.com',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  noticeAddress?: string;
}

