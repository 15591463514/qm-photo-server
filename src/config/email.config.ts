import { registerAs } from '@nestjs/config';

const emailConfig = registerAs('email', () => {
  // 支持 GitHub Actions 命名（SMTP_SERVER）和原命名（SMTP_HOST）
  const host = process.env.SMTP_SERVER || process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10)
    : undefined;
  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_PORT === '465' ||
    false;
  // 支持 GitHub Actions 命名（SMTP_USERNAME）和原命名（SMTP_USER）
  const user = process.env.SMTP_USERNAME || process.env.SMTP_USER || '';
  // 支持 GitHub Actions 命名（SMTP_PASSWORD）和原命名（SMTP_PASS）
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';
  const service = process.env.SMTP_SERVICE; // 支持 service 方式（如：QQ、Gmail）

  // 构建 transporter 配置
  const transporterConfig: any = {
    auth: {
      user,
      pass,
    },
  };

  // 如果指定了 service，使用 service 方式（nodemailer 会自动配置 host 和 port）
  if (service) {
    transporterConfig.service = service;
  } else {
    // 否则使用 host 和 port 方式
    transporterConfig.host = host || 'smtp.example.com';
    if (port) {
      transporterConfig.port = port;
    }
    transporterConfig.secure = secure;
  }

  return {
    ...transporterConfig,
    host: host || 'smtp.example.com',
    port: port,
    secure: secure,
    auth: {
      user,
      pass,
    },
    service: service,
    from: process.env.SMTP_FROM || user || 'noreply@example.com',
    fromName: process.env.SMTP_FROM_NAME || '系统通知',
  };
});

export type EmailConfig = ReturnType<typeof emailConfig>;
export default emailConfig;
