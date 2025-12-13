import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 用户注册
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({ type: RegisterDto })
  @ApiResult({
    status: 201,
    description: '注册成功',
    type: RegisterResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 409, description: '用户名已存在' })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * 用户登录
   */
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginDto })
  async login(@Request() req): Promise<LoginResponseDto> {
    return this.authService.login(req.user);
  }

  /**
   * 刷新 Token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Token' })
  @ApiBody({ type: RefreshDto })
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  /**
   * 获取当前用户信息
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiBearerAuth()
  async getProfile(@CurrentUser() user: any) {
    return user;
  }

  /**
   * 用户登出
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登出' })
  @ApiBearerAuth()
  async logout(@CurrentUser('userId') userId: number) {
    await this.authService.logout(userId);
    return { message: '登出成功' };
  }
}
