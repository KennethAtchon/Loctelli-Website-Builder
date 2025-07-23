import { ApiClient } from './client';

export interface WebsiteFile {
  name: string;
  content: string;
  type: string;
  size?: number;
}

export interface Website {
  id: string;
  name: string;
  description?: string;
  type: string;
  files: WebsiteFile[];
  status: 'active' | 'archived' | 'draft';
  createdAt: string;
  updatedAt: string;
  // Build-related fields
  buildStatus?: 'pending' | 'building' | 'running' | 'failed' | 'stopped';
  previewUrl?: string;
  processId?: string;
  buildOutput?: string[];
  portNumber?: number;
  lastBuildAt?: string;
  buildDuration?: number;
}

export interface AiEditRequest {
  websiteName: string;
  fileName: string;
  prompt: string;
  currentContent: string;
  fileType: string;
}

export interface AiEditResponse {
  success: boolean;
  modifiedContent: string;
  changes: {
    description: string;
    modifications: any;
    confidence?: number;
  };
  processingTime?: number;
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  website: Website;
  error?: string;
}

export interface ExportResponse {
  success: boolean;
  downloadUrl?: string;
  files?: Array<{
    name: string;
    content: string;
    type: string;
  }>;
  error?: string;
}

export interface ChangeHistory {
  id: string;
  websiteId: string;
  fileName: string;
  description: string;
  prompt: string;
  modifications: any;
  status: 'applied' | 'reverted' | 'pending';
  createdAt: string;
  confidence?: number;
  processingTime?: number;
}

export interface CreateWebsiteRequest {
  name: string;
  description?: string;
  type: string;
  structure: Record<string, any>;
  files: Array<{
    name: string;
    content: string;
    type: string;
    size: number;
  }>;
}

export class WebsiteBuilderApi extends ApiClient {
  async uploadWebsite(files: File[], name: string, description?: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('name', name);
    if (description) {
      formData.append('description', description);
    }
    
    files.forEach((file) => {
      formData.append('files', file);
    });

    return this.post<UploadResponse>('/website-builder/upload', formData);
  }

  async createWebsite(request: CreateWebsiteRequest): Promise<Website> {
    return this.post<Website>('/website-builder', request);
  }

  async getWebsite(id: string): Promise<Website> {
    return this.get<Website>(`/website-builder/${id}`);
  }

  async listWebsites(): Promise<Website[]> {
    return this.get<Website[]>('/website-builder');
  }

  async updateWebsite(id: string, updates: Partial<CreateWebsiteRequest>): Promise<Website> {
    return this.patch<Website>(`/website-builder/${id}`, updates);
  }

  async deleteWebsite(id: string): Promise<{ success: boolean }> {
    return this.delete<{ success: boolean }>(`/website-builder/${id}`);
  }

  async aiEdit(websiteId: string, request: Omit<AiEditRequest, 'websiteName'>): Promise<AiEditResponse> {
    return this.post<AiEditResponse>(`/website-builder/${websiteId}/ai-edit`, request);
  }

  async getChangeHistory(websiteId: string): Promise<ChangeHistory[]> {
    return this.get<ChangeHistory[]>(`/website-builder/${websiteId}/changes`);
  }

  async revertChange(websiteId: string, changeId: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/website-builder/${websiteId}/changes/${changeId}/revert`);
  }

  async exportWebsite(websiteId: string): Promise<ExportResponse> {
    return this.get<ExportResponse>(`/website-builder/${websiteId}/export`);
  }

  async saveChanges(websiteId: string, changes: Array<{ fileName: string; content: string }>): Promise<{ success: boolean }> {
    return this.patch<{ success: boolean }>(`/website-builder/${websiteId}`, { files: changes });
  }

  // Helper method to create a downloadable zip file from exported files
  async downloadWebsite(websiteId: string): Promise<void> {
    try {
      const response = await this.exportWebsite(websiteId);
      
      if (response.success && response.files) {
        // Create a zip file using JSZip
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        // Add files to zip
        response.files.forEach(file => {
          zip.file(file.name, file.content);
        });
        
        // Generate and download zip
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `website-${websiteId}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error(response.error || 'Export failed');
      }
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  // Build management methods
  async getBuildStatus(websiteId: string): Promise<{
    websiteId: string;
    buildStatus: 'pending' | 'building' | 'running' | 'failed' | 'stopped';
    previewUrl?: string;
    portNumber?: number;
    lastBuildAt?: string;
    buildDuration?: number;
    buildOutput?: string[];
    processInfo?: {
      status: string;
      startTime?: string;
      endTime?: string;
      buildOutput: string[];
    };
  }> {
    return this.get(`/website-builder/${websiteId}/build-status`);
  }

  async stopWebsite(websiteId: string): Promise<{ success: boolean; message: string }> {
    return this.post(`/website-builder/${websiteId}/stop`);
  }

  async restartWebsite(websiteId: string): Promise<{ success: boolean; previewUrl?: string }> {
    return this.post(`/website-builder/${websiteId}/restart`);
  }

  /**
   * Get the proxy preview URL for a website
   * This constructs the proxy endpoint URL that forwards to the internal Vite server
   */
  getProxyPreviewUrl(websiteId: string): string {
    return `${this.baseUrl}/website-builder/${websiteId}/proxy-preview`;
  }

  // === ASYNC QUEUE & NOTIFICATIONS ===

  // Get all jobs for the current user
  async getUserQueue() {
    return this.get('/website-builder/user/queue');
  }

  // Get all notifications for the current user
  async getUserNotifications() {
    return this.get('/website-builder/user/notifications');
  }

  // Get unread notifications for the current user
  async getUnreadNotifications() {
    return this.get('/website-builder/user/notifications/unread');
  }

  // Get unread notification count
  async getUnreadCount() {
    return this.get('/website-builder/user/notifications/unread-count');
  }

  // Mark a notification as read
  async markNotificationAsRead(notificationId: string) {
    return this.patch(`/website-builder/user/notifications/${notificationId}/read`);
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead() {
    return this.patch('/website-builder/user/notifications/read-all');
  }

  // Delete a notification
  async deleteNotification(notificationId: string) {
    return this.delete(`/website-builder/user/notifications/${notificationId}`);
  }

  // Cancel a build job
  async cancelJob(jobId: string) {
    return this.delete(`/website-builder/jobs/${jobId}`);
  }

  // Retry a failed build job
  async retryJob(jobId: string) {
    return this.post(`/website-builder/jobs/${jobId}/retry`);
  }

  // Get job logs (if implemented)
  async getJobLogs(jobId: string) {
    return this.get(`/website-builder/jobs/${jobId}/logs`);
  }

  // Get job details
  async getJob(jobId: string) {
    return this.get(`/website-builder/jobs/${jobId}`);
  }

  // Get queue position for a job
  async getJobQueuePosition(jobId: string) {
    return this.get(`/website-builder/jobs/${jobId}/queue-position`);
  }

  // Get queue stats
  async getQueueStats() {
    return this.get('/website-builder/queue/stats');
  }

  // Get active workers
  async getActiveWorkers() {
    return this.get('/website-builder/queue/workers');
  }

  // Stream queue updates (SSE)
  getQueueStreamUrl() {
    return `${this.baseUrl}/website-builder/user/queue/stream`;
  }
} 