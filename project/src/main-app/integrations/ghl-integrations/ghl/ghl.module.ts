import { Module } from '@nestjs/common';
import { GhlService } from './ghl.service';

@Module({
  providers: [GhlService],
  exports: [GhlService],
})
export class GhlModule {}
