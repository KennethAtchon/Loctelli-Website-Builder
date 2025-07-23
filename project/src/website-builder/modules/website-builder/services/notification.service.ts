import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { UserNotification } from '@prisma/client';

export interface CreateNotificationDto {
  userId: number;
  jobId: string;
  type: 'build_queued' | 'build_started' | 'build_completed' | 'build_failed' | 'build_cancelled';
  title: string;
  message: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationDto): Promise<UserNotification> {
    try {
      const notification = await this.prisma.userNotification.create({
        data: {
          userId: data.userId,
          jobId: data.jobId,
          type: data.type,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl,
        },
        include: {
          job: {
            include: {
              website: true,
            },
          },
        },
      });

      this.logger.log(`Created notification ${notification.id} for user ${data.userId}`);
      return notification;
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: number): Promise<UserNotification[]> {
    try {
      return await this.prisma.userNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          job: {
            include: {
              website: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get user notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: number): Promise<UserNotification[]> {
    try {
      return await this.prisma.userNotification.findMany({
        where: { 
          userId,
          read: false,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          job: {
            include: {
              website: true,
            },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get unread notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      return await this.prisma.userNotification.count({
        where: { 
          userId,
          read: false,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to get unread count: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: number): Promise<void> {
    try {
      const notification = await this.prisma.userNotification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.userId !== userId) {
        throw new Error('Unauthorized to mark this notification as read');
      }

      await this.prisma.userNotification.update({
        where: { id: notificationId },
        data: { read: true },
      });

      this.logger.debug(`Marked notification ${notificationId} as read`);
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<void> {
    try {
      await this.prisma.userNotification.updateMany({
        where: { 
          userId,
          read: false,
        },
        data: { read: true },
      });

      this.logger.log(`Marked all notifications as read for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: number): Promise<void> {
    try {
      const notification = await this.prisma.userNotification.findUnique({
        where: { id: notificationId },
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.userId !== userId) {
        throw new Error('Unauthorized to delete this notification');
      }

      await this.prisma.userNotification.delete({
        where: { id: notificationId },
      });

      this.logger.log(`Deleted notification ${notificationId}`);
    } catch (error) {
      this.logger.error(`Failed to delete notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create build-related notifications
   */
  async createBuildNotification(
    userId: number,
    jobId: string,
    type: CreateNotificationDto['type'],
    websiteName: string,
    actionUrl?: string,
  ): Promise<UserNotification> {
    const notifications = {
      build_queued: {
        title: 'Build Queued',
        message: `Your website "${websiteName}" has been queued for building.`,
      },
      build_started: {
        title: 'Build Started',
        message: `Building has started for "${websiteName}".`,
      },
      build_completed: {
        title: 'Build Completed',
        message: `Your website "${websiteName}" has been built successfully!`,
      },
      build_failed: {
        title: 'Build Failed',
        message: `The build for "${websiteName}" has failed. Please check the logs for details.`,
      },
      build_cancelled: {
        title: 'Build Cancelled',
        message: `The build for "${websiteName}" has been cancelled.`,
      },
    };

    const notification = notifications[type];

    return this.createNotification({
      userId,
      jobId,
      type,
      title: notification.title,
      message: notification.message,
      actionUrl,
    });
  }

  /**
   * Clean up old notifications (older than 30 days)
   */
  async cleanupOldNotifications(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.userNotification.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          read: true,
        },
      });

      this.logger.log(`Cleaned up ${result.count} old notifications`);
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to cleanup old notifications: ${error.message}`);
      throw error;
    }
  }
} 