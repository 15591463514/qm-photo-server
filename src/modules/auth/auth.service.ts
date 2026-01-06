import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import {
  USER_TOKEN_KEY,
  USER_REFRESH_TOKEN_KEY,
  USER_VERSION_KEY,
  USER_INFO_KEY,
  USER_PERMISSIONS_KEY,
  getRedisKey,
} from '@/common/constants/redis-key.constants';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { EnableStatus } from '@/common/constants/enums';
import { UserService } from '@/modules/user/user.service';
import { parseExpiresIn } from '@/common/helpers/date.helper';
import { VerificationCodeService } from './services/verification-code.service';
import { NoticeService } from '@/modules/notice/services/notice.service';
import { SYSTEM_RULE_MAP } from '@/constant/systemRules';
import { VERIFICATION_CODE_EXPIRE_MINUTES } from '@/constant/register';

/**
 * 认证服务
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Inject(forwardRef(() => UserService)) private userService: UserService,
    private verificationCodeService: VerificationCodeService,
    private noticeService: NoticeService,
  ) {}

  /**
   * 验证用户（Local Strategy 调用）
   * @param account 账号或邮箱
   * @param password 密码
   * @returns 用户信息（排除密码）
   */
  async validateUser(account: string, password: string): Promise<any> {
    // 判断是邮箱还是用户名（简单判断：包含 @ 符号则为邮箱）
    const isEmail = account.includes('@');

    let user;
    if (isEmail) {
      // 使用邮箱查询用户
      user = await this.prisma.user.findFirst({
        where: { email: account },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    } else {
      // 使用用户名查询用户
      user = await this.prisma.user.findUnique({
        where: { userName: account },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    }

    if (!user) {
      throw new BadRequestException('账号或密码错误');
    }

    // 验证用户状态
    if (user.status !== EnableStatus.ENABLED) {
      throw new ForbiddenException('用户已被禁用');
    }

    // 验证密码（BCrypt）
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('账号或密码错误');
    }

    // 返回用户信息（排除密码）
    const { password: _, ...result } = user;
    return result;
  }

  /**
   * 登录（生成 Token）
   * @param user 用户信息
   * @returns Token 信息
   */
  async login(user: any) {
    const userId = user.id;

    // 提取角色编码
    const roles = user.userRoles?.map((ur: any) => ur.role.roleCode) || [];

    // 获取用户权限（菜单和按钮）
    const permissions = await this.userService.getPermissionsForRoles(roles);

    // 生成 Access Token Payload
    const payload: JwtPayload = {
      userId,
      userName: user.userName,
      roles,
      pv: 1, // 密码版本号，初始为 1
      type: 'access',
    };

    // 获取 Token 过期时间配置
    const accessTokenExpiresIn = this.configService.get<string>(
      'app.jwtAccessTokenExpiresIn',
      '2h',
    );
    const refreshTokenExpiresIn = this.configService.get<string>(
      'app.jwtRefreshTokenExpiresIn',
      '7d',
    );

    // 生成 Access Token（使用配置的过期时间）
    const accessToken = this.jwtService.sign(payload);

    // 生成 Refresh Token（使用配置的过期时间）
    const refreshPayload: JwtPayload = {
      ...payload,
      type: 'refresh',
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: refreshTokenExpiresIn as any, // JWT 模块接受 string 类型的 expiresIn
    });

    // 计算过期时间（单位：秒）
    const accessTokenExpiresInSeconds = parseExpiresIn(accessTokenExpiresIn);
    const refreshTokenExpiresInSeconds = parseExpiresIn(refreshTokenExpiresIn);

    // 存储到 Redis
    await Promise.all([
      // 存储 Access Token（过期时间与 JWT 一致）
      this.cacheManager.set(
        getRedisKey(USER_TOKEN_KEY, userId),
        accessToken,
        accessTokenExpiresInSeconds * 1000, // 转换为毫秒
      ),
      // 存储 Refresh Token（过期时间与 JWT 一致）
      this.cacheManager.set(
        getRedisKey(USER_REFRESH_TOKEN_KEY, userId),
        refreshToken,
        refreshTokenExpiresInSeconds * 1000, // 转换为毫秒
      ),
      // 存储密码版本号（使用 RefreshToken 过期时间，因为密码版本号需要与 RefreshToken 同步）
      this.cacheManager.set(
        getRedisKey(USER_VERSION_KEY, userId),
        '1',
        refreshTokenExpiresInSeconds * 1000,
      ),
      // 存储用户信息（包含角色、权限等，使用 RefreshToken 过期时间）
      this.cacheManager.set(
        getRedisKey(USER_INFO_KEY, userId),
        JSON.stringify({
          ...user,
          userId: user.id, // 添加 userId 字段，用于 @CurrentUser('userId') 装饰器
          roles,
          buttons: permissions.buttons, // 添加权限列表
          menus: permissions.menus, // 添加菜单列表
        }),
        refreshTokenExpiresInSeconds * 1000,
      ),
      // 存储用户权限信息（使用 RefreshToken 过期时间）
      this.cacheManager.set(
        getRedisKey(USER_PERMISSIONS_KEY, userId),
        JSON.stringify(permissions),
        refreshTokenExpiresInSeconds * 1000,
      ),
    ]);

    return {
      token: accessToken,
      refreshToken,
    };
  }

  /**
   * 刷新 Token
   * @param refreshToken Refresh Token
   * @returns 新的 Access Token
   */
  async refresh(refreshToken: string) {
    try {
      // 验证 Refresh Token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);

      // 验证 Token 类型
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的 Refresh Token');
      }

      const userId = payload.userId;

      // 验证 Refresh Token 是否与 Redis 中存储的一致
      const storedRefreshToken = await this.cacheManager.get<string>(
        getRedisKey(USER_REFRESH_TOKEN_KEY, userId),
      );

      if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
        throw new UnauthorizedException('Refresh Token 无效或已过期');
      }

      // 验证密码版本号
      const passwordVersion = await this.cacheManager.get<string>(
        getRedisKey(USER_VERSION_KEY, userId),
      );
      if (payload.pv?.toString() !== passwordVersion) {
        throw new UnauthorizedException('用户信息已修改，请重新登录');
      }

      // 生成新的 Access Token
      const newPayload: JwtPayload = {
        userId: payload.userId,
        userName: payload.userName,
        roles: payload.roles,
        pv: payload.pv,
        type: 'access',
      };
      const accessToken = this.jwtService.sign(newPayload);

      // 获取 AccessToken 过期时间配置
      const accessTokenExpiresIn = this.configService.get<string>(
        'app.jwtAccessTokenExpiresIn',
        '2h',
      );
      const accessTokenExpiresInSeconds = parseExpiresIn(accessTokenExpiresIn);

      // 更新 Redis 中的 Access Token（Refresh Token 保持不变）
      await this.cacheManager.set(
        getRedisKey(USER_TOKEN_KEY, userId),
        accessToken,
        accessTokenExpiresInSeconds * 1000, // 转换为毫秒
      );

      return {
        token: accessToken,
      };
    } catch (error) {
      // 如果是 UnauthorizedException，直接抛出
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // 其他错误（如 JWT 验证失败）统一处理
      throw new UnauthorizedException('Refresh Token 无效或已过期');
    }
  }

  /**
   * 验证 Token（JWT Strategy 调用）
   * @param userId 用户ID
   * @param pv 密码版本号
   * @param token Token 字符串
   * @returns 用户信息
   */
  async validateToken(userId: number, pv: number, token: string) {
    // 验证 Token 是否与 Redis 中存储的一致
    const storedToken = await this.cacheManager.get<string>(
      getRedisKey(USER_TOKEN_KEY, userId),
    );

    if (token !== storedToken) {
      throw new UnauthorizedException('登录状态已过期');
    }

    // 验证密码版本号
    const passwordVersion = await this.cacheManager.get<string>(
      getRedisKey(USER_VERSION_KEY, userId),
    );
    if (pv.toString() !== passwordVersion) {
      throw new UnauthorizedException('用户信息或权限范围已被修改');
    }

    // 获取用户完整信息
    const userString = await this.cacheManager.get<string>(
      getRedisKey(USER_INFO_KEY, userId),
    );

    if (userString) {
      const user = JSON.parse(userString);
      // 确保返回的对象包含 userId 字段（用于 @CurrentUser('userId') 装饰器）
      return {
        ...user,
        userId: user.id || userId,
      };
    }

    // 如果 Redis 中没有用户信息，从数据库查询
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.status !== EnableStatus.ENABLED) {
      throw new ForbiddenException('用户已被禁用');
    }

    const roles = user.userRoles?.map((ur: any) => ur.role.roleCode) || [];

    // 获取用户权限
    const permissions = await this.userService.getPermissionsForRoles(roles);

    // 获取 RefreshToken 过期时间配置（用户信息使用 RefreshToken 过期时间）
    const refreshTokenExpiresIn = this.configService.get<string>(
      'app.jwtRefreshTokenExpiresIn',
      '7d',
    );
    const refreshTokenExpiresInSeconds = parseExpiresIn(refreshTokenExpiresIn);

    // 重新存储到 Redis
    await Promise.all([
      this.cacheManager.set(
        getRedisKey(USER_INFO_KEY, userId),
        JSON.stringify({
          ...user,
          userId: user.id, // 添加 userId 字段
          roles,
          buttons: permissions.buttons,
          menus: permissions.menus,
        }),
        refreshTokenExpiresInSeconds * 1000,
      ),
      this.cacheManager.set(
        getRedisKey(USER_PERMISSIONS_KEY, userId),
        JSON.stringify(permissions),
        refreshTokenExpiresInSeconds * 1000,
      ),
    ]);

    return {
      ...user,
      userId: user.id, // 添加 userId 字段
      roles,
      buttons: permissions.buttons,
      menus: permissions.menus,
    };
  }

  /**
   * 发送验证码
   * @param email 邮箱地址
   * @returns 发送结果
   */
  async sendVerificationCode(email: string): Promise<{ message: string }> {
    // 检查邮箱是否已被注册
    const existingEmail = await this.prisma.user.findFirst({
      where: { email },
    });

    if (existingEmail) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 生成验证码
    const code = await this.verificationCodeService.generateAndStoreCode(email);

    // 触发通知规则 system_email_code，传入邮箱地址和验证码
    await this.noticeService.triggerEvent(
      SYSTEM_RULE_MAP.SYSTEM_EMAIL_CODE.msgSource,
      SYSTEM_RULE_MAP.SYSTEM_EMAIL_CODE.msgType,
      {
        code,
        expireMinutes: VERIFICATION_CODE_EXPIRE_MINUTES,
      },
      email, // 传入邮箱地址作为通知地址
    );

    return {
      message: '验证码已发送到您的邮箱',
    };
  }

  /**
   * 注册用户
   * @param registerDto 注册参数
   * @returns 注册结果
   */
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    // 验证验证码
    if (registerDto.email && registerDto.verificationCode) {
      const isValid = await this.verificationCodeService.verifyCode(
        registerDto.email,
        registerDto.verificationCode,
      );

      if (!isValid) {
        throw new BadRequestException('验证码错误或已过期');
      }
    } else {
      throw new BadRequestException('邮箱和验证码不能为空');
    }

    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { userName: registerDto.username },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 检查邮箱是否已被使用
    const existingEmail = await this.prisma.user.findFirst({
      where: { email: registerDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 查找默认角色（普通用户角色）
    const defaultRole = await this.prisma.role.findUnique({
      where: { roleCode: 'user' },
      select: { roleId: true },
    });

    if (!defaultRole) {
      throw new NotFoundException('默认角色 user 不存在，请联系管理员');
    }

    // 创建用户并分配默认角色
    const user = await this.prisma.user.create({
      data: {
        userName: registerDto.username,
        password: hashedPassword,
        email: registerDto.email,
        status: EnableStatus.ENABLED, // 默认启用
        userGender: 'unknown', // 默认未知
        userRoles: {
          create: {
            roleId: defaultRole.roleId,
          },
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    // 注册成功后自动登录：生成 Token
    const loginResult = await this.login(user);

    // 返回注册结果和登录 Token（拦截器会自动包装为 { code, message, data } 格式）
    return {
      userId: Number(user.id), // 确保是 number 类型
      userName: user.userName,
      message: '注册成功',
      token: loginResult.token,
      refreshToken: loginResult.refreshToken,
    };
  }

  /**
   * 登出
   * @param userId 用户ID
   */
  async logout(userId: number) {
    // 删除 Redis 中的相关数据
    await Promise.all([
      this.cacheManager.del(getRedisKey(USER_TOKEN_KEY, userId)),
      this.cacheManager.del(getRedisKey(USER_REFRESH_TOKEN_KEY, userId)),
      this.cacheManager.del(getRedisKey(USER_VERSION_KEY, userId)),
      this.cacheManager.del(getRedisKey(USER_INFO_KEY, userId)),
      this.cacheManager.del(getRedisKey(USER_PERMISSIONS_KEY, userId)),
    ]);
  }
}
