import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from './r2-storage.service';
import * as JSZip from 'jszip';
import * as crypto from 'crypto';
import * as path from 'path';

export interface WebsiteFile {
  id: string;
  websiteId: string;
  name: string;
  path: string;
  r2Key: string;
  r2Url: string;
  size: number;
  type: string;
  hash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractedFile {
  path: string;
  content: Buffer;
  size: number;
  type: string;
}

@Injectable()
export class FileProcessingService {
  private readonly logger = new Logger(FileProcessingService.name);

  constructor(
    private r2Storage: R2StorageService,
    private prisma: PrismaService,
  ) {}

  /**
   * Process website upload - extract ZIP and upload individual files to R2
   */
  async processWebsiteUpload(
    websiteId: string,
    zipBuffer: Buffer,
  ): Promise<WebsiteFile[]> {
    this.logger.log(`Processing website upload for ${websiteId}`);

    try {
      // 1. Upload original ZIP
      const zipUrl = await this.r2Storage.uploadWebsiteZip(websiteId, zipBuffer);
      this.logger.log(`Original ZIP uploaded: ${zipUrl}`);

      // 2. Update website record with original ZIP URL
      await this.prisma.website.update({
        where: { id: websiteId },
        data: { originalZipUrl: zipUrl },
      });

      // 3. Extract ZIP and upload individual files
      const extractedFiles = await this.extractAndUploadFiles(websiteId, zipBuffer);
      this.logger.log(`Extracted and uploaded ${extractedFiles.length} files`);

      // 4. Create file metadata records
      const fileRecords = await this.createFileRecords(websiteId, extractedFiles);
      this.logger.log(`Created ${fileRecords.length} file records`);

      return fileRecords;
    } catch (error) {
      this.logger.error(`Error processing website upload: ${error.message}`);
      // Cleanup on failure
      await this.cleanupOnFailure(websiteId);
      throw error;
    }
  }

  /**
   * Get all files for a website
   */
  async getWebsiteFiles(websiteId: string): Promise<WebsiteFile[]> {
    return this.prisma.websiteFile.findMany({
      where: { websiteId },
      orderBy: { path: 'asc' },
    });
  }

  /**
   * Get file content from R2
   */
  async getFileContent(websiteId: string, filePath: string): Promise<Buffer> {
    const fileRecord = await this.prisma.websiteFile.findUnique({
      where: { websiteId_path: { websiteId, path: filePath } },
    });

    if (!fileRecord) {
      throw new Error(`File not found: ${filePath}`);
    }

    return this.r2Storage.getFileContent(fileRecord.r2Key);
  }

  /**
   * Get file metadata by path
   */
  async getFileMetadata(websiteId: string, filePath: string): Promise<WebsiteFile | null> {
    return this.prisma.websiteFile.findUnique({
      where: { websiteId_path: { websiteId, path: filePath } },
    });
  }

  /**
   * Update file content in R2
   */
  async updateFileContent(
    websiteId: string,
    filePath: string,
    content: Buffer,
  ): Promise<void> {
    const fileRecord = await this.prisma.websiteFile.findUnique({
      where: { websiteId_path: { websiteId, path: filePath } },
    });

    if (!fileRecord) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Upload new content to R2
    await this.r2Storage.uploadExtractedFile(
      websiteId,
      filePath,
      content,
      fileRecord.type,
    );

    // Update file metadata
    const newHash = this.calculateHash(content);
    await this.prisma.websiteFile.update({
      where: { id: fileRecord.id },
      data: {
        size: content.length,
        hash: newHash,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete a file from R2 and database
   */
  async deleteFile(websiteId: string, filePath: string): Promise<void> {
    const fileRecord = await this.prisma.websiteFile.findUnique({
      where: { websiteId_path: { websiteId, path: filePath } },
    });

    if (!fileRecord) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Delete from R2
    await this.r2Storage.deleteFile(fileRecord.r2Key);

    // Delete from database
    await this.prisma.websiteFile.delete({
      where: { id: fileRecord.id },
    });
  }

  /**
   * Delete all files for a website
   */
  async deleteWebsiteFiles(websiteId: string): Promise<void> {
    // Delete from R2
    await this.r2Storage.deleteWebsiteFiles(websiteId);

    // Delete from database
    await this.prisma.websiteFile.deleteMany({
      where: { websiteId },
    });
  }

  /**
   * Extract ZIP and upload individual files to R2
   */
  private async extractAndUploadFiles(
    websiteId: string,
    zipBuffer: Buffer,
  ): Promise<ExtractedFile[]> {
    const extractedFiles: ExtractedFile[] = [];

    try {
      const zip = new JSZip();
      await zip.loadAsync(zipBuffer);

      for (const [filePath, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          const content = await zipEntry.async('nodebuffer');
          const mimeType = this.getMimeType(filePath);

          // Upload to R2
          await this.r2Storage.uploadExtractedFile(
            websiteId,
            filePath,
            content,
            mimeType,
          );

          extractedFiles.push({
            path: filePath,
            content,
            size: content.length,
            type: mimeType,
          });
        }
      }

      return extractedFiles;
    } catch (error) {
      this.logger.error(`Error extracting ZIP file: ${error.message}`);
      throw new Error(`Failed to extract ZIP file: ${error.message}`);
    }
  }

  /**
   * Create file metadata records in database
   */
  private async createFileRecords(
    websiteId: string,
    files: ExtractedFile[],
  ): Promise<WebsiteFile[]> {
    const fileRecords = files.map((file) => ({
      websiteId,
      name: path.basename(file.path),
      path: file.path,
      r2Key: `websites/${websiteId}/extracted/${file.path}`,
      r2Url: this.r2Storage.getPublicUrl(`websites/${websiteId}/extracted/${file.path}`),
      size: file.size,
      type: file.type,
      hash: this.calculateHash(file.content),
    }));

    const createdRecords = await this.prisma.websiteFile.createMany({
      data: fileRecords,
    });

    // Return the created records with IDs
    return this.prisma.websiteFile.findMany({
      where: { websiteId },
      orderBy: { path: 'asc' },
    });
  }

  /**
   * Calculate file hash for caching and integrity
   */
  private calculateHash(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase().substring(1);
    
    const mimeTypes: Record<string, string> = {
      html: 'text/html',
      htm: 'text/html',
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
      ts: 'application/typescript',
      tsx: 'application/typescript',
      jsx: 'application/javascript',
      scss: 'text/x-scss',
      sass: 'text/x-sass',
      less: 'text/x-less',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Cleanup on failure
   */
  private async cleanupOnFailure(websiteId: string): Promise<void> {
    try {
      await this.r2Storage.deleteWebsiteFiles(websiteId);
      await this.prisma.websiteFile.deleteMany({
        where: { websiteId },
      });
    } catch (cleanupError) {
      this.logger.error(`Error during cleanup: ${cleanupError.message}`);
    }
  }

  /**
   * Get storage statistics for a website
   */
  async getWebsiteStorageStats(websiteId: string): Promise<{
    fileCount: number;
    totalSize: number;
    averageFileSize: number;
  }> {
    const files = await this.prisma.websiteFile.findMany({
      where: { websiteId },
      select: { size: true },
    });

    const fileCount = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const averageFileSize = fileCount > 0 ? totalSize / fileCount : 0;

    return {
      fileCount,
      totalSize,
      averageFileSize,
    };
  }
} 