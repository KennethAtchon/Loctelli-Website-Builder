import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PromptHelperService } from './prompt-helper.service';
import { PromptTemplatesService } from '../prompt-templates/prompt-templates.service';
import { BookingHelperService } from '../bookings/booking-helper.service';
import { ConversationSummarizerService } from './conversation-summarizer.service';
import axios from 'axios';

interface ChatMessage {
  role: string;
  content: string;
}

// Updated interface to match PromptHelperService
interface MessageHistoryItem {
  from?: string;
  message?: string;
  role?: string;
  content?: string;
  timestamp?: string;
  metadata?: any;
}

@Injectable()
export class SalesBotService implements OnModuleInit {
  private readonly logger = new Logger(SalesBotService.name);
  private readonly openaiModel = 'gpt-4o-mini';
  private readonly temperature = 0.7;
  private readonly maxHistory = 20;
  private readonly openaiApiKey: string;
  
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private promptHelper: PromptHelperService,
    private promptTemplatesService: PromptTemplatesService,
    private bookingHelper: BookingHelperService,
    private conversationSummarizer: ConversationSummarizerService
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  async onModuleInit() {
    this.logger.log('Sales Bot Service initialized');
  }

  // @Cron(CronExpression.EVERY_HOUR)
  // async handleScheduledTasks() {
  //   this.logger.log('Running scheduled sales bot tasks');
  //   await this.processFollowUps();
  // }
  
