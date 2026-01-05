import { Module } from '@nestjs/common';
import { NoticeController } from './notice.controller';
import { NoticeRuleService } from './notice-rule.service';
import { NoticeInfoService } from './notice-info.service';
import { NoticeService } from './services/notice.service';
import { EmailService } from './services/email.service';
import { ScriptExecutorService } from './services/script-executor.service';

/**
 * 通知模块
 */
@Module({
  controllers: [NoticeController],
  providers: [
    NoticeRuleService,
    NoticeInfoService,
    NoticeService,
    EmailService,
    ScriptExecutorService,
  ],
  exports: [NoticeService], // 导出 NoticeService，供其他模块使用
})
export class NoticeModule {}
