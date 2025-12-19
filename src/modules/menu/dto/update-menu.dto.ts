import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';

/**
 * 更新菜单按钮 DTO
 */
export class UpdateMenuButtonDto {
  @ApiPropertyOptional({
    description: '按钮ID（更新时必填）',
    example: 1,
  })
  @IsInt({ message: '按钮ID必须是整数' })
  @IsOptional()
  id?: number;

  @ApiPropertyOptional({
    description: '按钮标题',
    example: '新增',
    maxLength: 100,
  })
  @IsString({ message: '按钮标题必须是字符串' })
  @IsOptional()
  @MaxLength(100, { message: '按钮标题长度不能超过100个字符' })
  title?: string;

  @ApiPropertyOptional({
    description: '权限标识（字母、短横线、下划线、数字、冒号，最大30字符）',
    example: 'user:add',
    maxLength: 30,
  })
  @IsString({ message: '权限标识必须是字符串' })
  @IsOptional()
  @MaxLength(30, { message: '权限标识不能超过30个字符' })
  @Matches(/^[a-z0-9_:-]+$/, {
    message: '权限标识只能包含字母、短横线、下划线、数字和冒号',
  })
  authMark?: string;

  @ApiPropertyOptional({
    description: '排序',
    example: 0,
  })
  @IsInt({ message: '排序必须是整数' })
  @IsOptional()
  @Min(0, { message: '排序不能小于0' })
  sortOrder?: number;
}

/**
 * 更新菜单 DTO
 */
export class UpdateMenuDto {
  @ApiPropertyOptional({
    description: '父菜单ID',
    example: 0,
  })
  @IsInt({ message: '父菜单ID必须是整数' })
  @IsOptional()
  @Min(0, { message: '父菜单ID不能小于0' })
  parentId?: number;

  @ApiPropertyOptional({
    description: '路由名称',
    example: 'User',
    maxLength: 100,
  })
  @IsString({ message: '路由名称必须是字符串' })
  @IsOptional()
  @MaxLength(100, { message: '路由名称长度不能超过100个字符' })
  name?: string;

  @ApiPropertyOptional({
    description: '路由路径（只能包含 /、字母、数字、下划线、横线）',
    example: '/system/user',
    maxLength: 200,
  })
  @IsString({ message: '路由路径必须是字符串' })
  @IsOptional()
  @MaxLength(200, { message: '路由路径长度不能超过200个字符' })
  @Matches(/^[/a-zA-Z0-9_-]+$/, {
    message: '路由路径只能包含 /、字母、数字、下划线和横线',
  })
  path?: string;

  @ApiPropertyOptional({
    description: '组件路径（只能包含 /、字母、数字、下划线、横线）',
    example: '/system/user/index',
    maxLength: 500,
  })
  @IsString({ message: '组件路径必须是字符串' })
  @IsOptional()
  @MaxLength(500, { message: '组件路径长度不能超过500个字符' })
  @Matches(/^[/a-zA-Z0-9_-]+$/, {
    message: '组件路径只能包含 /、字母、数字、下划线和横线',
  })
  component?: string;

  @ApiPropertyOptional({
    description: '菜单标题',
    example: '用户管理',
    maxLength: 100,
  })
  @IsString({ message: '菜单标题必须是字符串' })
  @IsOptional()
  @MaxLength(100, { message: '菜单标题长度不能超过100个字符' })
  title?: string;

  @ApiPropertyOptional({
    description: '图标',
    example: 'ri:user-line',
    maxLength: 100,
  })
  @IsString({ message: '图标必须是字符串' })
  @IsOptional()
  @MaxLength(100, { message: '图标长度不能超过100个字符' })
  icon?: string;

  @ApiPropertyOptional({
    description: '是否隐藏菜单',
    example: false,
  })
  @IsBoolean({ message: '是否隐藏菜单必须是布尔值' })
  @IsOptional()
  isHide?: boolean;

  @ApiPropertyOptional({
    description: '是否隐藏标签页',
    example: false,
  })
  @IsBoolean({ message: '是否隐藏标签页必须是布尔值' })
  @IsOptional()
  isHideTab?: boolean;

  @ApiPropertyOptional({
    description: '外部链接',
    example: 'https://www.example.com',
    maxLength: 500,
  })
  @IsString({ message: '外部链接必须是字符串' })
  @IsOptional()
  @MaxLength(500, { message: '外部链接长度不能超过500个字符' })
  link?: string;

  @ApiPropertyOptional({
    description: '是否为iframe',
    example: false,
  })
  @IsBoolean({ message: '是否为iframe必须是布尔值' })
  @IsOptional()
  isIframe?: boolean;

  @ApiPropertyOptional({
    description: '是否缓存',
    example: false,
  })
  @IsBoolean({ message: '是否缓存必须是布尔值' })
  @IsOptional()
  keepAlive?: boolean;

  @ApiPropertyOptional({
    description: '是否一级菜单',
    example: false,
  })
  @IsBoolean({ message: '是否一级菜单必须是布尔值' })
  @IsOptional()
  isFirstLevel?: boolean;

  @ApiPropertyOptional({
    description: '是否固定标签页',
    example: false,
  })
  @IsBoolean({ message: '是否固定标签页必须是布尔值' })
  @IsOptional()
  fixedTab?: boolean;

  @ApiPropertyOptional({
    description: '激活路径（只能包含 /、字母、数字、下划线、横线）',
    example: '/system/user',
    maxLength: 200,
  })
  @IsString({ message: '激活路径必须是字符串' })
  @IsOptional()
  @MaxLength(200, { message: '激活路径长度不能超过200个字符' })
  @Matches(/^[/a-zA-Z0-9_-]+$/, {
    message: '激活路径只能包含 /、字母、数字、下划线和横线',
  })
  activePath?: string;

  @ApiPropertyOptional({
    description: '是否全屏页面',
    example: false,
  })
  @IsBoolean({ message: '是否全屏页面必须是布尔值' })
  @IsOptional()
  isFullPage?: boolean;

  @ApiPropertyOptional({
    description: '排序',
    example: 0,
  })
  @IsInt({ message: '排序必须是整数' })
  @IsOptional()
  @Min(0, { message: '排序不能小于0' })
  sortOrder?: number;

  @ApiPropertyOptional({
    description: '状态（1-启用，2-禁用）',
    example: '1',
  })
  @IsString({ message: '状态必须是字符串' })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: '角色权限列表',
    example: ['R_SUPER', 'R_ADMIN'],
    type: [String],
  })
  @IsArray({ message: '角色权限列表必须是数组' })
  @IsString({ each: true, message: '角色权限列表中的每个元素必须是字符串' })
  @IsOptional()
  roles?: string[];
}
