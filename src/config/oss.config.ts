import { registerAs } from '@nestjs/config';

const ossConfig = registerAs('oss', () => {
  // 基础前缀路径
  const basePrefix = process.env.OSS_PREFIX;
  // 确保前缀以 / 结尾
  const normalizedBasePrefix = basePrefix?.endsWith('/')
    ? basePrefix
    : `${basePrefix}/`;

  return {
    // 阿里云OSS配置
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
    bucket: process.env.OSS_BUCKET || '',
    // 是否使用内网Endpoint（如果服务器在阿里云内网，可以设置为true以节省流量费用）
    internal: process.env.OSS_INTERNAL === 'true' || false,
    // 是否使用HTTPS
    secure: process.env.OSS_SECURE !== 'false', // 默认使用HTTPS
    // 自定义Endpoint（可选，如果不设置则使用默认的）
    endpoint: process.env.OSS_ENDPOINT,
    // 基础前缀路径（用于区分环境）
    basePrefix: normalizedBasePrefix,
    // 文件上传配置
    // 图片存储路径前缀（会自动加上basePrefix）
    imagePrefix: process.env.OSS_IMAGE_PREFIX || 'images/',
    // 音频存储路径前缀（后续使用，会自动加上basePrefix）
    audioPrefix: process.env.OSS_AUDIO_PREFIX || 'audio/',
    // 视频存储路径前缀（后续使用，会自动加上basePrefix）
    videoPrefix: process.env.OSS_VIDEO_PREFIX || 'video/',
    // 是否启用CDN加速域名（如果配置了CDN，返回CDN域名）
    cdnDomain: process.env.OSS_CDN_DOMAIN || '',
    // 文件访问过期时间（秒，用于生成签名URL，0表示永久有效）
    expires: parseInt(process.env.OSS_EXPIRES || '0', 10),
  };
});

export type OssConfig = ReturnType<typeof ossConfig>;
export default ossConfig;
