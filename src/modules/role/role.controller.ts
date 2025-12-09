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
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { PaginationPipe } from '@/common/pipes/pagination.pipe';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('role')
@Controller('role')
@UseGuards(JwtAuthGuard) // 所有接口都需要 JWT 认证
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('list')
  @ApiOperation({
    summary: '获取角色列表（分页）',
    description:
      '分页获取角色列表，支持按角色ID、角色名称、角色编码、描述、启用状态筛选',
  })
  @ApiExtraModels(QueryRoleDto, PaginationDto)
  @ApiQuery({ type: QueryRoleDto })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [RoleResponseDto],
    isPage: true,
  })
  @ApiResult({ status: 401, description: '未授权' })
  findPaginated(@Query(PaginationPipe) query: QueryRoleDto) {
    return this.roleService.findPaginated(query);
  }

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
}
