#!/usr/bin/env node

const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// 配置
const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || 'your-secret-token';
const DEPLOY_SCRIPT = path.join(__dirname, 'deploy-from-registry.sh');
const PORT = process.env.WEBHOOK_PORT || 3009;
const LOG_FILE = process.env.WEBHOOK_LOG_FILE || '/tmp/webhook-deploy.log';

// 日志函数
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

  // 输出到控制台
  console.log(logMessage.trim());

  // 写入日志文件
  try {
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (error) {
    console.error(`写入日志文件失败: ${error.message}`);
  }
}

// 执行部署脚本
function executeDeploy(tag, image) {
  return new Promise((resolve, reject) => {
    log(`开始执行部署，标签: ${tag}, 镜像: ${image}`);

    const deployProcess = exec(
      `bash ${DEPLOY_SCRIPT} ${tag}`,
      {
        cwd: path.dirname(DEPLOY_SCRIPT),
        env: {
          ...process.env,
          DOCKER_IMAGE_TAG: tag,
        },
        maxBuffer: 10 * 1024 * 1024, // 10MB
      },
      (error, stdout, stderr) => {
        if (error) {
          log(`部署失败: ${error.message}`, 'error');
          log(`错误输出: ${stderr}`, 'error');
          reject(error);
          return;
        }

        log(`部署成功: ${stdout}`);
        if (stderr) {
          log(`警告输出: ${stderr}`, 'warn');
        }
        resolve({ stdout, stderr });
      },
    );

    // 实时输出日志
    deployProcess.stdout?.on('data', (data) => {
      log(`部署输出: ${data.toString().trim()}`);
    });

    deployProcess.stderr?.on('data', (data) => {
      log(`部署错误: ${data.toString().trim()}`, 'error');
    });
  });
}

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 只处理 POST 请求
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  // 只处理 /api/deploy/webhook 路径
  if (req.url !== '/api/deploy/webhook') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  let body = '';

  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      // 验证 Token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        log('缺少 Authorization Header', 'warn');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Missing Token' }));
        return;
      }

      const token = authHeader.substring(7);
      if (token !== WEBHOOK_TOKEN) {
        log(`无效的 Token: ${token.substring(0, 10)}...`, 'warn');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized: Invalid Token' }));
        return;
      }

      // 解析请求体
      const data = JSON.parse(body);
      const { tag, image, status, commit, branch } = data;

      log(
        `收到 Webhook 请求: ${JSON.stringify({ tag, image, status, commit, branch })}`,
      );

      // 如果构建失败，不执行部署
      if (status !== 'success') {
        log(`构建失败，跳过部署: ${image}`, 'warn');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            message: 'Build failed, skip deployment',
            tag,
          }),
        );
        return;
      }

      // 验证必要字段
      if (!tag || !image) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'Missing required fields: tag and image',
          }),
        );
        return;
      }

      // 立即返回响应，避免超时
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          message: 'Deployment triggered',
          tag,
          image,
        }),
      );

      // 异步执行部署（不阻塞响应）
      executeDeploy(tag, image).catch((error) => {
        log(`异步部署失败: ${error.message}`, 'error');
      });
    } catch (error) {
      log(`处理 Webhook 请求失败: ${error.message}`, 'error');
      log(`请求体: ${body}`, 'error');

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: error.message,
        }),
      );
    }
  });

  req.on('error', (error) => {
    log(`请求错误: ${error.message}`, 'error');
  });
});

// 启动服务器
server.listen(PORT, () => {
  log(`Webhook 服务器启动在端口 ${PORT}`);
  log(`Token: ${WEBHOOK_TOKEN.substring(0, 10)}...`);
  log(`部署脚本: ${DEPLOY_SCRIPT}`);
  log(`日志文件: ${LOG_FILE}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  log('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('收到 SIGINT 信号，正在关闭服务器...');
  server.close(() => {
    log('服务器已关闭');
    process.exit(0);
  });
});
