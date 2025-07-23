import { Injectable, Logger, HttpStatus, HttpException } from '@nestjs/common';
import { WebhookEventDto } from './dto/webhook-event.dto';
import { ContactCreatedDto } from './dto/contact-created.dto';
import { OutboundMessageDto } from './dto/outbound-message.dto';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { SalesBotService } from '../../../modules/chat/sales-bot.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly useDummyResponses: boolean = true; // Hardcoded to use dummy responses
  
  constructor(
    private prisma: PrismaService,
    private salesBotService: SalesBotService
  ) {
    this.logger.log(`WebhooksService initialized with useDummyResponses=${this.useDummyResponses}`);
  }

  async handleWebhook(webhookEventDto: WebhookEventDto) {
    const { type, source, payload } = webhookEventDto;
    
    this.logger.log(`Received webhook: ${type} from ${source}`);
    
    // Process webhook based on type and source
    switch (type) {
      case 'contact.created':
        return this.handleContactCreated(payload);
      case 'outbound.message':
        return this.handleOutboundMessage(payload);
      default:
        this.logger.warn(`Unhandled webhook type: ${type}`);
        return { status: 'unhandled', message: `Webhook type ${type} not implemented` };
    }
  }

  /**
   * Handle HighLevel Contact Created Webhook
   * Docs: https://highlevel.stoplight.io/docs/integrations/4974a1cf9b56d-contact
   */
    private async handleContactCreated(payload: any) {
    this.logger.log('Processing contact.created webhook');
    
    try {
      const contactData = payload as ContactCreatedDto;
      this.logger.log(`Processing contact.created webhook for locationId: ${contactData.locationId}`);
      
      // First, find the integration by locationId (GHL Subaccount ID)
      const integration = await this.prisma.integration.findFirst({
        where: {
          config: {
            path: ['locationId'],
            equals: contactData.locationId
          }
        },
        include: {
          subAccount: true
        }
      });
      
      if (!integration) {
        throw new HttpException(
          { status: 'error', message: `No integration found with GHL locationId (subaccount) ${contactData.locationId}` },
          HttpStatus.NOT_FOUND
        );
      }
      
      this.logger.log(`Found integration: ${integration.name} for subaccount: ${integration.subAccount.name}`);
      
      // Get the first user from the integration's subaccount
      const user = await this.prisma.user.findFirst({
        where: { 
          subAccountId: integration.subAccountId,
          role: { not: 'admin' } // Exclude admin users
        },
        orderBy: { id: 'asc' } // Get the first user by ID
      });
      
      if (!user) {
        throw new HttpException(
          { status: 'error', message: `No user found in subaccount ${integration.subAccount.name} for GHL locationId ${contactData.locationId}` },
          HttpStatus.NOT_FOUND
        );
      }
      
      this.logger.log(`Found user: ${user.name} (ID: ${user.id}) in subaccount: ${integration.subAccount.name}`);
      
      const userId = user.id;
      
      // Get the first strategy for this user
      const strategy = await this.prisma.strategy.findFirst({
        where: { userId }
      });
      const strategyId = strategy?.id || 1;
      
      if (strategy) {
        this.logger.log(`Found strategy: ${strategy.name} (ID: ${strategy.id}) for user: ${user.name}`);
      } else {
        this.logger.warn(`No strategy found for user: ${user.name}, using default strategy ID: 1`);
      }
      
      // Create a new Lead with the found user_id and their first strategy
      const name = contactData.name || 
        ((contactData.firstName && contactData.lastName) ? 
          `${contactData.firstName} ${contactData.lastName}` : 
          contactData.firstName || contactData.lastName || 'Unknown');
      
      const lead = await this.prisma.lead.create({
        data: {
          userId,
          strategyId,
          name,
          customId: contactData.id,
          messageHistory: [],
          status: 'lead',
          subAccountId: integration.subAccountId
        }
      });
      
      this.logger.log(`Created lead: ${lead.name} (ID: ${lead.id}) for GHL contact: ${contactData.id}`);
      
      return {
        status: 'lead_created',
        lead: {
          id: lead.id,
          userId: lead.userId,
          strategyId: lead.strategyId,
          name: lead.name,
          customId: lead.customId,
          status: lead.status
        }
      };
    } catch (error) {
      this.logger.error(`Error processing contact.created webhook: ${error.message}`);
      throw new HttpException(
        { status: 'error', message: error.message, data: payload },
        HttpStatus.BAD_REQUEST
      );
    }
  }
  
  /**
   * Handle HighLevel Outbound Message Webhook
   * Handles outbound message events (SMS, Call, Voicemail, Email, etc.)
   */
  private async handleOutboundMessage(payload: any) {
    this.logger.log('Processing outbound.message webhook');
    
    try {
      const messageData = payload as OutboundMessageDto;
      
      // Only process specific message types
      const allowedMessageTypes = ['SMS', 'Email', 'Live Chat', 'GMB'];
      if (!messageData.messageType || !allowedMessageTypes.includes(messageData.messageType)) {
        return {
          status: 'ignored',
          reason: `Not a supported message type: ${messageData.messageType}`
        };
      }
      
      // Find lead by contactId (maps to customId in Lead model)
      const lead = await this.prisma.lead.findFirst({
        where: { customId: messageData.contactId }
      });
      
      if (!lead) {
        throw new HttpException(
          { status: 'error', message: `No lead found with GHL contactId ${messageData.contactId}` },
          HttpStatus.NOT_FOUND
        );
      }
      
      // Generate a response using the message body from the payload
      const message = messageData.body || '';
      // This would call your AI response generation service
      const response = await this.generateResponse(message, lead.id);
      
      return {
        status: 'success',
        message: response
      };
    } catch (error) {
      this.logger.error(`Error processing outbound.message webhook: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        { status: 'error', message: error.message, data: payload },
        HttpStatus.BAD_REQUEST
      );
    }
  }
  
  /**
   * Generate a response to a lead message
   * This method can use either dummy data or the real AI service based on configuration
   * @param message The message to respond to
   * @param leadId The lead ID
   * @returns The generated response
   */
  private async generateResponse(message: string, leadId: number): Promise<string> {
    this.logger.log(`Generating response for lead ${leadId} to message: "${message}"`);
    
    if (this.useDummyResponses) {
      this.logger.log('Using dummy response mode');
      return this.generateDummyResponse(message, leadId);
    } else {
      this.logger.log('Using real AI response mode');
      return this.generateRealResponse(message, leadId);
    }
  }

  /**
   * Generate a dummy response for testing purposes
   * @param message The message to respond to
   * @param leadId The lead ID
   * @returns A dummy response
   */
  private async generateDummyResponse(message: string, leadId: number): Promise<string> {
    const dummyResponses = [
      `Thank you for your message: "${message}". Our team will get back to you shortly.`,
      `Hi there! Thanks for reaching out. We've received your message and will respond soon.`,
      `Hello! We appreciate your message. Someone from our team will contact you shortly.`,
      `Thanks for contacting us! We're reviewing your message and will get back to you soon.`,
      `Hi! We've got your message and are working on a response. Please stay tuned!`
    ];
    
    // Use leadId to consistently return the same response for the same lead
    const responseIndex = leadId % dummyResponses.length;
    return dummyResponses[responseIndex];
  }

  /**
   * Generate a real AI response using the SalesBotService
   * @param message The message to respond to
   * @param leadId The lead ID
   * @returns The AI-generated response
   */
  private async generateRealResponse(message: string, leadId: number): Promise<string> {
    try {
      this.logger.log(`Calling SalesBotService.generateResponse for leadId=${leadId}`);
      const response = await this.salesBotService.generateResponse(message, leadId);
      this.logger.log(`SalesBotService response generated successfully for leadId=${leadId}`);
      return response;
    } catch (error) {
      this.logger.error(`Error generating real response for leadId=${leadId}: ${error.message}`);
      // Fallback to dummy response if real AI fails
      return this.generateDummyResponse(message, leadId);
    }
  }
}
