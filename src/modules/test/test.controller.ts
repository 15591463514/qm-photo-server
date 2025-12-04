import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';
import { TestService } from './test.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { TestResponseDto } from './dto/test-response.dto';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { PaginationPipe } from '@/common/pipes/pagination.pipe';
import { QueryTestDto } from './dto/query-test.dto';
import { CacheTTL, CacheInterceptor, CacheKey } from '@nestjs/cache-manager';

@ApiTags('test')
@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Post()
  @ApiOperation({
    summary: '创建测试数据',
    description: '创建一个新的测试数据记录',
  })
  @ApiBody({ type: CreateTestDto })
  @ApiResult({
    status: 201,
    description: '创建成功',
    type: TestResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  create(@Body() createTestDto: CreateTestDto) {
    return this.testService.create(createTestDto);
  }

  @Get()
  @ApiOperation({
    summary: '分页查询测试数据',
    description: '分页获取未删除的测试数据列表，支持按名称和状态筛选',
  })
  @ApiExtraModels(QueryTestDto, PaginationDto)
  @ApiQuery({ type: QueryTestDto })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [TestResponseDto],
    isPage: true,
  })
  @UseInterceptors(CacheInterceptor) // 必须添加此拦截器，@CacheTTL 才能生效
  @CacheTTL(30 * 1000) // 缓存 30 秒，缓存键会自动根据 URL 和查询参数生成
  findPaginated(@Query(PaginationPipe) query: QueryTestDto) {
    return this.testService.findPaginated(query);
  }

  @Get('cache')
  @ApiOperation({
    summary: '测试缓存',
    description: '测试缓存',
  })
  @ApiResult({
    status: 200,
    description: '查询成功',
  })
  async testCache() {
    return this.testService.testCache();
  }

  @Get('deleted/all')
  @ApiOperation({
    summary: '查询已删除的数据',
    description: '获取所有已软删除的测试数据列表',
  })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [TestResponseDto],
  })
  findDeleted() {
    return this.testService.findDeleted();
  }

  @Get(':id')
  @ApiOperation({
    summary: '查询单个测试数据',
    description: '根据 ID 获取单个测试数据',
  })
  @ApiParam({ name: 'id', type: Number, description: '测试数据 ID' })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: TestResponseDto,
  })
  @ApiResult({ status: 404, description: '数据不存在' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.testService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '更新测试数据',
    description: '根据 ID 更新测试数据',
  })
  @ApiParam({ name: 'id', type: Number, description: '测试数据 ID' })
  @ApiBody({ type: UpdateTestDto })
  @ApiResult({
    status: 200,
    description: '更新成功',
    type: TestResponseDto,
  })
  @ApiResult({ status: 404, description: '数据不存在' })
  @ApiResult({ status: 400, description: '请求参数错误' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTestDto: UpdateTestDto,
  ) {
    return this.testService.update(id, updateTestDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除测试数据（软删除）',
    description: '根据 ID 软删除测试数据，数据不会真正删除，只是标记为已删除',
  })
  @ApiParam({ name: 'id', type: Number, description: '测试数据 ID' })
  @ApiResult({
    status: 200,
    description: '删除成功',
    type: TestResponseDto,
  })
  @ApiResult({ status: 404, description: '数据不存在' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.testService.remove(id);
  }

  @Post(':id/restore')
  @ApiOperation({
    summary: '恢复已删除的数据',
    description: '根据 ID 恢复已软删除的测试数据',
  })
  @ApiParam({ name: 'id', type: Number, description: '测试数据 ID' })
  @ApiResult({
    status: 200,
    description: '恢复成功',
    type: TestResponseDto,
  })
  @ApiResult({ status: 404, description: '数据不存在或未被删除' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.testService.restore(id);
  }

  @Delete(':id/hard')
  @ApiOperation({
    summary: '永久删除数据（硬删除）',
    description: '根据 ID 永久删除测试数据，此操作不可恢复',
  })
  @ApiParam({ name: 'id', type: Number, description: '测试数据 ID' })
  @ApiResult({
    status: 200,
    description: '删除成功',
    type: TestResponseDto,
  })
  @ApiResult({ status: 404, description: '数据不存在' })
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.testService.hardDelete(id);
  }
}
