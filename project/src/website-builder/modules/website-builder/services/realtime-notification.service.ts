import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';

export interface SSEConnection {
  userId: number;
  response: Response;
  lastPing: Date;
}

export interface JobUpdate {
  jobId: string;
  status: string;
  progress: number;
  currentStep?: string;
  previewUrl?: string;
  error?: string;
}

export interface NotificationUpdate {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: Date;
}

@Injectable()
export class RealTimeNotificationService {
  private readonly logger = new Logger(RealTimeNotificationService.name);
  private readonly connections: Map<number, SSEConnection> = new Map();

  /**
   * Handle new SSE connection
   */
  async handleSSEConnection(userId: number, res: Response): Promise<void> {
    try {
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Send initial connection message
      this.sendSSEMessage(res, 'connected', { userId, timestamp: new Date().toISOString() });

      // Store connection
      const connection: SSEConnection = {
        userId,
        response: res,
        lastPing: new Date(),
      };

      this.connections.set(userId, connection);

      this.logger.log(`SSE connection established for user ${userId}`);

      // Set up ping interval
      const pingInterval = setInterval(() => {
        this.sendSSEMessage(res, 'ping', { timestamp: new Date().toISOString() });
        connection.lastPing = new Date();
      }, 30000); // Ping every 30 seconds

      // Handle client disconnect
      res.on('close', () => {
        this.logger.log(`SSE connection closed for user ${userId}`);
        this.connections.delete(userId);
        clearInterval(pingInterval);
      });

      res.on('error', (error) => {
        this.logger.error(`SSE connection error for user ${userId}: ${error.message}`);
        this.connections.delete(userId);
        clearInterval(pingInterval);
      });

    } catch (error) {
      this.logger.error(`Failed to establish SSE connection for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notification to a specific user
   */
  async sendNotification(userId: number, notification: NotificationUpdate): Promise<void> {
    try {
      const connection = this.connections.get(userId);
      if (!connection) {
        this.logger.debug(`No SSE connection found for user ${userId}`);
        return;
      }

      this.sendSSEMessage(connection.response, 'notification', notification);
      this.logger.debug(`Sent notification to user ${userId}: ${notification.title}`);

    } catch (error) {
      this.logger.error(`Failed to send notification to user ${userId}: ${error.message}`);
    }
  }

  /**
   * Send job update to a specific user
   */
  async sendJobUpdate(userId: number, jobUpdate: JobUpdate): Promise<void> {
    try {
      const connection = this.connections.get(userId);
      if (!connection) {
        this.logger.debug(`No SSE connection found for user ${userId}`);
        return;
      }

      this.sendSSEMessage(connection.response, 'job_update', jobUpdate);
      this.logger.debug(`Sent job update to user ${userId}: ${jobUpdate.jobId}`);

    } catch (error) {
      this.logger.error(`Failed to send job update to user ${userId}: ${error.message}`);
    }
  }

  /**
   * Send job update to all connected users
   */
  async broadcastJobUpdate(jobUpdate: JobUpdate): Promise<void> {
    try {
      const promises = Array.from(this.connections.keys()).map(userId =>
        this.sendJobUpdate(userId, jobUpdate)
      );

      await Promise.all(promises);
      this.logger.debug(`Broadcasted job update: ${jobUpdate.jobId}`);

    } catch (error) {
      this.logger.error(`Failed to broadcast job update: ${error.message}`);
    }
  }

  /**
   * Send notification to all connected users
   */
  async broadcastNotification(notification: NotificationUpdate): Promise<void> {
    try {
      const promises = Array.from(this.connections.keys()).map(userId =>
        this.sendNotification(userId, notification)
      );

      await Promise.all(promises);
      this.logger.debug(`Broadcasted notification: ${notification.title}`);

    } catch (error) {
      this.logger.error(`Failed to broadcast notification: ${error.message}`);
    }
  }

  /**
   * Remove connection for a user
   */
  removeConnection(userId: number): void {
    const connection = this.connections.get(userId);
    if (connection) {
      try {
        connection.response.end();
      } catch (error) {
        this.logger.error(`Error closing connection for user ${userId}: ${error.message}`);
      }
      this.connections.delete(userId);
      this.logger.log(`Removed SSE connection for user ${userId}`);
    }
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get all connected user IDs
   */
  getConnectedUsers(): number[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: number): boolean {
    return this.connections.has(userId);
  }

  /**
   * Clean up stale connections
   */
  cleanupStaleConnections(): void {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [userId, connection] of this.connections.entries()) {
      const timeSinceLastPing = now.getTime() - connection.lastPing.getTime();
      
      if (timeSinceLastPing > staleThreshold) {
        this.logger.warn(`Removing stale connection for user ${userId}`);
        this.removeConnection(userId);
      }
    }
  }

  /**
   * Send SSE message
   */
  private sendSSEMessage(res: Response, event: string, data: any): void {
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(message);
    } catch (error) {
      this.logger.error(`Failed to send SSE message: ${error.message}`);
    }
  }

  /**
   * Send error message
   */
  sendErrorMessage(userId: number, error: string): void {
    try {
      const connection = this.connections.get(userId);
      if (connection) {
        this.sendSSEMessage(connection.response, 'error', { 
          message: error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send error message to user ${userId}: ${error.message}`);
    }
  }
} 