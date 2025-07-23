import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { BuildService } from './build.service';
import * as fs from 'fs-extra';
import * as path from 'path';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);
  private readonly BUILD_DIR: string;
  private readonly INACTIVE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(
    private prisma: PrismaService,
    private buildService: BuildService,
  ) {
    this.BUILD_DIR = process.env.BUILD_DIR || '/tmp/website-builds';
    this.logger.log(`🧹 CleanupService initialized with build directory: ${this.BUILD_DIR}`);
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupInactiveWebsites() {
    this.logger.log('🧹 Starting scheduled cleanup of inactive websites');
    
    try {
      // Find websites that have been inactive for more than 24 hours
      const cutoffTime = new Date(Date.now() - this.INACTIVE_TIMEOUT);
      
      const inactiveWebsites = await this.prisma.website.findMany({
        where: {
          OR: [
            {
              buildStatus: 'running',
              lastBuildAt: {
                lt: cutoffTime
              }
            },
            {
              buildStatus: 'failed',
              lastBuildAt: {
                lt: cutoffTime
              }
            },
            {
              buildStatus: 'stopped',
              lastBuildAt: {
                lt: cutoffTime
              }
            }
          ]
        },
        select: {
          id: true,
          name: true,
          buildStatus: true,
          lastBuildAt: true,
          processId: true,
          portNumber: true
        }
      });

      this.logger.log(`🔍 Found ${inactiveWebsites.length} inactive websites to clean up`);

      for (const website of inactiveWebsites) {
        try {
          await this.cleanupWebsite(website.id);
          this.logger.log(`✅ Cleaned up inactive website: ${website.name} (${website.id})`);
        } catch (error) {
          this.logger.error(`❌ Failed to clean up website ${website.name}:`, error);
        }
      }

      this.logger.log(`🧹 Scheduled cleanup completed. Processed ${inactiveWebsites.length} websites`);
    } catch (error) {
      this.logger.error('❌ Scheduled cleanup failed:', error);
    }
  }

  async cleanupWebsite(websiteId: string): Promise<void> {
    this.logger.log(`🧹 Cleaning up website: ${websiteId}`);

    try {
      // Stop the build process if running
      try {
        await this.buildService.stopWebsite(websiteId);
      } catch (error) {
        this.logger.warn(`⚠️ Could not stop build process for website ${websiteId}:`, error);
      }

      // Update database status
      await this.prisma.website.update({
        where: { id: websiteId },
        data: {
          buildStatus: 'stopped',
          processId: null,
          previewUrl: null,
          portNumber: null,
          updatedAt: new Date(),
        },
      });

      // Clean up project directory
      const projectDir = path.join(this.BUILD_DIR, websiteId);
      if (await fs.pathExists(projectDir)) {
        await fs.remove(projectDir);
        this.logger.log(`🗑️ Removed project directory: ${projectDir}`);
      }

      this.logger.log(`✅ Website cleanup completed: ${websiteId}`);
    } catch (error) {
      this.logger.error(`❌ Website cleanup failed for ${websiteId}:`, error);
      throw error;
    }
  }

  async cleanupAllWebsites(): Promise<void> {
    this.logger.log('🧹 Starting cleanup of all websites');

    try {
      // Get all websites with running processes
      const runningWebsites = await this.prisma.website.findMany({
        where: {
          buildStatus: {
            in: ['running', 'building', 'pending']
          }
        },
        select: {
          id: true,
          name: true,
          buildStatus: true
        }
      });

      this.logger.log(`🔍 Found ${runningWebsites.length} running websites to clean up`);

      for (const website of runningWebsites) {
        try {
          await this.cleanupWebsite(website.id);
        } catch (error) {
          this.logger.error(`❌ Failed to clean up website ${website.name}:`, error);
        }
      }

      // Clean up orphaned build directories
      await this.cleanupOrphanedDirectories();

      this.logger.log(`🧹 All websites cleanup completed`);
    } catch (error) {
      this.logger.error('❌ All websites cleanup failed:', error);
      throw error;
    }
  }

  private async cleanupOrphanedDirectories(): Promise<void> {
    this.logger.log('🧹 Cleaning up orphaned build directories');

    try {
      if (!await fs.pathExists(this.BUILD_DIR)) {
        return;
      }

      const directories = await fs.readdir(this.BUILD_DIR);
      const orphanedDirs: string[] = [];

      for (const dir of directories) {
        const dirPath = path.join(this.BUILD_DIR, dir);
        const stats = await fs.stat(dirPath);

        if (stats.isDirectory()) {
          // Check if this directory corresponds to a website in the database
          const website = await this.prisma.website.findUnique({
            where: { id: dir },
            select: { id: true }
          });

          if (!website) {
            orphanedDirs.push(dirPath);
          }
        }
      }

      this.logger.log(`🔍 Found ${orphanedDirs.length} orphaned directories`);

      for (const dirPath of orphanedDirs) {
        try {
          await fs.remove(dirPath);
          this.logger.log(`🗑️ Removed orphaned directory: ${dirPath}`);
        } catch (error) {
          this.logger.error(`❌ Failed to remove orphaned directory ${dirPath}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('❌ Orphaned directories cleanup failed:', error);
    }
  }

  async getCleanupStats(): Promise<{
    totalWebsites: number;
    runningWebsites: number;
    inactiveWebsites: number;
    failedWebsites: number;
    totalDiskUsage: number;
  }> {
    try {
      const [
        totalWebsites,
        runningWebsites,
        inactiveWebsites,
        failedWebsites,
        diskUsage
      ] = await Promise.all([
        this.prisma.website.count(),
        this.prisma.website.count({
          where: { buildStatus: 'running' }
        }),
        this.prisma.website.count({
          where: {
            buildStatus: 'running',
            lastBuildAt: {
              lt: new Date(Date.now() - this.INACTIVE_TIMEOUT)
            }
          }
        }),
        this.prisma.website.count({
          where: { buildStatus: 'failed' }
        }),
        this.calculateDiskUsage()
      ]);

      return {
        totalWebsites,
        runningWebsites,
        inactiveWebsites,
        failedWebsites,
        totalDiskUsage: diskUsage
      };
    } catch (error) {
      this.logger.error('❌ Failed to get cleanup stats:', error);
      throw error;
    }
  }

  private async calculateDiskUsage(): Promise<number> {
    try {
      if (!await fs.pathExists(this.BUILD_DIR)) {
        return 0;
      }

      const calculateDirSize = async (dirPath: string): Promise<number> => {
        let totalSize = 0;
        const items = await fs.readdir(dirPath);

        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = await fs.stat(itemPath);

          if (stats.isDirectory()) {
            totalSize += await calculateDirSize(itemPath);
          } else {
            totalSize += stats.size;
          }
        }

        return totalSize;
      };

      return await calculateDirSize(this.BUILD_DIR);
    } catch (error) {
      this.logger.error('❌ Failed to calculate disk usage:', error);
      return 0;
    }
  }

  async forceCleanupWebsite(websiteId: string): Promise<void> {
    this.logger.log(`🧹 Force cleaning up website: ${websiteId}`);

    try {
      // Force stop any running processes
      const buildProcess = this.buildService.getBuildStatus(websiteId);
      if (buildProcess && buildProcess.process) {
        buildProcess.process.kill('SIGKILL');
        this.logger.log(`🔪 Force killed process for website ${websiteId}`);
      }

      // Update database status
      await this.prisma.website.update({
        where: { id: websiteId },
        data: {
          buildStatus: 'stopped',
          processId: null,
          previewUrl: null,
          portNumber: null,
          updatedAt: new Date(),
        },
      });

      // Force clean up project directory
      const projectDir = path.join(this.BUILD_DIR, websiteId);
      if (await fs.pathExists(projectDir)) {
        await fs.remove(projectDir);
        this.logger.log(`🗑️ Force removed project directory: ${projectDir}`);
      }

      this.logger.log(`✅ Force cleanup completed for website: ${websiteId}`);
    } catch (error) {
      this.logger.error(`❌ Force cleanup failed for website ${websiteId}:`, error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyMaintenance() {
    this.logger.log('🔧 Starting daily maintenance tasks');

    try {
      // Clean up inactive websites
      await this.cleanupInactiveWebsites();

      // Clean up orphaned directories
      await this.cleanupOrphanedDirectories();

      // Get and log cleanup stats
      const stats = await this.getCleanupStats();
      this.logger.log('📊 Daily maintenance stats:', stats);

      // Log disk usage warning if too high
      const diskUsageMB = stats.totalDiskUsage / (1024 * 1024);
      if (diskUsageMB > 1000) { // 1GB
        this.logger.warn(`⚠️ High disk usage detected: ${diskUsageMB.toFixed(2)}MB`);
      }

      this.logger.log('✅ Daily maintenance completed');
    } catch (error) {
      this.logger.error('❌ Daily maintenance failed:', error);
    }
  }
} 