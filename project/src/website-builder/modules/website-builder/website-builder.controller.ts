import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Logger,
  Res,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { WebsiteBuilderService } from './website-builder.service';
import { CreateWebsiteDto } from './dto/create-website.dto';
import { UpdateWebsiteDto } from './dto/update-website.dto';
import { AiEditDto } from './dto/ai-edit.dto';
import { BuildQueueService } from './services/build-queue.service';
import { NotificationService } from './services/notification.service';
import { BuildWorkerService } from './services/build-worker.service';
import { RealTimeNotificationService } from './services/realtime-notification.service';
import { QueueProcessorService } from './services/queue-processor.service';
import { AdminGuard } from '../../../shared/guards/admin.guard';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('website-builder')
@UseGuards(AdminGuard)
export class WebsiteBuilderController {
  private readonly logger = new Logger(WebsiteBuilderController.name);

  constructor(
    private readonly websiteBuilderService: WebsiteBuilderService,
    private readonly buildQueueService: BuildQueueService,
    private readonly notificationService: NotificationService,
    private readonly buildWorkerService: BuildWorkerService,
    private readonly realTimeNotificationService: RealTimeNotificationService,
    private readonly queueProcessorService: QueueProcessorService,
    private readonly httpService: HttpService, // <-- Inject HttpService
  ) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadWebsite(
    @UploadedFiles() files: any[],
    @Body() body: { name: string; description?: string },
    @CurrentUser() user: any,
  ) {
    // Extract admin ID from user object (JWT strategy returns userId, not id)
    const adminId = user.userId || user.id;
    
    if (!adminId) {
      this.logger.error('❌ Admin ID not found in user object');
      throw new BadRequestException('Admin authentication required');
    }

    this.logger.log(`🚀 Upload request received from admin ID: ${adminId} (${user.email})`);
    this.logger.log(`📁 Files received: ${files?.length || 0} files`);
    this.logger.log(`📝 Website name: ${body.name}`);
    this.logger.log(`📄 Description: ${body.description || 'No description'}`);
    
    if (files && files.length > 0) {
      files.forEach((file, index) => {
        this.logger.log(`📄 File ${index + 1}: ${file.originalname} (${file.size} bytes, ${file.mimetype})`);
        
        // Additional debug info for ZIP files
        if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
          this.logger.log(`📦 ZIP file detected: ${file.originalname}`);
          this.logger.log(`📦 ZIP buffer size: ${file.buffer.length} bytes`);
          this.logger.log(`📦 ZIP buffer type: ${typeof file.buffer}`);
        }
      });
    }

    if (!files || files.length === 0) {
      this.logger.error('❌ No files uploaded');
      throw new BadRequestException('No files uploaded');
    }

    if (!body.name) {
      this.logger.error('❌ Website name is required');
      throw new BadRequestException('Website name is required');
    }

    this.logger.log(`🔧 Calling website builder service to process upload...`);
    const result = await this.websiteBuilderService.uploadWebsite(files, body.name, adminId, body.description);
    this.logger.log(`✅ Upload completed successfully. Website ID: ${result.website?.id}`);
    
    if (!result.website) {
      throw new BadRequestException('Failed to create website');
    }
    
    // Queue the build job instead of building immediately
    const jobId = await this.buildQueueService.enqueueJob({
      websiteId: result.website.id,
      userId: adminId,
    });

    // Get queue position
    const queuePosition = await this.buildQueueService.getQueuePosition(jobId);

    // Create initial notification
    await this.notificationService.createBuildNotification(
      adminId,
      jobId,
      'build_queued',
      body.name,
    );

    this.logger.log(`📋 Build job ${jobId} queued at position ${queuePosition}`);
    
