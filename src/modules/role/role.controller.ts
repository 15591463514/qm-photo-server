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
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import {
  AssignRolePermissionsDto,
  RolePermissionsResponseDto,
} from './dto/role-permissions.dto';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('角色管理')
@Controller('role')
@UseGuards(JwtAuthGuard) // 所有接口都需要 JWT 认证
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  /**
   * 获取角色列表
   */
  @Get('list')
  @ApiOperation({
    summary: '获取角色列表',
    description:
      '获取角色列表，支持按角色ID、角色名称、角色编码、描述、启用状态筛选',
  })
  @ApiExtraModels(QueryRoleDto)
  @ApiQuery({ type: QueryRoleDto })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [RoleResponseDto],
  })
  @ApiResult({ status: 401, description: '未授权' })
  findAll(@Query() query: QueryRoleDto) {
    return this.roleService.findAll(query);
  }

  /**
   * 获取角色详情
   */
  @Get(':id')
  @ApiOperation({
    summary: '获取角色详情',
    description: '根据 ID 获取角色详细信息',
  })
  @ApiParam({ name: 'id', type: Number, description: '角色ID' })
  @ApiResult({
    status: 200,
    description: '获取成功',
    type: RoleResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '角色不存在' })
  async findOne(@Param('id', ParseIntPipe) roleId: number) {
    return this.roleService.findOne(roleId);
  }

  /**
   * 创建角色
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建角色',
    description: '创建一个新的角色',
  })
  @ApiBody({ type: CreateRoleDto })
  @ApiResult({
    status: 201,
    description: '创建成功',
    type: RoleResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 409, description: '角色编码已存在' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  /**
   * 更新角色
   */
  @Put(':id')
  @ApiOperation({
    summary: '更新角色',
    description: '根据 ID 更新角色信息',
  })
  @ApiParam({ name: 'id', type: Number, description: '角色ID' })
  @ApiBody({ type: UpdateRoleDto })
  @ApiResult({
    status: 200,
    description: '更新成功',
    type: RoleResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '角色不存在' })
  @ApiResult({ status: 409, description: '角色编码已存在' })
  async update(
    @Param('id', ParseIntPipe) roleId: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(roleId, updateRoleDto);
  }

  /**
   * 删除角色
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除角色',
    description: '根据 ID 删除角色（如果角色已被用户使用，则无法删除）',
  })
  @ApiParam({ name: 'id', type: Number, description: '角色ID' })
  @ApiResult({
    status: 200,
    description: '删除成功',
    type: RoleResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '角色不存在' })
  @ApiResult({ status: 409, description: '该角色已被用户使用，无法删除' })
  async remove(@Param('id', ParseIntPipe) roleId: number) {
    return this.roleService.remove(roleId);
  }

  /**
   * 获取角色权限
   */
  @Get(':id/permissions')
  @ApiOperation({
    summary: '获取角色权限',
    description: '获取指定角色的菜单和按钮权限',
  })
  @ApiParam({ name: 'id', type: Number, description: '角色ID' })
  @ApiResult({
    status: 200,
    description: '获取成功',
    type: [RolePermissionsResponseDto],
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '角色不存在' })
  async getRolePermissions(@Param('id', ParseIntPipe) roleId: number) {
    return this.roleService.getRolePermissions(roleId);
  }

  /**
   * 分配角色权限
   */
  @Post(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '分配角色权限',
    description: '为指定角色分配菜单和按钮权限',
  })
  @ApiParam({ name: 'id', type: Number, description: '角色ID' })
  @ApiBody({ type: AssignRolePermissionsDto })
  @ApiResult({
    status: 200,
    description: '分配成功',
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '角色不存在或菜单/按钮不存在' })
  @ApiResult({ status: 409, description: '按钮不属于指定菜单' })
  async assignRolePermissions(
    @Param('id', ParseIntPipe) roleId: number,
    @Body() assignDto: AssignRolePermissionsDto,
  ) {
    await this.roleService.assignRolePermissions(roleId, assignDto);
    return { message: '权限分配成功' };
  }
}
