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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserInfoResponseDto } from './dto/user-info-response.dto';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { PaginationPipe } from '@/common/pipes/pagination.pipe';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('user')
@Controller('user')
@UseGuards(JwtAuthGuard) // 所有接口都需要 JWT 认证
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('info')
  @ApiOperation({
    summary: '获取当前用户信息',
    description: '获取当前登录用户的详细信息，包含角色和按钮权限',
  })
  @ApiResult({
    status: 200,
    description: '获取成功',
    type: UserInfoResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '用户不存在' })
  async getUserInfo(
    @CurrentUser('userId') userId: number,
  ): Promise<UserInfoResponseDto> {
    return this.userService.getUserInfo(userId);
  }

  @Get('list')
  @ApiOperation({
    summary: '获取用户列表（分页）',
    description: '分页获取用户列表，支持按用户名、昵称、邮箱、手机号、状态筛选',
  })
  @ApiExtraModels(QueryUserDto, PaginationDto)
  @ApiQuery({ type: QueryUserDto })
  @ApiResult({
    status: 200,
    description: '查询成功',
    type: [UserResponseDto],
    isPage: true,
  })
  @ApiResult({ status: 401, description: '未授权' })
  findPaginated(@Query(PaginationPipe) query: QueryUserDto) {
    return this.userService.findPaginated(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '创建用户',
    description: '创建一个新的用户',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResult({
    status: 201,
    description: '创建成功',
    type: UserResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 409, description: '用户名已存在' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser('userId') currentUserId?: number,
  ) {
    return this.userService.create(createUserDto, currentUserId);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新用户',
    description: '根据 ID 更新用户信息',
  })
  @ApiParam({ name: 'id', type: String, description: '用户ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResult({
    status: 200,
    description: '更新成功',
    type: UserResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '用户不存在' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('userId') currentUserId?: number,
  ) {
    return this.userService.update(id, updateUserDto, currentUserId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '删除用户',
    description: '根据 ID 删除用户（硬删除）',
  })
  @ApiParam({ name: 'id', type: String, description: '用户ID' })
  @ApiResult({
    status: 200,
    description: '删除成功',
    type: UserResponseDto,
  })
  @ApiResult({ status: 401, description: '未授权' })
  @ApiResult({ status: 404, description: '用户不存在' })
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
