import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    this.logger.log('🏠 Root endpoint accessed');
    const result = this.appService.getHello();
    this.logger.debug(`Root endpoint response: ${result}`);
    return result;
  }
}
