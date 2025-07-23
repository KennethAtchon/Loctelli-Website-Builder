import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BuildQueueService } from './build-queue.service';
import { BuildWorkerService } from './build-worker.service';
import { NotificationService } from './notification.service';
import { RealTimeNotificationService } from './realtime-notification.service';

@Injectable()
export class QueueProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueProcessorService.name);
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly buildQueueService: BuildQueueService,
    private readonly buildWorkerService: BuildWorkerService,
    private readonly notificationService: NotificationService,
    private readonly realTimeNotificationService: RealTimeNotificationService,
  ) {}

  async onModuleInit() {
    this.logger.log('Queue processor service initialized');
    this.startProcessing();
  }

  async onModuleDestroy() {
    this.logger.log('Queue processor service shutting down');
    this.stopProcessing();
  }

  /**
   * Start the queue processing loop
   */
  startProcessing() {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(async () => {
      await this.processNextJob();
    }, 5000); // Check every 5 seconds

    this.logger.log('Queue processing started');
  }

  /**
   * Stop the queue processing loop
   */
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      this.logger.log('Queue processing stopped');
    }
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob() {
    if (this.isProcessing) {
      return; // Already processing a job
    }

    try {
      this.isProcessing = true;

      // Get the next job from the queue
      const job = await this.buildQueueService.dequeueJob();
      if (!job) {
        return; // No jobs in queue
      }

      this.logger.log(`Processing job ${job.id} for website ${(job as any).website?.name || 'Unknown'}`);

      // Send real-time update
      await this.realTimeNotificationService.sendJobUpdate(job.userId, {
        jobId: job.id,
        status: 'building',
        progress: 0,
        currentStep: 'Starting build process',
      });

      // Start the build worker
      await this.buildWorkerService.startWorker(job.id);

      this.logger.log(`Job ${job.id} processing completed`);

    } catch (error) {
      this.logger.error(`Error processing job: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get processing status
   */
  getProcessingStatus() {
    return {
      isProcessing: this.isProcessing,
      isRunning: !!this.processingInterval,
    };
  }

  /**
   * Manually trigger job processing
   */
  async triggerProcessing() {
    if (!this.isProcessing) {
      await this.processNextJob();
    }
  }

  /**
   * Clean up completed jobs (runs daily at 2 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupCompletedJobs() {
    try {
      this.logger.log('Starting cleanup of completed jobs');
      
      // Clean up old notifications
      const cleanedNotifications = await this.notificationService.cleanupOldNotifications();
      this.logger.log(`Cleaned up ${cleanedNotifications} old notifications`);

      // Clean up stale SSE connections
      this.realTimeNotificationService.cleanupStaleConnections();
      
      this.logger.log('Cleanup completed');
    } catch (error) {
      this.logger.error(`Error during cleanup: ${error.message}`);
    }
  }

  /**
   * Get queue health status
   */
  async getQueueHealth() {
    const stats = await this.buildQueueService.getQueueStats();
    const workers = this.buildWorkerService.getActiveWorkers();
    const processingStatus = this.getProcessingStatus();
    const connectionCount = this.realTimeNotificationService.getConnectionCount();

    return {
      stats,
      activeWorkers: workers.size,
      processingStatus,
      connectionCount,
      timestamp: new Date().toISOString(),
    };
  }
} 