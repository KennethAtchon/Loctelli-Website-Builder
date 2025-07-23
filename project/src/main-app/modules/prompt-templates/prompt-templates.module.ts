import { Module } from '@nestjs/common';
import { PromptTemplatesService } from './prompt-templates.service';
import { PromptTemplatesController } from './prompt-templates.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PromptTemplatesController],
  providers: [PromptTemplatesService],
  exports: [PromptTemplatesService],
})
export class PromptTemplatesModule {} 