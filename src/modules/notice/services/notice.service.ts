import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { EmailService } from './email.service';
import { ScriptExecutorService } from './script-executor.service';

/**
 * 通知服务
 * 核心业务逻辑：事件触发、规则匹配、内容处理、通知发送、日志记录
 */
@Injectable()
export class NoticeService {
  private readonly logger = new Logger(NoticeService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private scriptExecutor: ScriptExecutorService,
  ) {}

  /**
   * 触发事件通知
   * @param msgSource 消息来源
   * @param msgType 消息类型
   * @param eventData 事件数据
   * @param testNoticeAddress 测试通知地址（可选，如果提供则使用此地址替代规则中的通知地址）
   * @returns 发送结果（包含消息、成功数量、总数量）
   */
  async triggerEvent(
    msgSource: string,
    msgType: string,
    eventData: Record<string, any>,
    testNoticeAddress?: string,
  ): Promise<{ message: string; success: number; total: number }> {
    this.logger.log(`触发通知事件: ${msgSource} - ${msgType}`);

    // 1. 查找匹配的规则
    const rules = await this.findRulesByMsgSourceAndType(msgSource, msgType);
    if (rules.length === 0) {
      this.logger.warn(`未找到匹配的规则: ${msgSource} - ${msgType}`);
      return { message: '未找到匹配的规则', success: 0, total: 0 };
    }

    this.logger.log(`找到 ${rules.length} 条匹配的规则`);

    // 2. 创建通知信息记录（如果需要）
    const infoId = await this.createNotificationInfoIfNeeded(
      rules,
      msgSource,
      msgType,
    );

    // 3. 处理所有规则并发送通知
    const { success, total } = await this.processRules(
      rules,
      eventData,
      testNoticeAddress,
      infoId,
    );

    // 4. 更新统计信息（如果需要）
    if (infoId !== null) {
      await this.updateNotificationStats(infoId, success, total);
    }

    this.logger.log(
      `通知事件处理完成: ${msgSource} - ${msgType}, 成功: ${success}/${total}`,
    );

    // 5. 构建并返回响应消息
    return {
      message: this.buildResponseMessage(success, total, rules.length),
      success,
      total,
    };
  }

  /**
   * 如果需要，创建通知信息记录
   */
  private async createNotificationInfoIfNeeded(
    rules: any[],
    msgSource: string,
    msgType: string,
  ): Promise<bigint | null> {
    const hasRecordEnabled = rules.some((rule) => rule.enableRecord === true);
    if (!hasRecordEnabled) {
      this.logger.log('所有规则均未开启记录功能，跳过创建通知信息记录');
      return null;
    }

    try {
      const infoId = await this.createNotificationInfo(
        msgSource,
        msgType,
        '',
        3, // noticeMode: 邮箱
        new Date(),
      );
      this.logger.log(`创建通知信息记录成功: infoId=${infoId}`);
      return infoId;
    } catch (error) {
      this.logger.error('创建通知信息记录失败:', error);
      throw error;
    }
  }

  /**
   * 处理所有规则并发送通知
   */
  private async processRules(
    rules: any[],
    eventData: Record<string, any>,
    testNoticeAddress: string | undefined,
    infoId: bigint | null,
  ): Promise<{ success: number; total: number }> {
    let totalCount = 0;
    let successCount = 0;
    let isFirstRule = true;

    for (const rule of rules) {
      try {
        const result = await this.processRule(
          rule,
          eventData,
          testNoticeAddress,
          infoId,
          isFirstRule && infoId !== null,
        );

        totalCount += result.total;
        successCount += result.success;

        // 更新通知内容（仅第一个成功处理的规则）
        if (isFirstRule && infoId !== null && result.content) {
          await this.updateNotificationContent(infoId, result.content);
          isFirstRule = false;
        }
      } catch (error) {
        this.logger.error(`规则处理失败 [${rule.ruleName}]:`, error);
        // 如果第一个规则失败，继续尝试下一个规则作为第一个规则
      }
    }

    return { success: successCount, total: totalCount };
  }

