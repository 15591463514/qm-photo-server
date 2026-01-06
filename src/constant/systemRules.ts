/**
 * 用户系统的规则配置
 * @description 结合notice模块的规则配置，请先在系统上配置上规则脚本
 * @description 这里只是存储一份规则配置，用于系统通知的触发
 */
export const SYSTEM_RULE_MAP = {
  /** 系统邮件验证码 - 用户注册 */
  SYSTEM_EMAIL_CODE: {
    ruleName: '系统邮件验证码',
    msgSource: 'system_email_code',
    msgType: 'info',
  },
};
