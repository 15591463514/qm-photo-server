import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailConfig } from '@/config/email.config';
import type { Transporter } from 'nodemailer';

/**
 * 邮件发送服务
 * 设计为可扩展的通知发送服务，后续可以添加短信、公众号、企业微信等
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    const emailConfig = this.configService.get<EmailConfig>('email');

    // 构建 transporter 配置
    const transporterConfig: any = {
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
    };

    // 如果配置了 service（如：QQ、Gmail），使用 service 方式
    if (emailConfig.service) {
      transporterConfig.service = emailConfig.service;
    } else {
      // 否则使用 host 和 port 方式
      transporterConfig.host = emailConfig.host;
      if (emailConfig.port) {
        transporterConfig.port = emailConfig.port;
      }
      transporterConfig.secure = emailConfig.secure;
    }

    this.transporter = nodemailer.createTransport(transporterConfig);
  }

  /**
   * 发送邮件
   * @param to 收件人邮箱地址（单个或多个）
   * @param subject 邮件主题
   * @param content 邮件内容（支持 HTML）
   * @returns 发送结果
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    content: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const emailConfig = this.configService.get<EmailConfig>('email');
      const recipients = Array.isArray(to) ? to : [to];

      // 验证邮箱地址格式
      for (const email of recipients) {
        if (!this.isValidEmail(email)) {
          const errorMsg = `无效的邮箱地址格式: ${email}`;
          this.logger.warn(errorMsg);
          return { success: false, message: errorMsg };
        }
      }

      const mailOptions = {
        from: `"${emailConfig.fromName}" <${emailConfig.from}>`,
        to: recipients.join(','),
        subject,
        html: content,
        // 启用更严格的错误处理
        disableFileAccess: true,
        disableUrlAccess: true,
      };

      const info = await this.transporter.sendMail(mailOptions);

      // 检查响应信息
      // nodemailer 返回的 response 可能包含错误信息
      const response = info.response || '';
      const messageId = info.messageId || '';

      // 检查响应中是否包含错误信息
      if (
        response.toLowerCase().includes('error') ||
        response.toLowerCase().includes('reject') ||
        response.toLowerCase().includes('fail')
      ) {
        const errorMsg = `邮件被服务器拒绝: ${response}`;
        this.logger.warn(
          `邮件发送被拒绝: ${recipients.join(', ')} - ${response}`,
        );
        return { success: false, message: errorMsg };
      }

      // 检查是否有 messageId（没有 messageId 可能表示发送失败）
      if (!messageId) {
        const errorMsg = '邮件发送失败：未收到 MessageId';
        this.logger.warn(
          `邮件发送失败: ${recipients.join(', ')} - 未收到 MessageId`,
        );
        return { success: false, message: errorMsg };
      }

      this.logger.log(
        `邮件已提交到服务器: ${recipients.join(', ')} - MessageId: ${messageId}, Response: ${response}`,
      );

      // 注意：这里返回 success: true 只表示邮件已被 SMTP 服务器接受
      // 实际送达需要等待退信（bounce）邮件，这需要额外的退信处理机制
      return { success: true, message: messageId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const errorCode = (error as any)?.code || '';

      this.logger.error(
        `邮件发送失败: ${Array.isArray(to) ? to.join(', ') : to} - ${errorMessage} (Code: ${errorCode})`,
        error,
      );

      // 检查常见的错误类型
      let finalMessage = errorMessage;
      if (errorCode === 'EDNS' || errorMessage.includes('getaddrinfo')) {
        finalMessage = '无法连接到邮件服务器，请检查网络和配置';
      } else if (
        errorMessage.includes('Invalid login') ||
        errorMessage.includes('authentication')
      ) {
        finalMessage = '邮件服务器认证失败，请检查用户名和密码';
      } else if (
        errorMessage.includes('Invalid recipient') ||
        errorMessage.includes('550')
      ) {
        finalMessage = '收件人地址无效或被拒绝';
      } else if (errorMessage.includes('552') || errorMessage.includes('553')) {
        finalMessage = '邮件被服务器拒绝（可能是地址无效或超出配额）';
      }

      return {
        success: false,
        message: finalMessage,
      };
    }
  }

  /**
   * 验证邮箱地址格式
   * @param email 邮箱地址
   * @returns 是否有效
   */
  private isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // 基本的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return false;
    }

    // 检查长度（RFC 5321 规定邮箱地址最大长度为 320 字符）
    if (email.length > 320) {
      return false;
    }

    // 检查常见的无效格式
    const invalidPatterns = [
      /^\./, // 不能以点开头
      /\.$/, // 不能以点结尾
      /\.\./, // 不能有连续的点
      /@\./, // @ 后面不能直接跟点
      /\.@/, // @ 前面不能直接跟点
      /^@/, // 不能以 @ 开头
      /@$/, // 不能以 @ 结尾
      /@@/, // 不能有多个 @
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(email)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 验证邮件配置
   * @returns 验证结果
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('邮件服务连接验证成功');
      return true;
    } catch (error) {
      this.logger.error('邮件服务连接验证失败', error);
      return false;
    }
  }
}
