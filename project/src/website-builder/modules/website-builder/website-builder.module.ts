import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WebsiteBuilderService } from './website-builder.service';
import { WebsiteBuilderController } from './website-builder.controller';
import { BuildService } from './build.service';
import { SecurityService } from './security.service';
import { CleanupService } from './cleanup.service';
import { BuildQueueService } from './services/build-queue.service';
import { NotificationService } from './services/notification.service';
import { BuildWorkerService } from './services/build-worker.service';
import { RealTimeNotificationService } from './services/realtime-notification.service';
import { QueueProcessorService } from './services/queue-processor.service';
import { SharedModule } from '../../../shared/shared.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [SharedModule, ScheduleModule.forRoot(), HttpModule],
  controllers: [WebsiteBuilderController],
  providers: [
    WebsiteBuilderService, 
    BuildService, 
    SecurityService, 
    CleanupService,
    BuildQueueService,
    NotificationService,
    BuildWorkerService,
    RealTimeNotificationService,
    QueueProcessorService,
  ],
  exports: [
    WebsiteBuilderService, 
    BuildService, 
    SecurityService, 
    CleanupService,
    BuildQueueService,
    NotificationService,
    BuildWorkerService,
    RealTimeNotificationService,
    QueueProcessorService,
  ],
})
export class WebsiteBuilderSubModule {} 