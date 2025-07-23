import { Controller, Post, Body, Get, Param, ParseIntPipe, HttpException, HttpStatus, Patch, Delete, UseGuards, Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly prisma: PrismaService
  ) {}

  @Post('send')
  async sendMessage(@Body() chatMessageDto: ChatMessageDto, @CurrentUser() user) {
    this.logger.log(`💬 Message send attempt for lead ID: ${chatMessageDto.leadId} by user: ${user.email} (ID: ${user.userId})`);
    this.logger.debug(`Message data: ${JSON.stringify(chatMessageDto)}`);
    
    try {
      // Check if the lead belongs to the current user
      this.logger.debug(`Checking lead ownership for lead ID: ${chatMessageDto.leadId}`);
      const lead = await this.prisma.lead.findUnique({
        where: { id: chatMessageDto.leadId },
      });
      
      if (!lead) {
        this.logger.warn(`Message send failed - lead not found: ${chatMessageDto.leadId}`);
        throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
      }
      
      if (user.role !== 'admin' && user.role !== 'super_admin' && lead.userId !== user.userId) {
        this.logger.warn(`Message send failed - access denied for user: ${user.email} on lead: ${chatMessageDto.leadId}`);
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }
      
      this.logger.debug(`Lead ownership verified for user: ${user.email} on lead: ${chatMessageDto.leadId}`);
      const result = await this.chatService.sendMessage(chatMessageDto);
      this.logger.log(`✅ Message sent successfully for lead ID: ${chatMessageDto.leadId} by user: ${user.email}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Message send failed for lead ID: ${chatMessageDto.leadId} by user: ${user.email}`, error.stack);
      throw error;
    }
  }

  @Get('messages/:leadId')
  async getMessages(@Param('leadId', ParseIntPipe) leadId: number, @CurrentUser() user) {
    this.logger.log(`📋 Message history request for lead ID: ${leadId} by user: ${user.email} (ID: ${user.userId})`);
    
    try {
      // Check if the lead belongs to the current user
      this.logger.debug(`Checking lead ownership for lead ID: ${leadId}`);
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });
      
      if (!lead) {
        this.logger.warn(`Message history failed - lead not found: ${leadId}`);
        throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
      }
      
      if (user.role !== 'admin' && user.role !== 'super_admin' && lead.userId !== user.userId) {
        this.logger.warn(`Message history failed - access denied for user: ${user.email} on lead: ${leadId}`);
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }
      
      this.logger.debug(`Lead ownership verified for user: ${user.email} on lead: ${leadId}`);
      const result = await this.chatService.getMessageHistory(leadId);
      this.logger.log(`✅ Message history retrieved successfully for lead ID: ${leadId} by user: ${user.email} - ${result.length} messages`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Message history retrieval failed for lead ID: ${leadId} by user: ${user.email}`, error.stack);
      throw error;
    }
  }

  @Patch('messages/:messageId/read')
  async markMessageAsRead(@Param('messageId') messageId: string, @CurrentUser() user) {
    this.logger.log(`👁️ Mark message as read attempt for message ID: ${messageId} by user: ${user.email}`);
    
    // TODO: Implement message read status tracking
    // This would require adding a messages table to track individual messages
    this.logger.debug(`Mark as read not implemented yet for message ID: ${messageId}`);
    return { message: 'Message marked as read' };
  }

  @Delete('messages/:messageId')
  async deleteMessage(@Param('messageId') messageId: string, @CurrentUser() user) {
    this.logger.log(`🗑️ Delete message attempt for message ID: ${messageId} by user: ${user.email}`);
    
    // TODO: Implement message deletion
    // This would require adding a messages table to track individual messages
    this.logger.debug(`Delete message not implemented yet for message ID: ${messageId}`);
    return { message: 'Message deleted' };
  }

  @Get('unread-count/:leadId')
  async getUnreadMessagesCount(@Param('leadId', ParseIntPipe) leadId: number, @CurrentUser() user) {
    this.logger.log(`📊 Unread count request for lead ID: ${leadId} by user: ${user.email}`);
    
    try {
      // Check if the lead belongs to the current user
      this.logger.debug(`Checking lead ownership for lead ID: ${leadId}`);
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });
      
      if (!lead) {
        this.logger.warn(`Unread count failed - lead not found: ${leadId}`);
        throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
      }
      
      if (user.role !== 'admin' && user.role !== 'super_admin' && lead.userId !== user.userId) {
        this.logger.warn(`Unread count failed - access denied for user: ${user.email} on lead: ${leadId}`);
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }
      
      // TODO: Implement unread count logic
      // This would require adding a messages table to track individual messages
      this.logger.debug(`Unread count not implemented yet for lead ID: ${leadId}`);
      return 0;
    } catch (error) {
      this.logger.error(`❌ Unread count failed for lead ID: ${leadId} by user: ${user.email}`, error.stack);
      throw error;
    }
  }

  @Patch('mark-all-read/:leadId')
  async markAllAsRead(@Param('leadId', ParseIntPipe) leadId: number, @CurrentUser() user) {
    this.logger.log(`👁️ Mark all as read attempt for lead ID: ${leadId} by user: ${user.email}`);
    
    try {
      // Check if the lead belongs to the current user
      this.logger.debug(`Checking lead ownership for lead ID: ${leadId}`);
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });
      
      if (!lead) {
        this.logger.warn(`Mark all as read failed - lead not found: ${leadId}`);
        throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
      }
      
      if (user.role !== 'admin' && user.role !== 'super_admin' && lead.userId !== user.userId) {
        this.logger.warn(`Mark all as read failed - access denied for user: ${user.email} on lead: ${leadId}`);
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }
      
      // TODO: Implement mark all as read logic
      // This would require adding a messages table to track individual messages
      this.logger.debug(`Mark all as read not implemented yet for lead ID: ${leadId}`);
      return { message: 'All messages marked as read' };
    } catch (error) {
      this.logger.error(`❌ Mark all as read failed for lead ID: ${leadId} by user: ${user.email}`, error.stack);
      throw error;
    }
  }

  @Post('send_message')
  @Public()
  async sendMessageByCustomId(@Body() sendMessageDto: SendMessageDto) {
    this.logger.log(`💬 Public message send attempt for custom ID: ${sendMessageDto.customId}`);
    this.logger.debug(`Public message data: ${JSON.stringify(sendMessageDto)}`);
    
    try {
      const result = await this.chatService.sendMessageByCustomId(sendMessageDto);
      this.logger.log(`✅ Public message sent successfully for custom ID: ${sendMessageDto.customId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Public message send failed for custom ID: ${sendMessageDto.customId}`, error.stack);
      throw error;
    }
  }

  @Post('general')
  @Public()
  async generalChatEndpoint(@Body() data: any) {
    this.logger.log(`💬 General chat endpoint request`);
    this.logger.debug(`General chat data: ${JSON.stringify(data)}`);
    
    try {
      const result = await this.chatService.handleGeneralChat(data);
      this.logger.log(`✅ General chat handled successfully`);
      return result;
    } catch (error) {
      this.logger.error(`❌ General chat failed`, error.stack);
      throw error;
    }
  }

  @Delete('messages/lead/:leadId')
  async clearLeadMessages(@Param('leadId', ParseIntPipe) leadId: number, @CurrentUser() user) {
    this.logger.log(`🗑️ Clear chat history attempt for lead ID: ${leadId} by user: ${user.email}`);
    
    try {
      // Check if the lead belongs to the current user
      this.logger.debug(`Checking lead ownership for lead ID: ${leadId}`);
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });
      if (!lead) {
        this.logger.warn(`Clear chat history failed - lead not found: ${leadId}`);
        throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
      }
      if (user.role !== 'admin' && user.role !== 'super_admin' && lead.userId !== user.userId) {
        this.logger.warn(`Clear chat history failed - access denied for user: ${user.email} on lead: ${leadId}`);
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }
      
      this.logger.debug(`Lead ownership verified for user: ${user.email} on lead: ${leadId}`);
      await this.chatService.clearMessageHistory(leadId);
      this.logger.log(`✅ Chat history cleared successfully for lead ID: ${leadId} by user: ${user.email}`);
      return { message: 'Chat history cleared' };
    } catch (error) {
      this.logger.error(`❌ Clear chat history failed for lead ID: ${leadId} by user: ${user.email}`, error.stack);
      throw error;
    }
  }
}
