import { Controller, Post, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ContactCreatedDto } from './dto/contact-created.dto';
import { OutboundMessageDto } from './dto/outbound-message.dto';
import { Public } from '../../../auth/decorators/public.decorator';

@Controller('highlevel/webhook')
@Public()
export class HighLevelWebhooksController {
  private readonly logger = new Logger(HighLevelWebhooksController.name);
  
  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * HighLevel Contact Created Webhook endpoint
   * Docs: https://highlevel.stoplight.io/docs/integrations/4974a1cf9b56d-contact
   */
  @Post('contactcreated')
  @HttpCode(HttpStatus.OK)
  async contactCreatedWebhook(@Body() payload: ContactCreatedDto) {
    this.logger.log('Received contact created webhook');
    
    return this.webhooksService.handleWebhook({
      type: 'contact.created',
      source: 'highlevel',
      payload
    });
  }

  /**
   * HighLevel Outbound Message Webhook endpoint
   * Handles outbound message events (SMS, Call, Voicemail, Email, etc.)
   */
  @Post('outboundmessage')
  @HttpCode(HttpStatus.OK)
  async outboundMessageWebhook(@Body() payload: OutboundMessageDto) {
    this.logger.log('Received outbound message webhook');
    
    return this.webhooksService.handleWebhook({
      type: 'outbound.message',
      source: 'highlevel',
      payload
    });
  }
}
