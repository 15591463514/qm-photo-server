import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { getRedisKey, THROTTLE_KEY } from '../constants/redis-key.constants';

/**
 * 自定义限流守卫
 * 基于 IP + 路径进行限流，防止同一接口连续调用
 *
 * 特点：
 * - 每个接口的限流是独立的（基于 IP + 路径）
 * - 防止快速连续点击同一接口
 * - 不同接口之间不会相互影响
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * 生成限流追踪键（IP + 路径）
   * 这样同一个 IP 对不同接口的限流是独立的
   *
   * @param req 请求对象
   * @returns 限流键（格式：IP:路径）
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as Request;
    const ip = this.getIpAddress(request);
    // 使用路由路径或请求路径
    const path =
      request.route?.path || request.path || request.url?.split('?')[0] || '';
    return `${ip}:${path}`;
  }

  /**
   * 生成限流键（IP + 路径）
   *
   * @param context 执行上下文
   * @param suffix 后缀
   * @returns 限流键（格式：throttler:IP:路径:后缀，如：throttler:127.0.0.1:/api/v1/user/list:1000）
   */
  protected generateKey(context: ExecutionContext, suffix: string): string {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.userId;

    // 组合成唯一key: "throttler:ip:请求路径:规则名"
    return getRedisKey(THROTTLE_KEY, `${userId}_${suffix}`);
  }

  /**
   * 获取客户端 IP 地址
   * 优先使用 req.ip（如果应用配置了 trust proxy，会自动从 X-Forwarded-For 解析）
   * 否则从请求头或连接中获取
   */
  private getIpAddress(request: Request): string {
    // 直接使用 req.ip（如果配置了 trust proxy，会自动处理）
    if (request.ip) {
      return request.ip;
    }
    // 如果没有配置 trust proxy，从请求头获取
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    // 从 X-Real-IP 获取
    if (request.headers['x-real-ip']) {
      return request.headers['x-real-ip'] as string;
    }
    // 最后从连接中获取
    return (request as any).connection?.remoteAddress || 'unknown';
  }
}
