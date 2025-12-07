import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'nestjs-prisma';
import { Prisma } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import {
  USER_TOKEN_KEY,
  USER_VERSION_KEY,
  USER_INFO_KEY,
  getRedisKey,
} from '@/common/constants/redis-key.constants';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

/**
 * 认证服务
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * 验证用户（Local Strategy 调用）
   * @param userName 用户名
   * @param password 密码
   * @returns 用户信息（排除密码）
   */
  async validateUser(userName: string, password: string): Promise<any> {
    // 使用 Prisma 查询用户
    const user = await this.prisma.user.findUnique({
      where: { userName },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证用户状态
    if (user.status !== '1') {
      throw new UnauthorizedException('用户已被禁用');
    }

    // 验证密码（BCrypt）
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
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

    // 生成 Access Token Payload
    const payload: JwtPayload = {
      userId,
      userName: user.userName,
      roles,
      pv: 1, // 密码版本号，初始为 1
      type: 'access',
    };

    // 生成 Access Token（默认过期时间由 JWT 模块配置）
    const accessToken = this.jwtService.sign(payload);

    // 生成 Refresh Token（7天过期）
    const refreshPayload: JwtPayload = {
      ...payload,
      type: 'refresh',
    };
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '7d',
    });

    // 计算过期时间（7天，单位：秒）
    const expiresIn = 7 * 24 * 60 * 60; // 7天

    // 存储到 Redis
    await Promise.all([
      // 存储 Token
      this.cacheManager.set(
        getRedisKey(USER_TOKEN_KEY, userId),
        accessToken,
        expiresIn * 1000, // 转换为毫秒
      ),
      // 存储密码版本号
      this.cacheManager.set(
        getRedisKey(USER_VERSION_KEY, userId),
        '1',
        expiresIn * 1000,
      ),
      // 存储用户信息（包含角色、权限等）
      this.cacheManager.set(
        getRedisKey(USER_INFO_KEY, userId),
        JSON.stringify({
          ...user,
          userId: user.id, // 添加 userId 字段，用于 @CurrentUser('userId') 装饰器
          roles,
        }),
        expiresIn * 1000,
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

      // 验证 Token 是否与 Redis 中存储的一致
      const userId = payload.userId;
      const storedToken = await this.cacheManager.get<string>(
        getRedisKey(USER_TOKEN_KEY, userId),
      );

      if (!storedToken) {
        throw new UnauthorizedException('Token 已过期，请重新登录');
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

      // 更新 Redis 中的 Token
      const expiresIn = 7 * 24 * 60 * 60; // 7天
      await this.cacheManager.set(
        getRedisKey(USER_TOKEN_KEY, userId),
        accessToken,
        expiresIn * 1000,
      );

      return {
        token: accessToken,
      };
    } catch (error) {
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

    if (!user || user.status !== '1') {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    const roles = user.userRoles?.map((ur: any) => ur.role.roleCode) || [];

    // 重新存储到 Redis
    const expiresIn = 7 * 24 * 60 * 60;
    await this.cacheManager.set(
      getRedisKey(USER_INFO_KEY, userId),
      JSON.stringify({
        ...user,
        userId: user.id, // 添加 userId 字段
        roles,
      }),
      expiresIn * 1000,
    );

    return {
      ...user,
      userId: user.id, // 添加 userId 字段
      roles,
    };
  }

  /**
   * 注册用户
   * @param registerDto 注册参数
   * @returns 注册结果
   */
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { userName: registerDto.username },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        userName: registerDto.username,
        password: hashedPassword,
        status: '1', // 默认启用
        userGender: 'unknown', // 默认未知
      },
    });

    // 返回注册结果（拦截器会自动包装为 { code, message, data } 格式）
    return {
      userId: Number(user.id), // 确保是 number 类型
      userName: user.userName,
      message: '注册成功',
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
      this.cacheManager.del(getRedisKey(USER_VERSION_KEY, userId)),
      this.cacheManager.del(getRedisKey(USER_INFO_KEY, userId)),
    ]);
  }
}
