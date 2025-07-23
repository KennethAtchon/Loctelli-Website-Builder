import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SalesBotService } from './sales-bot.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private salesBotService: SalesBotService
  ) {}

  async sendMessage(chatMessageDto: ChatMessageDto) {
    const { leadId, content, role = 'user', metadata } = chatMessageDto;
    
    // Find the lead
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, messageHistory: true, strategyId: true, userId: true }
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    // Create the user message object for response
    const userMessage = {
      content,
      role,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    };

    // Generate AI response using SalesBotService (this will handle message history)
    const aiResponse = await this.salesBotService.generateResponse(content, leadId);
    
    // Create the AI response object for response
    const aiMessage = {
      content: aiResponse,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      metadata: { generated: true }
    };

    // Get updated lead data
    const updatedLead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        user: true,
        strategy: true,
      }
    });

    const response = {
      userMessage,
      aiMessage,
      lead: updatedLead
    };

    console.log(`[ChatService] sendMessage response for leadId=${leadId}:`, {
      userMessage: response.userMessage,
      aiMessage: response.aiMessage,
      leadId: response.lead?.id
    });

    return response;
  }

  async getMessageHistory(leadId: number) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { messageHistory: true }
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    const history = lead.messageHistory ? JSON.parse(lead.messageHistory as string) : [];
    console.log(`[ChatService] getMessageHistory for leadId=${leadId}:`, {
      rawMessageHistory: lead.messageHistory,
      parsedHistory: history,
      historyLength: history.length
    });

    return history;
  }

  /**
   * Send a message to a lead identified by customId
   * @param sendMessageDto DTO containing the customId
   * @returns Response with status and message
   */
  async sendMessageByCustomId(sendMessageDto: SendMessageDto) {
    const { customId } = sendMessageDto;
    
    // Find lead by customId
    const lead = await this.prisma.lead.findFirst({
      where: { customId },
    });
    
    if (!lead) {
      throw new NotFoundException(`No lead found with customId ${customId}`);
    }
    
    // Generate a response using an empty string as the message
    // This simulates the behavior of the Python implementation
    const response = await this.generateResponse('', lead.id);
    
    return {
      status: 'success',
      customId,
      message: response
    };
  }
  
  /**
   * Generate a response to a lead message
   * This is a placeholder for the actual AI response generation
   * @param message The message to respond to
   * @param leadId The lead ID
   * @returns The generated response
   */
  private async generateResponse(message: string, leadId: number): Promise<string> {
    // In a real implementation, this would call your AI service
    // For now, we'll return a simple response
    return `Thank you for your message. Our team will get back to you shortly.`;
  }

  /**
   * Handle general chat endpoint that echoes back the received data
   * @param data Any JSON data
   * @returns Object with received data
   */
  async handleGeneralChat(data: any) {
    // Simply echo back the received data like in the Python implementation
    return { received: data };
  }

  async clearMessageHistory(leadId: number) {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        messageHistory: JSON.stringify([]),
        lastMessage: null,
        lastMessageDate: null,
      },
    });
  }
}
