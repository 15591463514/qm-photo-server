import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiExtraModels,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { CreateMenuButtonDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
import { UpdateMenuButtonDto } from './dto/update-menu.dto';
import { QueryMenuDto } from './dto/query-menu.dto';
import { MenuResponseDto } from './dto/menu-response.dto';
import { ButtonResponseDto } from './dto/button-response.dto';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequiresPermissions } from '@/common/decorators/permissions.decorator';

@ApiTags('菜单管理')
@Controller('menu')
@UseGuards(JwtAuthGuard) // 所有接口都需要 JWT 认证
@ApiBearerAuth()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * 获取菜单树形结构
   */
  @Get('tree')
  @RequiresPermissions('menu:view')
  @ApiOperation({
    summary: '获取菜单树形结构',
    description: '获取菜单树形结构，支持按菜单名称、路由路径、状态筛选',
  })
  @ApiExtraModels(QueryMenuDto)
  @ApiQuery({ type: QueryMenuDto })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [MenuResponseDto],
  })
  @ApiResult({ status: 401, description: '未授权' })
  getMenuTree(@Query() query: QueryMenuDto): Promise<MenuResponseDto[]> {
    return this.menuService.getMenuTree(query);
  }

  /**
   * 获取菜单详情
   */
  @Get(':id')
  @RequiresPermissions('menu:view')
  @ApiOperation({
    summary: '获取菜单详情',
    description: '根据菜单ID获取菜单详情',
  })
  @ApiParam({ name: 'id', type: Number, description: '菜单ID' })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: MenuResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '菜单不存在' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MenuResponseDto> {
    return this.menuService.findOne(id);
  }

  /**
   * 创建菜单
   */
  @Post()
  @RequiresPermissions('menu:add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建菜单',
    description: '创建一个新的菜单',
  })
  @ApiBody({ type: CreateMenuDto })
  @ApiResult({
    status: 201,
    description: '创建成功',
    type: MenuResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '父菜单不存在' })
  @ApiResult({ status: 409, description: '路径已存在' })
  async create(
    @Body() createMenuDto: CreateMenuDto,
    @CurrentUser('userId') userId?: number,
  ): Promise<MenuResponseDto> {
    return this.menuService.create(createMenuDto, userId);
  }

  /**
   * 更新菜单
   */
  @Put(':id')
  @RequiresPermissions('menu:edit')
  @ApiOperation({
    summary: '更新菜单',
    description: '根据菜单ID更新菜单信息',
  })
  @ApiParam({ name: 'id', type: Number, description: '菜单ID' })
  @ApiBody({ type: UpdateMenuDto })
  @ApiResult({
    status: 200,
    description: '更新成功',
    type: MenuResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '菜单不存在' })
  @ApiResult({ status: 409, description: '路径已存在或形成循环引用' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMenuDto: UpdateMenuDto,
    @CurrentUser('userId') userId?: number,
  ): Promise<MenuResponseDto> {
    return this.menuService.update(id, updateMenuDto, userId);
  }

  /**
   * 创建菜单按钮
   */
  @Post(':menuId/button')
  @RequiresPermissions('menu:button:add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建菜单按钮',
    description: '为指定菜单创建一个新的按钮',
  })
  @ApiParam({ name: 'menuId', type: Number, description: '菜单ID' })
  @ApiBody({ type: CreateMenuButtonDto })
  @ApiResult({
    status: 201,
    description: '创建成功',
    type: ButtonResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '菜单不存在' })
  @ApiResult({ status: 409, description: '权限标识已存在' })
  async createButton(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Body() createButtonDto: CreateMenuButtonDto,
  ): Promise<{
    id: number;
    menuId: number;
    title: string;
    authMark: string;
    sortOrder: number;
  }> {
    return this.menuService.createButton(menuId, createButtonDto);
  }

  /**
   * 更新菜单按钮
   */
  @Put(':menuId/button/:buttonId')
  @RequiresPermissions('menu:button:edit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新菜单按钮',
    description: '根据菜单ID和按钮ID更新菜单按钮',
  })
  @ApiParam({ name: 'menuId', type: Number, description: '菜单ID' })
  @ApiParam({ name: 'buttonId', type: Number, description: '按钮ID' })
  @ApiBody({ type: UpdateMenuButtonDto })
  @ApiResult({
    status: 200,
    description: '更新成功',
    type: ButtonResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '按钮不存在' })
  @ApiResult({ status: 409, description: '权限标识已存在或按钮不属于指定菜单' })
  async updateButton(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Param('buttonId', ParseIntPipe) buttonId: number,
    @Body() updateButtonDto: UpdateMenuButtonDto,
  ): Promise<{
    id: number;
    menuId: number;
    title: string;
    authMark: string;
    sortOrder: number;
  }> {
    return this.menuService.updateButton(menuId, buttonId, updateButtonDto);
  }

  /**
   * 删除菜单按钮
   */
  @Delete(':menuId/button/:buttonId')
  @RequiresPermissions('menu:button:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除菜单按钮',
    description: '根据菜单ID和按钮ID删除菜单按钮',
  })
  @ApiParam({ name: 'menuId', type: Number, description: '菜单ID' })
  @ApiParam({ name: 'buttonId', type: Number, description: '按钮ID' })
  @ApiResult({
    status: 200,
    description: '删除成功',
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '按钮不存在' })
  @ApiResult({ status: 409, description: '按钮不属于指定菜单' })
  async removeButton(
    @Param('menuId', ParseIntPipe) menuId: number,
    @Param('buttonId', ParseIntPipe) buttonId: number,
  ): Promise<{
    id: number;
    menuId: number;
    title: string;
    authMark: string;
  }> {
    return this.menuService.removeButton(menuId, buttonId);
  }

  /**
   * 删除菜单
   */
  @Delete(':id')
  @RequiresPermissions('menu:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除菜单',
    description: '根据菜单ID删除菜单（如果存在子菜单则无法删除）',
  })
  @ApiParam({ name: 'id', type: Number, description: '菜单ID' })
  @ApiResult({
    status: 200,
    description: '删除成功',
    type: MenuResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '菜单不存在' })
  @ApiResult({ status: 409, description: '存在子菜单，无法删除' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MenuResponseDto> {
    return this.menuService.remove(id);
  }
}
