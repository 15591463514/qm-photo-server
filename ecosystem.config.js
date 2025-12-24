/**
 * PM2 进程管理配置文件
 * 用于生产环境管理 NestJS 应用
 */

module.exports = {
  apps: [
    {
      name: 'qm-photo-server',
      script: 'dist/main.js',
      instances: 1, // 单实例运行（如需集群可设置为 'max' 或具体数字）
      exec_mode: 'fork', // fork 模式（单实例）或 cluster 模式（集群）
      watch: false, // 生产环境关闭文件监听
      max_memory_restart: '500M', // 内存超过 500M 自动重启
      env: {
        NODE_ENV: 'production',
      },
      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true, // 日志添加时间戳
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true, // 合并日志
      // 自动重启配置
      autorestart: true,
      max_restarts: 10, // 最大重启次数
      min_uptime: '10s', // 最小运行时间
      restart_delay: 4000, // 重启延迟（毫秒）
      // 进程管理
      kill_timeout: 5000, // 优雅关闭超时时间
      listen_timeout: 10000, // 监听超时时间
      // 健康检查（需要应用支持）
      // wait_ready: true,
      // listen_timeout: 10000,
    },
    // Webhook 服务器
    {
      name: 'webhook-server',
      script: 'scripts/webhook-server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        WEBHOOK_LOG_FILE: '/app/logs/webhook-deploy.log',
      },
      error_file: './logs/webhook-error.log',
      out_file: './logs/webhook-out.log',
      log_file: './logs/webhook-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
    },
  ],
};
