import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { QueryAddressDto } from './dto/query-address.dto';
import { AddressResponseDto } from './dto/address-response.dto';
import { BatchDeleteAddressDto } from './dto/batch-delete-address.dto';
import { ToggleStatusDto } from '@/common/dto/toggle-status.dto';
import { BatchToggleStatusDto } from '@/common/dto/batch-toggle-status.dto';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequiresPermissions } from '@/common/decorators/permissions.decorator';
import { PaginationPipe } from '@/common/pipes/pagination.pipe';

@ApiTags('地址管理')
@Controller('address')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get('list')
  @RequiresPermissions('address:view')
  @ApiOperation({
    summary: '获取地址列表（分页）',
    description: '分页获取地址列表，支持按关键词、省、市、区/县、状态筛选',
  })
  @ApiExtraModels(QueryAddressDto)
  @ApiQuery({ type: QueryAddressDto })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [AddressResponseDto],
    isPage: true,
  })
  @ApiResult({ status: 401, description: '未授权' })
  findPaginated(@Query(PaginationPipe) query: QueryAddressDto) {
    return this.addressService.findPaginated(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取地址详情',
    description: '根据 ID 获取地址详细信息',
  })
  @ApiParam({ name: 'id', type: Number, description: '地址ID' })
  @ApiResult({
    status: 200,
    description: '获取成功',
    type: AddressResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '地址不存在' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.addressService.findOne(id);
  }

  @Post()
  @RequiresPermissions('address:add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建地址',
    description: '创建新地址',
  })
  @ApiBody({ type: CreateAddressDto })
  @ApiResult({
    status: 201,
    description: '创建成功',
    type: AddressResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  async create(
    @Body() createAddressDto: CreateAddressDto,
    @CurrentUser('userId') userId?: number,
  ) {
    return this.addressService.create(createAddressDto, userId);
  }

  @Put(':id')
  @RequiresPermissions('address:edit')
  @ApiOperation({
    summary: '更新地址',
    description: '根据 ID 更新地址信息',
  })
  @ApiParam({ name: 'id', type: Number, description: '地址ID' })
  @ApiBody({ type: UpdateAddressDto })
  @ApiResult({
    status: 200,
    description: '更新成功',
    type: AddressResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '地址不存在' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAddressDto: UpdateAddressDto,
    @CurrentUser('userId') userId?: number,
  ) {
    return this.addressService.update(id, updateAddressDto, userId);
  }

  @Patch('batch/status')
  @RequiresPermissions('address:edit')
  @ApiOperation({
    summary: '批量切换地址状态',
    description: '批量切换地址的启用/禁用状态，单个切换时传递长度为1的数组',
  })
  @ApiBody({ type: BatchToggleStatusDto })
  @ApiResult({
    status: 200,
    description: '切换成功',
    type: Object,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '部分地址不存在' })
  async batchToggleStatus(
    @Body() batchToggleStatusDto: BatchToggleStatusDto,
    @CurrentUser('userId') userId?: number,
  ) {
    const count = await this.addressService.batchToggleStatus(
      batchToggleStatusDto.ids,
      batchToggleStatusDto.status,
      userId,
    );
    return { count };
  }

  @Delete('batch')
  @RequiresPermissions('address:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '批量删除地址',
    description: '根据 ID 数组批量删除地址',
  })
  @ApiExtraModels(BatchDeleteAddressDto)
  @ApiBody({ type: BatchDeleteAddressDto })
  @ApiResult({
    status: 200,
    description: '删除成功',
    type: Object,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '部分地址不存在' })
  async batchRemove(@Body() dto: BatchDeleteAddressDto) {
    const count = await this.addressService.batchRemove(dto.ids);
    return { count };
  }

  @Delete(':id')
  @RequiresPermissions('address:delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除地址',
    description: '根据 ID 删除地址',
  })
  @ApiParam({ name: 'id', type: Number, description: '地址ID' })
  @ApiResult({
    status: 200,
    description: '删除成功',
    type: AddressResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '地址不存在' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.addressService.remove(id);
  }
}
