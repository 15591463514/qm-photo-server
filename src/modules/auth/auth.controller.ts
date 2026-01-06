import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiResult } from '@/common/decorators/api-result.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { CaptchaService } from './services/captcha.service';
import { Throttle } from '@nestjs/throttler';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private captchaService: CaptchaService,
  ) {}

  /**
   * 生成图片验证码
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 20000 } }) // 5次/20秒
  @Get('captcha')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '生成图片验证码' })
  @ApiResult({
    status: 200,
    description: '生成成功',
    example: {
      captchaId: '123e4567-e89b-12d3-a456-426614174000',
      svg: '<svg>...</svg>',
    },
  })
  async generateCaptcha() {
    return this.captchaService.generateCaptcha();
  }

  /**
   * 发送验证码
   */
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3次/20秒
  @Post('send-verification-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送邮箱验证码' })
  @ApiBody({ type: SendVerificationCodeDto })
  @ApiResult({
    status: 200,
    description: '验证码发送成功',
    example: { message: '验证码已发送到您的邮箱' },
  })
  @ApiResult({ status: 400, description: '请求参数错误' })
  @ApiResult({ status: 409, description: '该邮箱已被注册' })
  async sendVerificationCode(
    @Body() sendVerificationCodeDto: SendVerificationCodeDto,
  ) {
    return this.authService.sendVerificationCode(sendVerificationCodeDto.email);
  }

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
  @ApiResult({ status: 409, description: '用户名已存在或该邮箱已被注册' })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * 用户登录
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginDto })
  @ApiResult({
    status: 200,
    description: '登录成功',
    type: LoginResponseDto,
  })
  @ApiResult({ status: 400, description: '请求参数错误或验证码错误' })
  @ApiResult({ status: 401, description: '账号或密码错误' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    // 先验证验证码
    const isValid = await this.captchaService.verifyCaptcha(
      loginDto.captchaId,
      loginDto.captchaText,
    );

    if (!isValid) {
      throw new BadRequestException('验证码错误或已过期');
    }

    // 验证码通过后，验证用户账号和密码
    const user = await this.authService.validateUser(
      loginDto.account,
      loginDto.password,
    );

    // 验证通过，生成 Token
    return this.authService.login(user);
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
