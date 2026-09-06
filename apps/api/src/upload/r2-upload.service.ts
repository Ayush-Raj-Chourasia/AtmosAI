import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

@Injectable()
export class R2UploadService {
  private readonly logger = new Logger(R2UploadService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') || 'disaster-media';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') || '';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      this.logger.warn('R2 credentials not configured. File uploads will fail.');
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });
  }

  /**
   * Upload a file to Cloudflare R2
   * @param file - Multer file object
   * @param folder - Optional folder path (e.g., 'reports', 'incidents')
   * @returns Upload result with URL and metadata
   */
  async uploadFile(
    file: Express.Multer.File,
    folder = 'reports',
  ): Promise<UploadResult> {
    return this.uploadFromBuffer(
      file.buffer,
      file.mimetype,
      folder,
      file.originalname
    );
  }

  /**
   * Upload a buffer to Cloudflare R2
   * @param buffer - File bugger
   * @param mimetype - Mime type
   * @param folder - Optional folder path
   * @param originalname - Optional original filename
   * @returns Upload result
   */
  async uploadFromBuffer(
    buffer: Buffer,
    mimetype: string,
    folder = 'misc',
    originalname?: string
  ): Promise<UploadResult> {
    const fileExtension = originalname ? this.getFileExtension(originalname) : this.getExtensionFromMime(mimetype);
    const key = `${folder}/${uuidv4()}${fileExtension}`;

    this.logger.log(`Uploading buffer to R2: ${key} (${mimetype}, ${buffer.length} bytes)`);

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimetype,
          CacheControl: 'public, max-age=31536000', // 1 year cache
        }),
      );

      const url = this.publicUrl
        ? `${this.publicUrl}/${key}`
        : `https://${this.bucketName}.r2.dev/${key}`;

      this.logger.log(`File uploaded successfully: ${url}`);

      return {
        key,
        url,
        contentType: mimetype,
        size: buffer.length,
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload file to R2: ${error.message}`, error.stack);
      throw new Error('Failed to upload file. Please try again later.');
    }
  }

  /**
   * Delete a file from Cloudflare R2
   * @param key - The file key to delete
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      this.logger.log(`File deleted from R2: ${key}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete file from R2: ${error.message}`, error.stack);
      throw new Error('Failed to delete file. Please try again later.');
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? `.${ext}` : '';
  }

  private getExtensionFromMime(mime: string): string {
    switch (mime) {
      case 'video/mp4': return '.mp4';
      case 'video/quicktime': return '.mov';
      case 'video/x-msvideo': return '.avi';
      case 'video/webm': return '.webm';
      case 'image/jpeg': return '.jpg';
      case 'image/png': return '.png';
      case 'image/gif': return '.gif';
      case 'image/webp': return '.webp';
      default: return '';
    }
  }

  /**
   * Validate file type for images and videos
   */
  validateMediaType(file: Express.Multer.File): { valid: boolean; type: 'image' | 'video' | null; error?: string } {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const videoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp'];

    if (imageTypes.includes(file.mimetype)) {
      return { valid: true, type: 'image' };
    }

    if (videoTypes.includes(file.mimetype)) {
      return { valid: true, type: 'video' };
    }

    return {
      valid: false,
      type: null,
      error: `Invalid file type: ${file.mimetype}. Allowed: images (jpeg, png, gif, webp) and videos (mp4, mov, avi, webm)`,
    };
  }

  /**
   * Validate file size (default max: 50MB for videos, 10MB for images)
   */
  validateFileSize(file: Express.Multer.File, maxSizeMB = 50): { valid: boolean; error?: string } {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  }
}
