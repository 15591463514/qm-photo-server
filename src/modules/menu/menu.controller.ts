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
import { UpdateMenuDto } from './dto/update-menu.dto';
import { QueryMenuDto } from './dto/query-menu.dto';
import { MenuResponseDto } from './dto/menu-response.dto';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

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
   * 删除菜单
   */
  @Delete(':id')
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