  /**
   * Generate a response for a lead message
   * @param message The lead's message
   * @param leadId The lead's ID
   * @returns The bot's response
   */
  async generateResponse(message: string, leadId: number): Promise<string> {
    this.logger.log(`[generateResponse] leadId=${leadId}, typeof message=${typeof message}, message=${JSON.stringify(message)}`);
    if (!message || typeof message !== 'string') {
      this.logger.error(`[generateResponse] Invalid message:`, message);
      return 'Invalid message input.';
    }
    this.logger.log(`[generateResponse] message preview: ${message.substring(0, Math.min(50, message.length))}...`);
    
    try {
      // Get lead from database
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId }
      });
      
      if (!lead) {
        this.logger.warn(`No lead found for leadId=${leadId}`);
        return "Sorry, I couldn't find your information.";
      }
      
      // Get user and strategy
      const user = await this.prisma.user.findUnique({
        where: { id: lead.userId }
      });
      
      const strategy = await this.prisma.strategy.findUnique({
        where: { id: lead.strategyId }
      });
      
      // Get message history first (before appending new message)
      const history = lead.messageHistory ? 
        (JSON.parse(lead.messageHistory as string) as MessageHistoryItem[]).slice(-this.maxHistory) : 
        [];
      
      this.logger.debug(`Using history with ${history.length} messages for leadId=${leadId}`);
      
      // Generate prompt with existing history
      const prompt = await this.promptHelper.composePrompt(lead, user, strategy, history);
      
      // Add the latest user message to the prompt
      prompt.push({ role: 'user', content: message });
      
      this.logger.log(`[generateResponse] Final messages array length: ${prompt.length}`);
      this.logger.debug(`[generateResponse] Final messages: ${JSON.stringify(prompt.map(m => ({ role: m.role, contentLength: m.content.length, contentPreview: m.content.substring(0, 50) })))}`);
      
      // Create bot response
      const botResponse = await this.createBotResponse(prompt);
      
      // Append both user message and bot response to history in a single operation
      await this.appendMessagesToHistory(lead, [
        { role: 'user', content: message },
        { role: 'assistant', content: botResponse }
      ]);
      
      // Check for booking confirmation
      if (user && user.bookingEnabled) {
        const booking = await this.bookingHelper.parseAndCreateBooking(botResponse, user.id, leadId);
        if (booking) {
          this.logger.log(`Booking created for userId=${user.id}, leadId=${leadId}: bookingId=${booking.id}`);
        }
      }
      
      this.logger.log(`Response generated for leadId=${leadId}: ${botResponse ? botResponse.substring(0, 50) + '...' : 'undefined'}`);
      return botResponse;
    } catch (error) {
      this.logger.error(`Error generating response for leadId=${leadId}: ${error}`);
      return "An error occurred. Please try again.";
    }
  }

  private async processFollowUps() {
    try {
      this.logger.log('Processing follow-ups for leads');
      
      // Find leads that need follow-up (example logic)
      const leads = await this.prisma.lead.findMany({
        where: {
          // Example: leads with no messages in the last 7 days
          lastMessageDate: {
            lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        } as any, // Type assertion to bypass type checking for dynamic fields
        include: {
          user: true,
          strategy: true
        }
      });
      
      this.logger.log(`Found ${leads.length} leads requiring follow-up`);
      
      // Process each lead
      for (const lead of leads) {
        await this.sendFollowUpMessage(lead);
      }
    } catch (error) {
      this.logger.error('Error processing follow-ups', error);
    }
  }
  
  private async sendFollowUpMessage(lead: any) {
    try {
      this.logger.log(`Sending follow-up to lead ${lead.id}`);
      
      // Example follow-up message
      const message = {
        content: `Hi ${lead.name}, just checking in to see how you're doing.`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        metadata: { automated: true }
      };
      
      // Parse existing messages or initialize empty array
      const existingMessages = lead.messageHistory ? JSON.parse(lead.messageHistory as string) : [];
      
      // Add new message
      existingMessages.push(message);
      
      // Update lead with new message
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          messageHistory: JSON.stringify(existingMessages),
          lastMessage: message.content,
          lastMessageDate: new Date().toISOString(),
        } as any,
      });
      
      this.logger.log(`Follow-up sent to lead ${lead.id}`);
    } catch (error) {
      this.logger.error(`Error sending follow-up to lead ${lead.id}`, error);
    }
  }
  
  /**
   * Append multiple messages to the lead's message history in a single operation
   * @param lead The lead object
   * @param messages Array of messages with role and content
   */
  private async appendMessagesToHistory(lead: any, messages: { role: string; content: string }[]): Promise<void> {
    this.logger.debug(`[appendMessagesToHistory] leadId=${lead.id}, messages_count=${messages.length}`);
    
    // Validate messages
    for (const msg of messages) {
      if (!msg.content || typeof msg.content !== 'string') {
        this.logger.error(`[appendMessagesToHistory] Invalid message:`, msg);
        return;
      }
    }
    
    // Parse existing messages or initialize empty array
    const existingMessages = lead.messageHistory ? 
      JSON.parse(lead.messageHistory as string) : 
      [];
    
    // Add new messages with timestamps
    const newMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date().toISOString()
    }));
    
    existingMessages.push(...newMessages);
    
    // Check if conversation needs summarization
    if (this.conversationSummarizer.shouldSummarize(existingMessages)) {
      this.logger.log(`[appendMessagesToHistory] Conversation reached ${existingMessages.length} messages, processing summarization for leadId=${lead.id}`);
      
      try {
        // Process summarization
        const summarizedHistory = await this.conversationSummarizer.processConversationSummarization(existingMessages);
        
        // Update lead with summarized history
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: {
            messageHistory: JSON.stringify(summarizedHistory),
            lastMessage: messages[messages.length - 1].content,
            lastMessageDate: new Date().toISOString(),
          } as any,
        });
        
        this.logger.log(`Summarization completed for leadId=${lead.id}. History reduced from ${existingMessages.length} to ${summarizedHistory.length} messages`);
      } catch (error) {
        this.logger.error(`Error during summarization for leadId=${lead.id}:`, error);
        
        // Fallback to updating without summarization
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: {
            messageHistory: JSON.stringify(existingMessages),
            lastMessage: messages[messages.length - 1].content,
            lastMessageDate: new Date().toISOString(),
          } as any,
        });
      }
    } else {
      // Update lead with new message history (no summarization needed)
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          messageHistory: JSON.stringify(existingMessages),
          lastMessage: messages[messages.length - 1].content,
          lastMessageDate: new Date().toISOString(),
        } as any,
      });
    }
    
    this.logger.log(`Messages appended to history for leadId=${lead.id}, history_length=${existingMessages.length}`);
  }

  /**
   * Append a message to the lead's message history
   * @param lead The lead object
   * @param fromRole The role of the message sender ('user' or 'bot')
   * @param message The message content
   */
  private async appendMessageToHistory(lead: any, fromRole: string, message: string): Promise<void> {
    this.logger.debug(`[appendMessageToHistory] leadId=${lead.id}, fromRole=${fromRole}, typeof message=${typeof message}, message=${JSON.stringify(message)}`);
    if (!message || typeof message !== 'string') {
      this.logger.error(`[appendMessageToHistory] Invalid message:`, message);
      return;
    }
    this.logger.debug(`[appendMessageToHistory] message preview: ${message.substring(0, Math.min(50, message.length))}...`);
    
    // Convert fromRole to standard role format
    const role = fromRole === 'bot' ? 'assistant' : 'user';
    
    // Use new format with role and content
    const newMessage = { 
      role, 
      content: message,
      timestamp: new Date().toISOString()
    };
    
    // Parse existing messages or initialize empty array
    const existingMessages = lead.messageHistory ? 
      JSON.parse(lead.messageHistory as string) : 
      [];
    
    // Add new message
    existingMessages.push(newMessage);
    
    // Update lead with new message history
    await this.prisma.lead.update({
      where: { id: lead.id },
      data: {
        messageHistory: JSON.stringify(existingMessages),
        lastMessage: message,
        lastMessageDate: new Date().toISOString(),
      } as any,
    });
    
    this.logger.log(`Message appended to history for leadId=${lead.id}, history_length=${existingMessages.length}`);
  }
  
  /**
   * Create a bot response using the OpenAI API
   * @param messages The messages to send to OpenAI
   * @returns The bot's response
   */
  private async createBotResponse(messages: ChatMessage[]): Promise<string> {
    this.logger.log('[createBotResponse] Creating bot response via OpenAI API');
    this.logger.debug(`[createBotResponse] Input messages: ${JSON.stringify(messages.map(m => ({
      role: m.role,
      typeofContent: typeof m.content,
      content: m.content ? m.content.substring(0, Math.min(50, m.content.length)) + '...' : 'undefined',
      rawContent: m.content
    })))}`);
    
    try {
      // Get active template for parameters
      const activeTemplate = await this.promptTemplatesService.getActive();
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.openaiModel,
          messages,
          temperature: activeTemplate.temperature,
          max_tokens: activeTemplate.maxTokens,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
        }
      );
      
      const botResponse = response.data.choices[0].message.content;
      this.logger.log('Bot response generated successfully');
      this.logger.debug(`Bot response: ${botResponse ? botResponse.substring(0, 100) + '...' : 'undefined'}`);
      return botResponse;
    } catch (error) {
      this.logger.error(`OpenAI API error: ${error}`);
      return "Sorry, I'm having trouble responding right now. Please try again later.";
    }
  }
} 