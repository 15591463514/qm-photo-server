import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OSS from 'ali-oss';
import { OssConfig } from '@/config/oss.config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

/**
 * 文件上传接口
 */
export interface UploadFile {
  /** 文件原始名称 */
  originalname: string;
  /** 文件MIME类型 */
  mimetype: string;
  /** 文件大小（字节） */
  size: number;
  /** 文件Buffer */
  buffer: Buffer;
}

/**
 * OSS上传服务
 * 支持图片、音频、视频等文件上传
 */
@Injectable()
export class OssService {
  private readonly logger = new Logger(OssService.name);
  private client: OSS;
  private config: OssConfig;

  constructor(private configService: ConfigService) {
    this.config = this.configService.get<OssConfig>('oss');

    // 验证必要的配置
    if (
      !this.config.accessKeyId ||
      !this.config.accessKeySecret ||
      !this.config.bucket
    ) {
      this.logger.warn(
        'OSS配置不完整，请检查环境变量：OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET',
      );
    }

    // 初始化OSS客户端
    const clientConfig: OSS.Options = {
      region: this.config.region,
      accessKeyId: this.config.accessKeyId,
      accessKeySecret: this.config.accessKeySecret,
      bucket: this.config.bucket,
      secure: this.config.secure,
    };

    // 如果配置了自定义Endpoint，使用自定义Endpoint
    if (this.config.endpoint) {
      clientConfig.endpoint = this.config.endpoint;
    }

    // 如果使用内网Endpoint
    if (this.config.internal) {
      clientConfig.internal = true;
    }

    this.client = new OSS(clientConfig);
  }

  /**
   * 生成文件路径
   * @param prefix 路径前缀（如：images/, audio/, video/）
   * @param originalName 原始文件名
   * @returns 完整的文件路径（包含basePrefix）
   */
  private generateFilePath(prefix: string, originalName: string): string {
    // 获取文件扩展名
    const ext = path.extname(originalName).toLowerCase();
    // 生成唯一文件名：时间戳 + UUID + 扩展名
    const timestamp = Date.now();
    const uuid = uuidv4().replace(/-/g, '');
    const fileName = `${timestamp}_${uuid}${ext}`;
    // 按日期分目录存储：basePrefix + prefix/YYYY/MM/DD/filename
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    // 确保prefix以/结尾
    const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
    // 组合完整路径：basePrefix + prefix + 日期目录 + 文件名
    return `${this.config.basePrefix}${normalizedPrefix}${year}/${month}/${day}/${fileName}`;
  }

  /**
   * 获取文件访问URL
   * @param filePath 文件路径
   * @returns 文件访问URL
   */
  private getFileUrl(filePath: string): string {
    // 如果配置了CDN域名，使用CDN域名
    if (this.config.cdnDomain) {
      return `${this.config.cdnDomain}/${filePath}`;
    }

    // 否则使用OSS默认域名
    const protocol = this.config.secure ? 'https' : 'http';
    const endpoint =
      this.config.endpoint || `${this.config.region}.aliyuncs.com`;
    return `${protocol}://${this.config.bucket}.${endpoint}/${filePath}`;
  }

  /**
   * 上传图片
   * @param file 文件对象
   * @param options 上传选项
   * @returns 上传结果，包含文件路径和访问URL
   */
  async uploadImage(
    file: UploadFile,
    options?: {
      /** 自定义路径前缀，覆盖默认的 imagePrefix */
      prefix?: string;
      /** 是否生成缩略图（后续扩展） */
      generateThumbnail?: boolean;
    },
  ): Promise<{
    /** 文件在OSS中的路径 */
    path: string;
    /** 文件访问URL */
    url: string;
    /** 原始文件名 */
    originalName: string;
    /** 文件大小（字节） */
    size: number;
    /** 文件MIME类型 */
    mimeType: string;
  }> {
    // 验证文件类型
    const allowedImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml',
    ];

