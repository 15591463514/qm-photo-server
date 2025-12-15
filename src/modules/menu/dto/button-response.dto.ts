import { ApiProperty } from '@nestjs/swagger';

/**
 * 按钮响应 DTO
 */
export class ButtonResponseDto {
  @ApiProperty({ description: '按钮ID', example: 1 })
  id: number;

  @ApiProperty({ description: '菜单ID', example: 1 })
  menuId: number;

  @ApiProperty({ description: '按钮标题', example: '新增' })
  title: string;

  @ApiProperty({ description: '权限标识', example: 'add' })
  authMark: string;

  @ApiProperty({ description: '排序', example: 0 })
  sortOrder: number;
}

