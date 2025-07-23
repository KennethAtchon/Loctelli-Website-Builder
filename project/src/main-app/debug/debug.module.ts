import { Module } from '@nestjs/common';
import { DebugController } from './debug.controller';
import { AppCacheModule } from '../infrastructure/cache/cache.module';

@Module({
  imports: [AppCacheModule],
  controllers: [DebugController],
})
export class DebugModule {} 