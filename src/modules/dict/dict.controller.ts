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
import { DictService } from './dict.service';
import { CreateDictDto } from './dto/create-dict.dto';
import { UpdateDictDto } from './dto/update-dict.dto';
import { UpdateDictTypeDto } from './dto/update-dict-type.dto';
import { QueryDictDto } from './dto/query-dict.dto';
import { DictResponseDto } from './dto/dict-response.dto';
import { DictTreeResponseDto } from './dto/dict-tree-response.dto';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('字典管理')
@Controller('dict')
@UseGuards(JwtAuthGuard) // 所有接口都需要 JWT 认证
@ApiBearerAuth()
export class DictController {
  constructor(private readonly dictService: DictService) {}

  @Get('tree')
  @ApiOperation({
    summary: '获取字典树形结构',
    description:
      '获取字典树形结构，第一级是字典类型，第二级是字典数据。支持按类型编码、类型名称、标签、值、状态筛选',
  })
  @ApiExtraModels(QueryDictDto)
  @ApiQuery({ type: QueryDictDto })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [DictTreeResponseDto],
  })
  @ApiResult({ status: 401, description: '未授权' })
  async getDictTree(@Query() query: QueryDictDto) {
    return this.dictService.getDictTree(query);
  }

  @Get('data/:typeCode')
  @ApiOperation({
    summary: '根据字典类型获取字典数据',
    description: '根据字典类型编码获取该类型下的所有字典数据',
  })
  @ApiParam({ name: 'typeCode', type: String, description: '字典类型编码' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '状态（1-启用，2-禁用）',
  })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [DictResponseDto],
  })
  @ApiResult({ status: 401, description: '未授权' })
  async getDictDataByType(
    @Param('typeCode') typeCode: string,
    @Query('status') status?: string,
  ) {
    return this.dictService.getDictDataByType(typeCode, status);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取字典详情',
    description: '根据 ID 获取字典详细信息',
  })
  @ApiParam({ name: 'id', type: Number, description: '字典ID' })
  @ApiResult({
    status: 200,
    description: '获取成功',
    type: DictResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '字典不存在' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dictService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建字典',
    description: '创建一个新的字典项',
  })
  @ApiBody({ type: CreateDictDto })
  @ApiResult({
    status: 201,
    description: '创建成功',
    type: DictResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 409, description: '字典值已存在' })
  async create(
    @Body() createDictDto: CreateDictDto,
    @CurrentUser('userId') userId?: number,
  ) {
    return this.dictService.create(createDictDto, userId);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新字典',
    description: '根据 ID 更新字典信息',
  })
  @ApiParam({ name: 'id', type: Number, description: '字典ID' })
  @ApiBody({ type: UpdateDictDto })
  @ApiResult({
    status: 200,
    description: '更新成功',
    type: DictResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '字典不存在' })
  @ApiResult({ status: 409, description: '字典值已存在' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDictDto: UpdateDictDto,
    @CurrentUser('userId') userId?: number,
  ) {
    return this.dictService.update(id, updateDictDto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除字典',
    description: '根据 ID 删除字典',
  })
  @ApiParam({ name: 'id', type: Number, description: '字典ID' })
  @ApiResult({
    status: 200,
    description: '删除成功',
    type: DictResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '字典不存在' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.dictService.remove(id);
  }

  @Put('type/:typeCode')
  @ApiOperation({
    summary: '更新字典类型',
    description: '根据类型编码更新字典类型信息（会更新该类型下所有字典记录）',
  })
  @ApiParam({ name: 'typeCode', type: String, description: '字典类型编码' })
  @ApiBody({ type: UpdateDictTypeDto })
  @ApiResult({
    status: 200,
    description: '更新成功',
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '字典类型不存在' })
  @ApiResult({ status: 409, description: '字典类型编码已存在' })
  async updateDictType(
    @Param('typeCode') typeCode: string,
    @Body() updateDictTypeDto: UpdateDictTypeDto,
    @CurrentUser('userId') userId?: number,
  ) {
    return this.dictService.updateDictType(typeCode, updateDictTypeDto, userId);
  }

  @Delete('type/:typeCode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除字典类型',
    description: '根据类型编码删除字典类型（会删除该类型下的所有字典数据）',
  })
  @ApiParam({ name: 'typeCode', type: String, description: '字典类型编码' })
  @ApiResult({
    status: 200,
    description: '删除成功',
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '字典类型不存在' })
  async removeDictType(@Param('typeCode') typeCode: string) {
    const count = await this.dictService.removeDictType(typeCode);
    return { count };
  }
}
