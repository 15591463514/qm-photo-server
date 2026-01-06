import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import svgCaptcha from 'svg-captcha';
import { randomUUID } from 'crypto';

/**
 * 验证码信息接口
 */
interface CaptchaInfo {
  text: string; // 验证码文本
  expiresAt: number; // 过期时间戳（毫秒）
}

/**
 * 图片验证码服务
 * 用于生成和验证登录时的图片验证码
 */
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly CAPTCHA_EXPIRE_TIME = 5 * 60 * 1000; // 验证码有效期：5分钟（毫秒）
  private readonly KEY_PREFIX = 'captcha:img:'; // Redis 键前缀

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * 获取验证码的 Redis 键
   * @param captchaId 验证码ID
   * @returns Redis 键
   */
  private getCaptchaKey(captchaId: string): string {
    return `${this.KEY_PREFIX}${captchaId}`;
  }

  /**
   * 生成图片验证码
   * @returns 验证码ID和SVG图片
   */
  async generateCaptcha(): Promise<{ captchaId: string; svg: string }> {
    try {
      // 生成验证码ID
      const captchaId = randomUUID();

      // 生成验证码（4位数字）
      const captcha = svgCaptcha.create({
        size: 4, // 验证码长度
        ignoreChars: '0o1il', // 忽略容易混淆的字符
        noise: 2, // 干扰线条数量
        color: true, // 彩色
        background: '#f0f0f0', // 背景色
        width: 120, // 宽度
        height: 40, // 高度
        fontSize: 50, // 字体大小
        charPreset: '0123456789', // 只使用数字
      });

      // 存储验证码文本到 Redis
      const expiresAt = Date.now() + this.CAPTCHA_EXPIRE_TIME;
      const captchaInfo: CaptchaInfo = {
        text: captcha.text.toLowerCase(), // 转为小写存储，验证时不区分大小写
        expiresAt,
      };

      await this.cacheManager.set(
        this.getCaptchaKey(captchaId),
        captchaInfo,
        this.CAPTCHA_EXPIRE_TIME,
      );

      this.logger.log(
        `生成图片验证码成功: captchaId=${captchaId}, 有效期 ${this.CAPTCHA_EXPIRE_TIME / 1000} 秒`,
      );

      return {
        captchaId,
        svg: captcha.data,
      };
    } catch (error) {
      this.logger.error('生成图片验证码失败:', error);
      throw error;
    }
  }

  /**
   * 验证验证码
   * @param captchaId 验证码ID
   * @param captchaText 用户输入的验证码
   * @returns 是否验证通过
   */
  async verifyCaptcha(
    captchaId: string,
    captchaText: string,
  ): Promise<boolean> {
    const key = this.getCaptchaKey(captchaId);

    try {
      const captchaInfo = await this.cacheManager.get<CaptchaInfo>(key);

      if (!captchaInfo) {
        this.logger.warn(`验证码不存在或已过期: captchaId=${captchaId}`);
        return false;
      }

      const now = Date.now();
      if (captchaInfo.expiresAt <= now) {
        this.logger.warn(`验证码已过期: captchaId=${captchaId}`);
        // 删除过期的验证码
        await this.cacheManager.del(key);
        return false;
      }

      // 验证时不区分大小写
      if (captchaInfo.text !== captchaText.toLowerCase().trim()) {
        this.logger.warn(
          `验证码验证失败: captchaId=${captchaId}, 期望 ${captchaInfo.text}, 实际 ${captchaText}`,
        );
        return false;
      }

      // 验证成功后删除验证码（一次性使用）
      await this.cacheManager.del(key);
      this.logger.log(`验证码验证成功: captchaId=${captchaId}`);

      return true;
    } catch (error) {
      this.logger.error(`验证验证码失败 [${captchaId}]:`, error);
      return false;
    }
  }
}

