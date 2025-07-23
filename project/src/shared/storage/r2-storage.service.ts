import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private publicUrl: string;
  private enabled: boolean;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('r2.bucketName') || '';
    this.publicUrl = this.configService.get<string>('r2.publicUrl') || '';
    this.enabled = this.configService.get<boolean>('r2.enabled') || false;

    if (!this.enabled) {
      this.logger.warn('R2 storage is disabled');
      return;
    }

    const accountId = this.configService.get<string>('r2.accountId');
    const accessKeyId = this.configService.get<string>('r2.accessKeyId');
    const secretAccessKey = this.configService.get<string>('r2.secretAccessKey');

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName) {
      this.logger.warn('R2 configuration is incomplete. R2 functionality will be disabled.');
      this.enabled = false;
      return;
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log('R2 storage service initialized successfully');
  }

  /**
   * Upload a file to R2 storage
   */
  async uploadFile(
    key: string,
    content: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!this.enabled) {
      throw new Error('R2 storage is disabled');
    }

    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        ContentType: contentType,
      },
    });

    try {
      await upload.done();
      const publicUrl = this.getPublicUrl(key);
      this.logger.log(`File uploaded successfully: ${key}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`Error uploading file to R2: ${error.message}`);
      throw new Error(`Failed to upload file to R2 storage: ${error.message}`);
    }
  }

  /**
   * Upload website ZIP file
   */
  async uploadWebsiteZip(websiteId: string, zipBuffer: Buffer): Promise<string> {
    const key = `websites/${websiteId}/original/${Date.now()}.zip`;
    return this.uploadFile(key, zipBuffer, 'application/zip');
  }

  /**
   * Upload extracted file from website
   */
  async uploadExtractedFile(
    websiteId: string,
    filePath: string,
    content: Buffer,
    mimeType: string,
  ): Promise<string> {
    const key = `websites/${websiteId}/extracted/${filePath}`;
    return this.uploadFile(key, content, mimeType);
  }

  /**
   * Upload build files
   */
  async uploadBuildFiles(
    websiteId: string,
    buildId: string,
    files: Map<string, Buffer>,
  ): Promise<string[]> {
    const urls: string[] = [];
    for (const [filePath, content] of files) {
      const key = `websites/${websiteId}/builds/${buildId}/${filePath}`;
      const url = await this.uploadFile(key, content, this.getMimeType(filePath));
      urls.push(url);
    }
    return urls;
  }

  /**
   * Get file content from R2
   */
  async getFileContent(r2Key: string): Promise<Buffer> {
    if (!this.enabled) {
      throw new Error('R2 storage is disabled');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: r2Key,
    });

    try {
      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];
      
      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Error getting file content from R2: ${error.message}`);
      throw new Error(`Failed to get file content from R2: ${error.message}`);
    }
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('R2 storage is disabled');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting file from R2: ${error.message}`);
      throw new Error(`Failed to delete file from R2: ${error.message}`);
    }
  }

  /**
   * Delete all files for a website
   */
  async deleteWebsiteFiles(websiteId: string): Promise<void> {
    if (!this.enabled) {
      throw new Error('R2 storage is disabled');
    }

    const prefix = `websites/${websiteId}/`;
    
    try {
      // List all objects with the prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const listResponse = await this.s3Client.send(listCommand);
      
      if (listResponse.Contents && listResponse.Contents.length > 0) {
        // Delete all objects
        const deletePromises = listResponse.Contents.map((object) =>
          this.deleteFile(object.Key!),
        );
        
        await Promise.all(deletePromises);
        this.logger.log(`Deleted ${listResponse.Contents.length} files for website ${websiteId}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting website files: ${error.message}`);
      throw new Error(`Failed to delete website files: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for private file access
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!this.enabled) {
      throw new Error('R2 storage is disabled');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(`Error generating signed URL: ${error.message}`);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Extract storage key from a public URL
   */
  extractKeyFromUrl(url: string): string | null {
    if (!url || !this.publicUrl) return null;
    
    try {
      const urlObj = new URL(url);
      const publicUrlObj = new URL(this.publicUrl);
      
      if (urlObj.origin === publicUrlObj.origin) {
        return urlObj.pathname.startsWith('/') 
          ? urlObj.pathname.substring(1) 
          : urlObj.pathname;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error parsing URL: ${error.message}`);
      return null;
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    if (!this.publicUrl) {
      throw new Error('R2 public URL is not configured');
    }
    
    return `${this.publicUrl}/${key}`.replace(/([^:]\/)\/+/g, '$1');
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      txt: 'text/plain',
      md: 'text/markdown',
      xml: 'application/xml',
      pdf: 'application/pdf',
      zip: 'application/zip',
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Check if R2 is enabled and configured
   */
  isEnabled(): boolean {
    return this.enabled;
  }
} 