import { Controller, Post, Body, Headers, Logger } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { Public } from '../../../auth/decorators/public.decorator';

@Controller('webhook')
@Public()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  async handleWebhook(
    @Body() webhookEventDto: WebhookEventDto,
    @Headers('x-webhook-signature') signature?: string,
  ) {
    this.logger.log(`Webhook received: ${webhookEventDto.type}`);
    
    // Add signature from header if provided
    if (signature) {
      webhookEventDto.signature = signature;
    }
    
    return this.webhooksService.handleWebhook(webhookEventDto);
  }
}
