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
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { BatchCreateTagDto } from './dto/batch-create-tag.dto';
import { BatchDeleteTagDto } from './dto/batch-delete-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { UpdateTagGroupDto } from './dto/update-tag-group.dto';
import { QueryTagDto } from './dto/query-tag.dto';
import { TagResponseDto } from './dto/tag-response.dto';
import { TagTreeResponseDto } from './dto/tag-tree-response.dto';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequiresPermissions } from '@/common/decorators/permissions.decorator';

@ApiTags('标签管理')
@Controller('tag')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get('tree')
  @ApiOperation({
    summary: '获取标签树形结构',
    description:
      '获取标签树形结构，第一级是标签组，第二级是标签数据。支持按组代码、组名称、标签名称、值、状态筛选',
  })
  @ApiExtraModels(QueryTagDto)
  @ApiQuery({ type: QueryTagDto })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [TagTreeResponseDto],
  })
  @ApiResult({ status: 401, description: '未授权' })
  async getTagTree(@Query() query: QueryTagDto) {
    return this.tagService.getTagTree(query);
  }

  @Get('data/:groupCode')
  @ApiOperation({
    summary: '根据标签组获取标签数据',
    description: '根据标签组代码获取该组下的所有标签数据',
  })
  @ApiParam({ name: 'groupCode', type: String, description: '标签组代码' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '状态（1-启用，0-禁用）',
  })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [TagResponseDto],
  })
  @ApiResult({ status: 401, description: '未授权' })
  async getTagsByGroup(
    @Param('groupCode') groupCode: string,
    @Query('status') status?: number,
  ) {
    return this.tagService.getTagsByGroup(groupCode, status);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取标签详情',
    description: '根据 ID 获取标签详细信息',
  })
  @ApiParam({ name: 'id', type: Number, description: '标签ID' })
  @ApiResult({
    status: 200,
    description: '获取成功',
    type: TagResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '标签不存在' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tagService.findOne(id);
  }

  @Post()
  @RequiresPermissions('tag:add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '批量创建标签',
    description: '批量创建标签项（支持单个或多个）',
  })
  @ApiExtraModels(BatchCreateTagDto)
  @ApiBody({ type: BatchCreateTagDto })
  @ApiResult({
    status: 201,
    description: '创建成功',
    type: [TagResponseDto],
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 409, description: '标签值已存在' })
  async create(
    @Body() batchCreateTagDto: BatchCreateTagDto,
    @CurrentUser('userId') userId?: number,
  ) {
    return this.tagService.batchCreate(batchCreateTagDto, userId);
  }

  @Put(':id')
  @RequiresPermissions('tag:edit')
  @ApiOperation({
    summary: '更新标签',
    description: '根据 ID 更新标签信息',
  })
  @ApiParam({ name: 'id', type: Number, description: '标签ID' })
  @ApiBody({ type: UpdateTagDto })
  @ApiResult({
    status: 200,
    description: '更新成功',
    type: TagResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '标签不存在' })
  @ApiResult({ status: 409, description: '标签值已存在' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTagDto: UpdateTagDto,
    @CurrentUser('userId') userId?: number,
  ) {
    return this.tagService.update(id, updateTagDto, userId);
  }

  @Delete('batch')
  @RequiresPermissions('tag:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量删除标签',
    description: '根据 ID 数组批量删除标签',
  })
  @ApiExtraModels(BatchDeleteTagDto)
  @ApiBody({ type: BatchDeleteTagDto })
  @ApiResult({
    status: 200,
    description: '删除成功',
    type: Object,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '部分标签不存在' })
  async batchRemove(@Body() dto: BatchDeleteTagDto) {
    const count = await this.tagService.batchRemove(dto.ids);
    return { count };
  }

  @Delete(':id')
  @RequiresPermissions('tag:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除标签',
    description: '根据 ID 删除标签',
  })
  @ApiParam({ name: 'id', type: Number, description: '标签ID' })
  @ApiResult({
    status: 200,
    description: '删除成功',
    type: TagResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '标签不存在' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.tagService.remove(id);
  }

  @Put('group/:groupCode')
  @RequiresPermissions('tag:group:edit')
  @ApiOperation({
    summary: '更新标签组',
    description: '根据组代码更新标签组信息（会更新该组下所有标签记录）',
  })
  @ApiParam({ name: 'groupCode', type: String, description: '标签组代码' })
  @ApiBody({ type: UpdateTagGroupDto })
  @ApiResult({
    status: 200,
    description: '更新成功',
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '标签组不存在' })
  @ApiResult({ status: 409, description: '标签组代码已存在' })
  async updateTagGroup(
    @Param('groupCode') groupCode: string,
    @Body() updateTagGroupDto: UpdateTagGroupDto,
    @CurrentUser('userId') userId?: number,
  ) {
    return this.tagService.updateTagGroup(groupCode, updateTagGroupDto, userId);
  }
}