  /**
   * 处理单个规则
   */
  private async processRule(
    rule: any,
    eventData: Record<string, any>,
    testNoticeAddress: string | undefined,
    infoId: bigint | null,
    shouldSaveContent: boolean,
  ): Promise<{ success: number; total: number; content?: string }> {
    // 执行处理脚本
    const { subject, content } = await this.scriptExecutor.executeHandlerScript(
      rule.handlerScript,
      eventData,
    );

    // 获取通知地址
    const noticeAddress = testNoticeAddress || rule.noticeAddress;
    const emailAddresses = this.parseEmailAddresses(noticeAddress);

    if (emailAddresses.length === 0) {
      this.logger.warn(
        `规则 ${rule.ruleName} (ID: ${rule.ruleId}) 的通知地址为空，跳过发送`,
      );
      return {
        success: 0,
        total: 0,
        content: shouldSaveContent ? content : undefined,
      };
    }

    // 发送邮件到所有地址
    const { success, total } = await this.sendEmailToAddresses(
      emailAddresses,
      subject,
      content,
      rule,
      infoId,
    );

    return { success, total, content: shouldSaveContent ? content : undefined };
  }

  /**
   * 解析邮箱地址列表
   */
  private parseEmailAddresses(
    noticeAddress: string | null | undefined,
  ): string[] {
    if (!noticeAddress || noticeAddress.trim().length === 0) {
      return [];
    }
    return noticeAddress
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /**
   * 发送邮件到多个地址
   */
  private async sendEmailToAddresses(
    emailAddresses: string[],
    subject: string,
    content: string,
    rule: any,
    infoId: bigint | null,
  ): Promise<{ success: number; total: number }> {
    let successCount = 0;
    const totalCount = emailAddresses.length;

    for (const emailAddress of emailAddresses) {
      const success = await this.sendEmailAndLog(
        emailAddress,
        subject,
        content,
        rule,
        infoId,
      );
      if (success) {
        successCount++;
      }
    }

    return { success: successCount, total: totalCount };
  }

  /**
   * 发送邮件并记录结果
   */
  private async sendEmailAndLog(
    emailAddress: string,
    subject: string,
    content: string,
    rule: any,
    infoId: bigint | null,
  ): Promise<boolean> {
    try {
      const result = await this.emailService.sendEmail(
        emailAddress,
        subject,
        content,
      );

      // 记录发送结果（如果需要）
      if (rule.enableRecord === true && infoId !== null) {
        await this.logNotificationResultSafe(
          infoId,
          rule.ruleId,
          emailAddress,
          result.success ? 'success' : 'failed',
          result.success ? undefined : result.message,
        );
      }

      return result.success;
    } catch (error) {
      this.logger.error(`邮件发送失败 [${emailAddress}]:`, error);

      // 记录失败结果（如果需要）
      if (rule.enableRecord === true && infoId !== null) {
        const errorMessage =
          error instanceof Error ? error.message : '未知错误';
        await this.logNotificationResultSafe(
          infoId,
          rule.ruleId,
          emailAddress,
          'failed',
          errorMessage,
        );
      }

      return false;
    }
  }

  /**
   * 安全地记录通知结果（不抛出异常）
   */
  private async logNotificationResultSafe(
    infoId: bigint,
    ruleId: bigint,
    emailAddress: string,
    noticeResult: string,
    description?: string,
  ): Promise<void> {
    try {
      await this.logNotificationResult(
        infoId,
        ruleId,
        3, // noticeMode: 邮箱
        emailAddress,
        noticeResult,
        description,
      );
    } catch (error) {
      this.logger.error(`记录通知结果失败 [${emailAddress}]:`, error);
    }
  }

  /**
   * 构建响应消息
   */
  private buildResponseMessage(
    success: number,
    total: number,
    rulesCount: number,
  ): string {
    if (total === 0 && rulesCount > 0) {
      this.logger.warn('所有匹配规则的通知地址为空，无法发送通知');
      return '所有匹配规则的通知地址为空，无法发送通知';
    }

    if (success === 0 && total > 0) {
      this.logger.error(`通知事件处理失败，所有通知发送失败`);
      return `通知发送失败: 成功 ${success}/${total}`;
    }

    if (success < total) {
      this.logger.warn(`通知事件部分失败: 成功 ${success}/${total}`);
      return `部分通知发送失败: 成功 ${success}/${total}`;
    }

    return `通知发送成功: 成功 ${success}/${total}`;
  }

  /**
   * 根据消息来源和类型查找规则
   * @param msgSource 消息来源
   * @param msgType 消息类型
   * @returns 匹配的规则列表
   */
  async findRulesByMsgSourceAndType(
    msgSource: string,
    msgType: string,
  ): Promise<any[]> {
    return this.prisma.notificationRule.findMany({
      where: {
        msgSource,
        msgType,
        noticeStatus: 1, // 只查找已启用的规则
      },
      orderBy: {
        createTime: 'asc',
      },
    });
  }

  /**
   * 创建通知信息主记录
   * @param msgSource 消息来源
   * @param msgType 消息类型
   * @param noticeContent 通知内容
   * @param noticeMode 通知方式
   * @param noticeTime 通知时间
   * @returns 信息ID
   */
  async createNotificationInfo(
    msgSource: string,
    msgType: string,
    noticeContent: string,
    noticeMode: number,
    noticeTime: Date,
  ): Promise<bigint> {
    try {
      const info = await this.prisma.notificationInfo.create({
        data: {
          msgSource,
          msgType,
          noticeContent,
          noticeMode,
          noticeTime,
          noticeSuccess: 0,
          noticeTotal: 0,
        },
      });
      this.logger.debug(
        `创建通知信息记录成功: infoId=${info.infoId}, msgSource=${msgSource}, msgType=${msgType}`,
      );
      return info.infoId;
    } catch (error) {
      this.logger.error(
        `创建通知信息记录失败: msgSource=${msgSource}, msgType=${msgType}`,
        error,
      );
      throw error; // 抛出异常，因为这是关键步骤
    }
  }

  /**
   * 更新通知内容
   * @param infoId 信息ID
   * @param noticeContent 通知内容
   */
  async updateNotificationContent(
    infoId: bigint,
    noticeContent: string,
  ): Promise<void> {
    await this.prisma.notificationInfo.update({
      where: { infoId },
      data: { noticeContent },
    });
  }

  /**
   * 记录通知发送结果
   * @param infoId 信息ID
   * @param ruleId 规则ID
   * @param noticeMode 通知方式
   * @param noticeAddress 通知地址
   * @param noticeResult 通知结果
   * @param description 说明（失败原因等）
   */
  async logNotificationResult(
    infoId: bigint,
    ruleId: bigint | null,
    noticeMode: number,
    noticeAddress: string,
    noticeResult: string,
    description?: string,
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          infoId,
          ruleId,
          noticeMode,
          noticeAddress,
          noticeResult,
          noticeResultTime: new Date(),
          description,
        },
      });
      this.logger.debug(
        `记录通知结果成功: infoId=${infoId}, ruleId=${ruleId}, address=${noticeAddress}, result=${noticeResult}`,
      );
    } catch (error) {
      this.logger.error(
        `记录通知结果失败: infoId=${infoId}, ruleId=${ruleId}, address=${noticeAddress}, result=${noticeResult}`,
        error,
      );
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 更新通知统计信息
   * @param infoId 信息ID
   * @param noticeSuccess 成功数量
   * @param noticeTotal 总数量
   */
  async updateNotificationStats(
    infoId: bigint,
    noticeSuccess: number,
    noticeTotal: number,
  ): Promise<void> {
    try {
      await this.prisma.notificationInfo.update({
        where: { infoId },
        data: {
          noticeSuccess,
          noticeTotal,
        },
      });
      this.logger.debug(
        `更新通知统计信息成功: infoId=${infoId}, success=${noticeSuccess}, total=${noticeTotal}`,
      );
    } catch (error) {
      this.logger.error(
        `更新通知统计信息失败: infoId=${infoId}, success=${noticeSuccess}, total=${noticeTotal}`,
        error,
      );
      // 不抛出异常，避免影响主流程
    }
  }
}
