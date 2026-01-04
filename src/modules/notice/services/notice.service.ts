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
   * @returns 发送结果统计
   */
  async triggerEvent(
    msgSource: string,
    msgType: string,
    eventData: Record<string, any>,
    testNoticeAddress?: string,
  ): Promise<{ success: number; total: number; hasError: boolean }> {
    this.logger.log(`触发通知事件: ${msgSource} - ${msgType}`);

    // 1. 查找匹配的规则（只查找已启用的规则）
    const rules = await this.findRulesByMsgSourceAndType(msgSource, msgType);

    if (rules.length === 0) {
      this.logger.warn(`未找到匹配的规则: ${msgSource} - ${msgType}`);
      return { success: 0, total: 0, hasError: true };
    }

    this.logger.log(`找到 ${rules.length} 条匹配的规则`);

    // 2. 创建通知信息主记录
    let infoId: bigint;
    try {
      infoId = await this.createNotificationInfo(
        msgSource,
        msgType,
        '', // 先创建记录，后续更新内容
        3, // noticeMode: 邮箱
        new Date(),
      );
      this.logger.log(`创建通知信息记录成功: infoId=${infoId}`);
    } catch (error) {
      this.logger.error('创建通知信息记录失败:', error);
      throw error; // 如果创建失败，抛出异常
    }

    let totalCount = 0;
    let successCount = 0;
    let firstContent = '';

    // 3. 遍历每个规则
    for (const rule of rules) {
      try {
        // 4. 执行处理脚本
        const { subject, content } =
          await this.scriptExecutor.executeHandlerScript(
            rule.handlerScript,
            eventData,
          );

        // 5. 保存第一个规则的内容作为通知内容
        if (totalCount === 0) {
          firstContent = content;
          await this.updateNotificationContent(infoId, content);
        }

        // 6. 发送邮件（每个邮箱地址单独发送）
        // 如果提供了测试通知地址，则使用测试地址；否则使用规则中的地址
        const noticeAddressToUse = testNoticeAddress || rule.noticeAddress;
        
        // 检查通知地址是否为空
        if (!noticeAddressToUse || noticeAddressToUse.trim().length === 0) {
          this.logger.warn(
            `规则 ${rule.ruleName} (ID: ${rule.ruleId}) 的通知地址为空，跳过发送`,
          );
          continue; // 跳过该规则
        }

        const emailAddresses = noticeAddressToUse
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        // 检查解析后的邮箱地址列表是否为空
        if (emailAddresses.length === 0) {
          this.logger.warn(
            `规则 ${rule.ruleName} (ID: ${rule.ruleId}) 解析后的邮箱地址列表为空，跳过发送`,
          );
          continue; // 跳过该规则
        }

        for (const emailAddress of emailAddresses) {
          totalCount++;
          try {
            const result = await this.emailService.sendEmail(
              emailAddress,
              subject,
              content,
            );

            // 7. 记录发送结果（确保记录创建成功）
            try {
              await this.logNotificationResult(
                infoId,
                rule.ruleId,
                3, // noticeMode: 邮箱
                emailAddress,
                result.success ? 'success' : 'failed',
                result.success ? undefined : result.message, // 失败时保存失败原因
              );
            } catch (logError) {
              this.logger.error(
                `记录通知结果失败 [${emailAddress}]:`,
                logError,
              );
              // 即使记录失败，也继续处理
            }

            if (result.success) {
              successCount++;
            }
          } catch (error) {
            // 记录失败结果（确保记录创建成功）
            const errorMessage =
              error instanceof Error ? error.message : '未知错误';
            try {
              await this.logNotificationResult(
                infoId,
                rule.ruleId,
                3,
                emailAddress,
                'failed',
                errorMessage, // 保存异常信息作为说明
              );
            } catch (logError) {
              this.logger.error(
                `记录失败结果失败 [${emailAddress}]:`,
                logError,
              );
            }
            this.logger.error(`邮件发送失败 [${emailAddress}]:`, error);
          }
        }
      } catch (error) {
        this.logger.error(`规则处理失败 [${rule.ruleName}]:`, error);
      }
    }

    // 8. 更新统计信息
    await this.updateNotificationStats(infoId, successCount, totalCount);

    // 如果所有规则都被跳过（totalCount 为 0 但找到了规则），视为配置错误
    const hasError = successCount === 0 && (totalCount > 0 || rules.length > 0);

    this.logger.log(
      `通知事件处理完成: ${msgSource} - ${msgType}, 成功: ${successCount}/${totalCount}`,
    );

    if (hasError) {
      this.logger.error(
        `通知事件处理失败: ${msgSource} - ${msgType}, 所有通知发送失败`,
      );
    } else if (successCount < totalCount) {
      this.logger.warn(
        `通知事件部分失败: ${msgSource} - ${msgType}, 成功: ${successCount}/${totalCount}`,
      );
    }

    return {
      success: successCount,
      total: totalCount,
      hasError,
    };
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
