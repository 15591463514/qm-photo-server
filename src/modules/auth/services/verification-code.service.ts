import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { VERIFICATION_CODE_EXPIRE_MINUTES } from '@/constant/register';

/**
 * 验证码信息接口
 */
interface VerificationCodeInfo {
  code: string; // 验证码
  expiresAt: number; // 过期时间戳（毫秒）
}

/**
 * 验证码服务
 * 用于生成、存储和验证邮箱验证码
 */
@Injectable()
export class VerificationCodeService {
  private readonly logger = new Logger(VerificationCodeService.name);
  private readonly CODE_EXPIRE_TIME =
    VERIFICATION_CODE_EXPIRE_MINUTES * 60 * 1000; // 验证码有效期（毫秒）
  private readonly KEY_PREFIX = 'verification_code:'; // Redis 键前缀

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * 生成4位数字验证码
   * @returns 验证码字符串
   */
  private generateCode(): string {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    return code;
  }

  /**
   * 获取验证码的 Redis 键
   * @param email 邮箱地址
   * @returns Redis 键
   */
  private getCodeKey(email: string): string {
    return `${this.KEY_PREFIX}${email}`;
  }

  /**
   * 生成并存储验证码
   * 如果邮箱已有验证码（无论是否过期），都会删除旧验证码并生成新的验证码
   * @param email 邮箱地址
   * @returns 验证码
   */
  async generateAndStoreCode(email: string): Promise<string> {
    const key = this.getCodeKey(email);

    try {
      // 检查是否存在旧的验证码
      const existingCodeInfo =
        await this.cacheManager.get<VerificationCodeInfo>(key);

      // 如果存在旧的验证码（无论是否过期），先删除它
      if (existingCodeInfo) {
        await this.cacheManager.del(key);
        const now = Date.now();
        if (existingCodeInfo.expiresAt > now) {
          this.logger.log(
            `邮箱 ${email} 的验证码未过期，但用户重新请求，已使旧验证码过期并生成新验证码`,
          );
        } else {
          this.logger.log(`邮箱 ${email} 的验证码已过期，生成新验证码`);
        }
      }

      // 生成新验证码
      const code = this.generateCode();
      const expiresAt = Date.now() + this.CODE_EXPIRE_TIME;

      const codeInfo: VerificationCodeInfo = {
        code,
        expiresAt,
      };

      // 存储验证码（过期时间设置为验证码有效期）
      await this.cacheManager.set(key, codeInfo, this.CODE_EXPIRE_TIME);

      this.logger.log(
        `为邮箱 ${email} 生成验证码成功，有效期 ${this.CODE_EXPIRE_TIME / 1000} 秒`,
      );

      return code;
    } catch (error) {
      this.logger.error(`生成验证码失败 [${email}]:`, error);
      throw error;
    }
  }

  /**
   * 验证验证码
   * @param email 邮箱地址
   * @param code 用户输入的验证码
   * @returns 是否验证通过
   */
  async verifyCode(email: string, code: string): Promise<boolean> {
    const key = this.getCodeKey(email);

    try {
      const codeInfo = await this.cacheManager.get<VerificationCodeInfo>(key);

      if (!codeInfo) {
        this.logger.warn(`邮箱 ${email} 的验证码不存在或已过期`);
        return false;
      }

      const now = Date.now();
      if (codeInfo.expiresAt <= now) {
        this.logger.warn(`邮箱 ${email} 的验证码已过期`);
        // 删除过期的验证码
        await this.cacheManager.del(key);
        return false;
      }

      if (codeInfo.code !== code) {
        this.logger.warn(
          `邮箱 ${email} 的验证码验证失败：期望 ${codeInfo.code}，实际 ${code}`,
        );
        return false;
      }

      // 验证成功后删除验证码（一次性使用）
      await this.cacheManager.del(key);
      this.logger.log(`邮箱 ${email} 的验证码验证成功`);

      return true;
    } catch (error) {
      this.logger.error(`验证验证码失败 [${email}]:`, error);
      return false;
    }
  }

  /**
   * 删除验证码（用于清理）
   * @param email 邮箱地址
   */
  async deleteCode(email: string): Promise<void> {
    const key = this.getCodeKey(email);
    await this.cacheManager.del(key);
    this.logger.log(`删除邮箱 ${email} 的验证码`);
  }
}
