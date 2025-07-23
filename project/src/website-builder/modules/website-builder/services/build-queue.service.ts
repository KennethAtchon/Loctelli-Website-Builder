import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { BuildJob, Prisma } from '@prisma/client';

export interface CreateBuildJobDto {
  websiteId: string;
  userId: number;
  priority?: number;
}

export interface UpdateJobProgressDto {
  progress: number;
  currentStep?: string;
  logs?: any;
}

export interface CompleteJobDto {
  previewUrl?: string;
  allocatedPort?: number;
}

export interface FailJobDto {
  error: string;
  logs?: any;
}

@Injectable()
export class BuildQueueService {
  private readonly logger = new Logger(BuildQueueService.name);
  private readonly queue: Map<string, BuildJob> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enqueue a new build job
   */
  async enqueueJob(data: CreateBuildJobDto): Promise<string> {
    try {
      const job = await this.prisma.buildJob.create({
        data: {
          websiteId: data.websiteId,
          userId: data.userId,
          priority: data.priority || 0,
          status: 'pending',
          progress: 0,
        },
        include: {
          website: true,
          user: true,
        },
      });

      this.logger.log(`Build job ${job.id} enqueued for website ${data.websiteId}`);
      return job.id;
    } catch (error) {
      this.logger.error(`Failed to enqueue build job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the next job from the queue
   */
  async dequeueJob(): Promise<BuildJob | null> {
    try {
      const job = await this.prisma.buildJob.findFirst({
        where: {
          status: 'pending',
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' },
        ],
        include: {
          website: true,
          user: true,
        },
      });

      if (job) {
        await this.prisma.buildJob.update({
          where: { id: job.id },
          data: {
            status: 'queued',
            startedAt: new Date(),
          },
        });

        this.logger.log(`Dequeued build job ${job.id}`);
      }

      return job;
    } catch (error) {
      this.logger.error(`Failed to dequeue job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update job progress
   */
  async updateJobProgress(jobId: string, data: UpdateJobProgressDto): Promise<void> {
    try {
      const updateData: Prisma.BuildJobUpdateInput = {
        progress: data.progress,
        currentStep: data.currentStep,
      };

      if (data.logs) {
        updateData.logs = data.logs;
      }

      if (data.progress === 0) {
        updateData.status = 'building';
      }

      await this.prisma.buildJob.update({
        where: { id: jobId },
        data: updateData,
      });

      this.logger.debug(`Updated job ${jobId} progress to ${data.progress}%`);
    } catch (error) {
      this.logger.error(`Failed to update job progress: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, data: CompleteJobDto): Promise<void> {
    try {
      await this.prisma.buildJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          progress: 100,
          previewUrl: data.previewUrl,
          allocatedPort: data.allocatedPort,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Build job ${jobId} completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to complete job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, data: FailJobDto): Promise<void> {
    try {
      await this.prisma.buildJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          error: data.error,
          logs: data.logs,
          completedAt: new Date(),
        },
      });

      this.logger.error(`Build job ${jobId} failed: ${data.error}`);
    } catch (error) {
      this.logger.error(`Failed to mark job as failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<BuildJob | null> {
    try {
      return await this.prisma.buildJob.findUnique({
        where: { id: jobId },
        include: {
          website: true,
          user: true,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all jobs for a user
   */
  async getUserJobs(userId: number): Promise<BuildJob[]> {
    try {
      return await this.prisma.buildJob.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          website: true,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get user jobs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get queue position for a job
   */
  async getQueuePosition(jobId: string): Promise<number> {
    try {
      const job = await this.prisma.buildJob.findUnique({
        where: { id: jobId },
        select: { priority: true, createdAt: true },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      const position = await this.prisma.buildJob.count({
        where: {
          status: 'pending',
          OR: [
            { priority: { gt: job.priority } },
            {
              priority: job.priority,
              createdAt: { lt: job.createdAt },
            },
          ],
        },
      });

      return position + 1;
    } catch (error) {
      this.logger.error(`Failed to get queue position: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, userId: number): Promise<void> {
    try {
      const job = await this.prisma.buildJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      if (job.userId !== userId) {
        throw new Error('Unauthorized to cancel this job');
      }

      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        throw new Error('Cannot cancel job in current status');
      }

      await this.prisma.buildJob.update({
        where: { id: jobId },
        data: {
          status: 'cancelled',
          completedAt: new Date(),
        },
      });

      this.logger.log(`Build job ${jobId} cancelled by user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to cancel job: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    building: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const [pending, building, completed, failed, total] = await Promise.all([
        this.prisma.buildJob.count({ where: { status: 'pending' } }),
        this.prisma.buildJob.count({ where: { status: 'building' } }),
        this.prisma.buildJob.count({ where: { status: 'completed' } }),
        this.prisma.buildJob.count({ where: { status: 'failed' } }),
        this.prisma.buildJob.count(),
      ]);

      return {
        pending,
        building,
        completed,
        failed,
        total,
      };
    } catch (error) {
      this.logger.error(`Failed to get queue stats: ${error.message}`);
      throw error;
    }
  }
} 