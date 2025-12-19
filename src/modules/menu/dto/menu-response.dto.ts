import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * 菜单按钮响应 DTO
 */
export class MenuButtonResponseDto {
  @ApiProperty({ description: '按钮ID', example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ description: '菜单ID', example: 1 })
  @Expose()
  menuId: number;

  @ApiProperty({ description: '按钮标题', example: '新增' })
  @Expose()
  title: string;

  @ApiProperty({ description: '权限标识', example: 'add' })
  @Expose()
  authMark: string;

  @ApiProperty({ description: '排序', example: 0 })
  @Expose()
  sortOrder: number;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createTime: Date;
}

/**
 * 菜单响应 DTO
 */
export class MenuResponseDto {
  @ApiProperty({ description: '菜单ID', example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ description: '父菜单ID', example: 0 })
  @Expose()
  parentId: number;

  @ApiProperty({ description: '路由名称', example: 'User' })
  @Expose()
  name: string;

  @ApiProperty({ description: '路由路径', example: '/system/user' })
  @Expose()
  path: string;

  @ApiPropertyOptional({
    description: '组件路径',
    example: '/system/user/index',
  })
  @Expose()
  component?: string;

  @ApiProperty({ description: '菜单标题', example: '用户管理' })
  @Expose()
  title: string;

  @ApiPropertyOptional({ description: '图标', example: 'ri:user-line' })
  @Expose()
  icon?: string;

  @ApiProperty({ description: '是否隐藏菜单', example: false })
  @Expose()
  isHide: boolean;

  @ApiProperty({ description: '是否隐藏标签页', example: false })
  @Expose()
  isHideTab: boolean;

  @ApiPropertyOptional({
    description: '外部链接',
    example: 'https://www.example.com',
  })
  @Expose()
  link?: string;

  @ApiProperty({ description: '是否为iframe', example: false })
  @Expose()
  isIframe: boolean;

  @ApiProperty({ description: '是否缓存', example: false })
  @Expose()
  keepAlive: boolean;

  @ApiProperty({ description: '是否一级菜单', example: false })
  @Expose()
  isFirstLevel: boolean;

  @ApiProperty({ description: '是否固定标签页', example: false })
  @Expose()
  fixedTab: boolean;

  @ApiPropertyOptional({ description: '激活路径', example: '/system/user' })
  @Expose()
  activePath?: string;

  @ApiProperty({ description: '是否全屏页面', example: false })
  @Expose()
  isFullPage: boolean;

  @ApiProperty({ description: '排序', example: 0 })
  @Expose()
  sortOrder: number;

  @ApiProperty({ description: '状态（1-启用，2-禁用）', example: '1' })
  @Expose()
  status: string;

  @ApiProperty({ description: '创建时间', example: '2024-01-01T00:00:00.000Z' })
  @Expose()
  createTime: Date;

  @ApiPropertyOptional({
    description: '更新时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  updateTime?: Date;

  @ApiPropertyOptional({
    description: '子菜单列表',
    type: [MenuResponseDto],
  })
  @Expose()
  @Type(() => MenuResponseDto)
  children?: MenuResponseDto[];

  @ApiPropertyOptional({
    description: '菜单按钮列表',
    type: [MenuButtonResponseDto],
  })
  @Expose()
  @Type(() => MenuButtonResponseDto)
  buttons?: MenuButtonResponseDto[];
}
