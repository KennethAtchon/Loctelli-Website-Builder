import { Module } from '@nestjs/common';
import { IntegrationTemplatesService } from './integration-templates.service';
import { IntegrationTemplatesController } from './integration-templates.controller';
import { PrismaModule } from '../../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrationTemplatesController],
  providers: [IntegrationTemplatesService],
  exports: [IntegrationTemplatesService],
})
export class IntegrationTemplatesModule {} 