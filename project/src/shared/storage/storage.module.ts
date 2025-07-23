import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { R2StorageService } from './r2-storage.service';
import { FileProcessingService } from './file-processing.service';

@Module({
  imports: [ConfigModule],
  providers: [R2StorageService, FileProcessingService],
  exports: [R2StorageService, FileProcessingService],
})
export class StorageModule {} 