    if (!allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的图片格式，支持的格式：${allowedImageTypes.join(', ')}`,
      );
    }

    // 验证文件大小（默认最大10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `图片大小不能超过 ${maxSize / 1024 / 1024}MB`,
      );
    }

    try {
      // 生成文件路径
      const prefix = options?.prefix || this.config.imagePrefix;
      const filePath = this.generateFilePath(prefix, file.originalname);

      // 上传到OSS
      const result = await this.client.put(filePath, file.buffer, {
        mime: file.mimetype,
        // 设置文件元数据（UserMeta需要uid和pid字段）
        meta: {
          originalName: file.originalname,
          uploadTime: new Date().toISOString(),
          uid: 0,
          pid: 0,
        } satisfies OSS.UserMeta,
      });

      // 获取文件访问URL
      const url = this.getFileUrl(result.name);

      this.logger.log(`图片上传成功: ${filePath} -> ${url}`);

      return {
        path: result.name,
        url,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      const { message, stack } = error as Error;
      this.logger.error(`图片上传失败: ${message}`, stack);
      throw new BadRequestException(`图片上传失败: ${message}`);
    }
  }

  /**
   * 上传音频（后续实现）
   * @param file 文件对象
   * @param options 上传选项
   */
  async uploadAudio(
    file: UploadFile,
    options?: {
      prefix?: string;
    },
  ): Promise<{
    path: string;
    url: string;
    originalName: string;
    size: number;
    mimeType: string;
  }> {
    // TODO: 实现音频上传逻辑
    throw new BadRequestException('音频上传功能暂未实现');
  }

  /**
   * 上传视频（后续实现）
   * @param file 文件对象
   * @param options 上传选项
   */
  async uploadVideo(
    file: UploadFile,
    options?: {
      prefix?: string;
    },
  ): Promise<{
    path: string;
    url: string;
    originalName: string;
    size: number;
    mimeType: string;
  }> {
    // TODO: 实现视频上传逻辑
    throw new BadRequestException('视频上传功能暂未实现');
  }

  /**
   * 删除文件
   * @param filePath 文件路径
   * @returns 删除结果
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await this.client.delete(filePath);
      this.logger.log(`文件删除成功: ${filePath}`);
      return true;
    } catch (error) {
      const { message, stack } = error as Error;
      this.logger.error(`文件删除失败: ${filePath} - ${message}`, stack);
      return false;
    }
  }

  /**
   * 批量删除文件
   * @param filePaths 文件路径数组
   * @returns 删除结果
   */
  async deleteFiles(filePaths: string[]): Promise<{
    success: string[];
    failed: string[];
  }> {
    if (!filePaths || filePaths.length === 0) {
      return { success: [], failed: [] };
    }

    const success: string[] = [];
    const failed: string[] = [];

    try {
      // 使用OSS的批量删除接口
      const result = await this.client.deleteMulti(filePaths, {
        quiet: true,
      });

      // 处理删除结果
      // OSS的deleteMulti返回格式：{ deleted?: string[], res: NormalSuccessResponse }
      const deletedPaths = result.deleted || [];

      filePaths.forEach((filePath) => {
        if (deletedPaths.includes(filePath)) {
          success.push(filePath);
        } else {
          // 如果没有在deleted中，认为删除失败
          failed.push(filePath);
        }
      });

      this.logger.log(
        `批量删除完成: 成功 ${success.length} 个，失败 ${failed.length} 个`,
      );
    } catch (error) {
      const { message, stack } = error as Error;
      this.logger.error(`批量删除失败: ${message}`, stack);
      // 如果批量删除失败，尝试逐个删除
      for (const filePath of filePaths) {
        const deleted = await this.deleteFile(filePath);
        if (deleted) {
          success.push(filePath);
        } else {
          failed.push(filePath);
        }
      }
    }

    return { success, failed };
  }

  /**
   * 检查文件是否存在
   * @param filePath 文件路径
   * @returns 是否存在
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await this.client.head(filePath);
      return true;
    } catch (error) {
      const { status } = error as { status: number };
      if (status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取文件的签名URL（用于临时访问）
   * @param filePath 文件路径
   * @param expires 过期时间（秒），默认使用配置的过期时间
   * @returns 签名URL
   */
  async getSignedUrl(filePath: string, expires?: number): Promise<string> {
    const expireTime = expires || this.config.expires || 3600; // 默认1小时
    try {
      const url = this.client.signatureUrl(filePath, {
        expires: expireTime,
      });
      return url;
    } catch (error) {
      const { message, stack } = error as Error;
      this.logger.error(`生成签名URL失败: ${filePath} - ${message}`, stack);
      throw new BadRequestException(`生成签名URL失败: ${message}`);
    }
  }
}
