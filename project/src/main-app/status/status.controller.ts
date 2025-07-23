import { Controller, Get } from '@nestjs/common';
import { StatusService } from './status.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  @Public()
  getSystemStatus() {
    return this.statusService.getStatus();
  }

  @Get('health')
  @Public()
  getHealthCheck() {
    return this.statusService.getHealthStatus();
  }

  @Get('version')
  @Public()
  getVersion() {
    return this.statusService.getVersion();
  }
}
