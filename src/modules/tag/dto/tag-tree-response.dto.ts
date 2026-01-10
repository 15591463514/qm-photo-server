import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TagResponseDto } from './tag-response.dto';

/**
 * 标签树形响应 DTO
 * 用于返回树形结构的标签数据（第一级是标签组，第二级是标签数据）
 */
export class TagTreeResponseDto {
  @ApiProperty({
    description: '标签组代码（第一级节点）',
    example: 'image_tags',
  })
  groupCode: string;

  @ApiProperty({
    description: '标签组名称（第一级节点）',
    example: '图片标签',
  })
  groupName: string;

  @ApiProperty({
    description: '标签组状态（1-启用，0-禁用）',
    example: 1,
  })
  groupStatus: number;

  @ApiProperty({
    description: '是否为组节点（第一级）',
    example: true,
  })
  isGroup: boolean;

  @ApiProperty({
    description: '子节点（标签数据列表）',
    type: [TagResponseDto],
  })
  children: TagResponseDto[];

  @ApiPropertyOptional({
    description: '标签数量',
    example: 2,
  })
  tagCount?: number;

  @ApiPropertyOptional({
    description: '创建时间（取最早的数据）',
    example: '2025-01-01 10:00:00',
  })
  createTime?: string;
}