    return {
      ...result,
      jobId,
      queuePosition,
      message: `Website uploaded successfully. Build job queued at position ${queuePosition}.`,
    };
  }

  @Post()
  create(@Body() createWebsiteDto: CreateWebsiteDto, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    return this.websiteBuilderService.createWebsite(createWebsiteDto, adminId);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    return this.websiteBuilderService.findAllWebsites(adminId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    return this.websiteBuilderService.findWebsiteById(id, adminId);
  }

  @Get(':id/debug')
  async debugWebsite(@Param('id') id: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    const website = await this.websiteBuilderService.findWebsiteById(id, adminId);
    
    const debugInfo = {
      ...website,
      debug: {
        fileCount: website.files?.length || 0,
        fileNames: website.files?.map(f => f.name) || [],
        fileTypes: website.files?.map(f => ({ name: f.name, type: f.type, size: f.size })) || [],
        htmlFiles: website.files?.filter(f => f.name.toLowerCase().endsWith('.html') || f.name.toLowerCase().endsWith('.htm')) || [],
        hasPackageJson: website.files?.some(f => f.name === 'package.json') || false,
        hasViteConfig: website.files?.some(f => f.name.includes('vite.config')) || false,
        totalContentSize: website.files?.reduce((sum, f) => sum + f.size, 0) || 0,
        filesWithContent: website.files?.map(f => ({
          name: f.name,
          type: f.type,
          size: f.size,
          hasContent: !!f.content,
          contentLength: f.content?.length || 0
        })) || []
      }
    };
    
    return debugInfo;
  }

  @Get(':id/preview')
  async previewWebsite(@Param('id') id: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    const website = await this.websiteBuilderService.findWebsiteById(id, adminId);
    const files = await this.websiteBuilderService.getWebsiteFiles(id, adminId);
    
    // Find the main HTML file
    const htmlFile = files.find(file => 
      file.name.toLowerCase().endsWith('.html') && 
      (file.name.toLowerCase() === 'index.html' || file.name.toLowerCase() === 'main.html')
    ) || files.find(file => file.name.toLowerCase().endsWith('.html'));

    if (!htmlFile) {
      throw new BadRequestException('No HTML file found for preview');
    }

    // Get the HTML content from R2
    const htmlContent = await this.websiteBuilderService.getFileContent(id, htmlFile.path, adminId);
    
    return {
      website,
      htmlContent: htmlContent.toString('utf8'),
      htmlFile: htmlFile.name,
    };
  }

  /**
   * Proxy preview endpoint for Vite/React dev server
   * Forwards requests to the correct internal port for the website preview
   */
  @Get(':id/proxy-preview')
  async proxyPreview(
    @Param('id') websiteId: string,
    @Res() res: Response,
    @CurrentUser() user: any,
    @Query() query: any,
    @Request() req: any
  ) {
    // Only allow authenticated admins
    const adminId = user.userId || user.id;
    if (!adminId) {
      this.logger.error('❌ Admin ID not found in user object');
      throw new BadRequestException('Admin authentication required');
    }

    this.logger.log(`🔄 Proxy request started for website ${websiteId} from admin ${adminId}`);

    try {
      // Retrieve the website record to get the allocated port
      const website = await this.websiteBuilderService.findWebsiteById(websiteId, adminId);
      if (!website || !website.portNumber) {
        this.logger.error(`❌ No preview port found for website ${websiteId}`);
        this.logger.error(`📊 Website data:`, {
          id: website?.id,
          name: website?.name,
          type: website?.type,
          buildStatus: website?.buildStatus,
          portNumber: website?.portNumber,
          previewUrl: website?.previewUrl
        });
        return res.status(404).send('Preview server not running for this website');
      }
      
      const internalPort = website.portNumber;
      const internalUrl = `http://localhost:${internalPort}`;

      this.logger.log(`🔄 Proxying request for website ${websiteId} to internal port ${internalPort}`);
      this.logger.log(`📊 Website details:`, {
        id: website.id,
        name: website.name,
        type: website.type,
        buildStatus: website.buildStatus,
        portNumber: website.portNumber,
        previewUrl: website.previewUrl
      });

      // Forward the request to the internal Vite server
      try {
        // Forward query params if present
        const urlWithQuery = Object.keys(query).length > 0
          ? `${internalUrl}/?${new URLSearchParams(query).toString()}`
          : internalUrl;
        
        this.logger.log(`🌐 Making request to: ${urlWithQuery}`);
        
        // Forward relevant headers (excluding auth headers)
        const headersToForward: Record<string, string> = {};
        const excludeHeaders = ['authorization', 'cookie', 'x-api-key', 'x-user-token'];
        
        Object.keys(req.headers).forEach(key => {
          if (!excludeHeaders.includes(key.toLowerCase())) {
            headersToForward[key] = req.headers[key];
          }
        });

        this.logger.log(`📋 Forwarding headers:`, Object.keys(headersToForward));

        const response = await firstValueFrom(
          this.httpService.get(urlWithQuery, { 
            responseType: 'stream',
            headers: headersToForward,
            timeout: 10000 // 10 second timeout
          })
        );
        
        this.logger.log(`✅ Received response from internal server: ${response.status}`);
        this.logger.log(`📋 Response headers:`, Object.keys(response.headers));
        
        // Forward response headers (excluding security headers)
        const excludeResponseHeaders = ['x-frame-options', 'content-security-policy'];
        if (response.headers) {
          Object.keys(response.headers).forEach(key => {
            if (!excludeResponseHeaders.includes(key.toLowerCase())) {
              res.set(key, response.headers[key]);
            }
          });
        }
        
        // Stream the response
        if (response.data) {
          response.data.pipe(res);
          this.logger.log(`✅ Successfully proxied request for website ${websiteId}`);
        } else {
          this.logger.error(`❌ No response data from internal server for website ${websiteId}`);
          res.status(500).send('No response data from preview server');
        }
      } catch (proxyError: any) {
        this.logger.error(`❌ Error proxying preview request for website ${websiteId}: ${proxyError.message}`);
        this.logger.error(`📊 Proxy error details:`, {
          code: proxyError.code,
          errno: proxyError.errno,
          syscall: proxyError.syscall,
          address: proxyError.address,
          port: proxyError.port,
          stack: proxyError.stack
        });
        
        // Check if it's a connection error (server not running)
        if (proxyError.code === 'ECONNREFUSED' || proxyError.message.includes('connect')) {
          this.logger.error(`❌ Connection refused to ${internalUrl} - server not running`);
          return res.status(503).send('Preview server is not running. Please restart the website.');
        }
        
        // Check if it's a timeout
        if (proxyError.code === 'ECONNABORTED' || proxyError.message.includes('timeout')) {
          this.logger.error(`❌ Request timeout to ${internalUrl}`);
          return res.status(504).send('Preview server request timed out. Please try again.');
        }
        
        // Check if it's a DNS error
        if (proxyError.code === 'ENOTFOUND') {
          this.logger.error(`❌ DNS resolution failed for ${internalUrl}`);
          return res.status(503).send('Preview server host not found. Please restart the website.');
        }
        
        res.status(500).send('Error proxying preview request');
      }
    } catch (error: any) {
      this.logger.error(`❌ Error in proxy endpoint for website ${websiteId}: ${error.message}`);
      this.logger.error(`📊 Error stack:`, error.stack);
      res.status(500).send('Internal server error');
    }
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWebsiteDto: UpdateWebsiteDto,
    @CurrentUser() user: any,
  ) {
    const adminId = user.userId || user.id;
    return this.websiteBuilderService.updateWebsite(id, updateWebsiteDto, adminId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    return this.websiteBuilderService.deleteWebsite(id, adminId);
  }

  @Post(':id/ai-edit')
  aiEdit(
    @Param('id') id: string,
    @Body() aiEditDto: AiEditDto,
    @CurrentUser() user: any,
  ) {
    const adminId = user.userId || user.id;
    return this.websiteBuilderService.aiEditWebsite(id, aiEditDto, adminId);
  }



  @Get(':id/changes')
  getChangeHistory(@Param('id') id: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    return this.websiteBuilderService.getChangeHistory(id, adminId);
  }

  @Post(':id/changes/:changeId/revert')
  revertChange(
    @Param('id') id: string,
    @Param('changeId') changeId: string,
    @CurrentUser() user: any,
  ) {
    const adminId = user.userId || user.id;
    return this.websiteBuilderService.revertChange(id, changeId, adminId);
  }

  @Get(':id/build-status')
  getBuildStatus(@Param('id') id: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    return this.websiteBuilderService.getBuildStatus(id, adminId);
  }

  @Post(':id/stop')
  stopWebsite(@Param('id') id: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    return this.websiteBuilderService.stopWebsite(id, adminId);
  }

  @Post(':id/restart')
  restartWebsite(@Param('id') id: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    return this.websiteBuilderService.restartWebsite(id, adminId);
  }

  // Queue Management Endpoints

  @Get('user/queue')
  async getUserQueue(@CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    const jobs = await this.buildQueueService.getUserJobs(adminId);
    const stats = await this.buildQueueService.getQueueStats();
    
    return {
      jobs,
      stats,
    };
  }

  @Get('user/notifications')
  async getUserNotifications(@CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    return await this.notificationService.getUserNotifications(adminId);
  }

  @Get('user/notifications/unread')
  async getUnreadNotifications(@CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    return await this.notificationService.getUnreadNotifications(adminId);
  }

  @Get('user/notifications/unread-count')
  async getUnreadCount(@CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    return { count: await this.notificationService.getUnreadCount(adminId) };
  }

  @Patch('user/notifications/:id/read')
  async markNotificationAsRead(
    @Param('id') notificationId: string,
    @CurrentUser() user: any,
  ) {
    const adminId = user.userId || user.id;
    await this.notificationService.markAsRead(notificationId, adminId);
    return { success: true };
  }

  @Patch('user/notifications/read-all')
  async markAllNotificationsAsRead(@CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    await this.notificationService.markAllAsRead(adminId);
    return { success: true };
  }

  @Delete('user/notifications/:id')
  async deleteNotification(
    @Param('id') notificationId: string,
    @CurrentUser() user: any,
  ) {
    const adminId = user.userId || user.id;
    await this.notificationService.deleteNotification(notificationId, adminId);
    return { success: true };
  }

  @Get('user/queue/stream')
  async streamQueueUpdates(@CurrentUser() user: any, @Res() res: Response) {
    const adminId = user.userId || user.id;
    await this.realTimeNotificationService.handleSSEConnection(adminId, res);
  }

  @Get('jobs/:id')
  async getJob(@Param('id') jobId: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    const job = await this.buildQueueService.getJob(jobId);
    
    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (job.userId !== adminId) {
      throw new BadRequestException('Unauthorized to access this job');
    }

    return job;
  }

  @Get('jobs/:id/queue-position')
  async getJobQueuePosition(@Param('id') jobId: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    const job = await this.buildQueueService.getJob(jobId);
    
    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (job.userId !== adminId) {
      throw new BadRequestException('Unauthorized to access this job');
    }

    const position = await this.buildQueueService.getQueuePosition(jobId);
    return { position };
  }

  @Delete('jobs/:id')
  async cancelJob(@Param('id') jobId: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    await this.buildQueueService.cancelJob(jobId, adminId);
    
    // Send cancellation notification
    const job = await this.buildQueueService.getJob(jobId);
    if (job) {
      await this.notificationService.createBuildNotification(
        adminId,
        jobId,
        'build_cancelled',
        (job as any).website?.name || 'Unknown Website',
      );
    }

    return { success: true };
  }

  @Post('jobs/:id/retry')
  async retryJob(@Param('id') jobId: string, @CurrentUser() user: any) {
    const adminId = user.userId || user.id;
    const job = await this.buildQueueService.getJob(jobId);
    
    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (job.userId !== adminId) {
      throw new BadRequestException('Unauthorized to retry this job');
    }

    if (job.status !== 'failed') {
      throw new BadRequestException('Only failed jobs can be retried');
    }

    // Create a new job with the same parameters
    const newJobId = await this.buildQueueService.enqueueJob({
      websiteId: job.websiteId,
      userId: adminId,
      priority: job.priority,
    });

    return { 
      success: true, 
      newJobId,
      message: 'Job queued for retry',
    };
  }

  @Get('queue/stats')
  async getQueueStats() {
    return await this.buildQueueService.getQueueStats();
  }

  @Get('queue/workers')
  async getActiveWorkers() {
    const workers = this.buildWorkerService.getActiveWorkers();
    return Array.from(workers.entries()).map(([jobId, worker]) => ({
      jobId,
      status: worker.status,
      startTime: worker.startTime,
    }));
  }

  @Get('queue/health')
  async getQueueHealth() {
    return await this.queueProcessorService.getQueueHealth();
  }

  @Post('queue/trigger')
  async triggerQueueProcessing() {
    await this.queueProcessorService.triggerProcessing();
    return { success: true, message: 'Queue processing triggered' };
  }

  @Get('queue/status')
  async getQueueStatus() {
    return this.queueProcessorService.getProcessingStatus();
  }
} 