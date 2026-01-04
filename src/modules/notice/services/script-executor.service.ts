import { Injectable, Logger } from '@nestjs/common';
import { VM } from 'vm2';

/**
 * 处理脚本执行服务
 * 使用 vm2 在安全的沙箱环境中执行 JavaScript 代码
 */
@Injectable()
export class ScriptExecutorService {
  private readonly logger = new Logger(ScriptExecutorService.name);

  /**
   * 执行处理脚本
   * @param handlerScript 处理脚本（JavaScript 代码）
   * @param eventData 事件数据（JSON 对象）
   * @returns 包含 subject 和 content 的对象
   */
  async executeHandlerScript(
    handlerScript: string | null | undefined,
    eventData: Record<string, any>,
  ): Promise<{ subject: string; content: string }> {
    // 如果没有处理脚本，使用默认格式
    if (!handlerScript || handlerScript.trim() === '') {
      return this.getDefaultFormat(eventData);
    }

    try {
      // 创建安全的 VM 环境
      const vm = new VM({
        timeout: 5000, // 5秒超时
        sandbox: {
          // 可以在这里添加一些安全的全局对象
          console: {
            log: (message?: any, ...optionalParams: any[]) => {
              this.logger.debug(message, ...optionalParams);
            },
          },
        },
      });

      // 构建完整的脚本代码
      // 脚本需要定义一个 formatContent 函数，并返回结果
      const script = `
        ${handlerScript}
        
        // 执行 formatContent 函数
        if (typeof formatContent === 'function') {
          formatContent(${JSON.stringify(eventData)});
        } else {
          throw new Error('处理脚本必须定义一个 formatContent 函数');
        }
      `;

      // 在沙箱中执行脚本
      const result = vm.run(script);

      // 验证返回格式
      if (
        result &&
        typeof result === 'object' &&
        typeof result.subject === 'string' &&
        typeof result.content === 'string'
      ) {
        return {
          subject: result.subject,
          content: result.content,
        };
      } else {
        throw new Error(
          '处理脚本返回格式不正确，必须返回包含 subject 和 content 的对象',
        );
      }
    } catch (error) {
      this.logger.error('处理脚本执行失败，使用默认格式', error);
      // 如果脚本执行失败，使用默认格式
      return this.getDefaultFormat(eventData);
    }
  }

  /**
   * 获取默认格式的通知内容
   * @param eventData 事件数据
   * @returns 默认格式的通知内容
   */
  private getDefaultFormat(eventData: Record<string, any>): {
    subject: string;
    content: string;
  } {
    return {
      subject: '系统通知',
      content: `<h2>系统通知</h2><pre>${JSON.stringify(eventData, null, 2)}</pre>`,
    };
  }
}
