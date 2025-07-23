import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface MessageHistoryItem {
  from?: string;
  message?: string;
  role?: string;
  content?: string;
  timestamp?: string;
  metadata?: any;
}

interface SummarizedMessage {
  role: string;
  content: string;
  timestamp: string;
  metadata?: any;
}

@Injectable()
export class ConversationSummarizerService {
  private readonly logger = new Logger(ConversationSummarizerService.name);
  private readonly openaiModel = 'gpt-4o-mini';
  private readonly openaiApiKey: string;
  private readonly summarizationThreshold = 50; // Trigger summarization at 50 messages
  private readonly messagesToSummarize = 30; // Summarize first 30 messages

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY') || '';
  }

  /**
   * Check if conversation needs summarization and perform it if needed
   * @param messageHistory Current message history
   * @returns Updated message history with summarization if needed
   */
  async processConversationSummarization(messageHistory: MessageHistoryItem[]): Promise<MessageHistoryItem[]> {
    if (!messageHistory || messageHistory.length < this.summarizationThreshold) {
      return messageHistory;
    }

    this.logger.log(`Conversation reached ${messageHistory.length} messages, triggering summarization`);

    try {
      // Get the first 30 messages to summarize
      const messagesToSummarize = messageHistory.slice(0, this.messagesToSummarize);
      const remainingMessages = messageHistory.slice(this.messagesToSummarize);

      // Create summary
      const summary = await this.createConversationSummary(messagesToSummarize);

      // Create summarized message
      const summarizedMessage: SummarizedMessage = {
        role: 'system',
        content: `[CONVERSATION SUMMARY] ${summary}`,
        timestamp: new Date().toISOString(),
        metadata: { 
          summarized: true, 
          originalMessageCount: this.messagesToSummarize,
          summaryCreatedAt: new Date().toISOString()
        }
      };

      // Return summary message + remaining messages
      const updatedHistory = [summarizedMessage, ...remainingMessages];
      
      this.logger.log(`Summarization completed. Reduced from ${messageHistory.length} to ${updatedHistory.length} messages`);
      
      return updatedHistory;
    } catch (error) {
      this.logger.error('Error during conversation summarization:', error);
      // Return original history if summarization fails
      return messageHistory;
    }
  }

  /**
   * Create a summary of the conversation using OpenAI
   * @param messages Messages to summarize
   * @returns Summary text
   */
  private async createConversationSummary(messages: MessageHistoryItem[]): Promise<string> {
    this.logger.debug(`Creating summary for ${messages.length} messages`);

    // Convert messages to a readable format for summarization
    const conversationText = messages
      .map(msg => {
        const role = msg.role || (msg.from === 'bot' ? 'assistant' : 'user');
        const content = msg.content || msg.message || '';
        return `${role === 'user' ? 'User' : 'Assistant'}: ${content}`;
      })
      .join('\n');

    const summaryPrompt = `Please provide a concise summary of the following conversation. Focus on:
1. Key topics discussed
2. Important decisions or agreements made
3. Any pending questions or unresolved issues
4. The overall tone and context

Keep the summary under 200 words and maintain the essential context for future interactions.

Conversation:
${conversationText}

Summary:`;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.openaiModel,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that creates concise, informative summaries of conversations.'
            },
            {
              role: 'user',
              content: summaryPrompt
            }
          ],
          temperature: 0.3, // Lower temperature for more consistent summaries
          max_tokens: 300,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
        }
      );

      const summary = response.data.choices[0].message.content;
      this.logger.debug(`Summary created: ${summary}`);
      return summary;
    } catch (error) {
      this.logger.error('Error creating conversation summary:', error);
      throw new Error('Failed to create conversation summary');
    }
  }

  /**
   * Check if a conversation needs summarization
   * @param messageHistory Current message history
   * @returns True if summarization is needed
   */
  shouldSummarize(messageHistory: MessageHistoryItem[]): boolean {
    return Boolean(messageHistory && messageHistory.length >= this.summarizationThreshold);
  }

  /**
   * Get the number of messages that would be summarized
   * @param messageHistory Current message history
   * @returns Number of messages to summarize
   */
  getMessagesToSummarizeCount(messageHistory: MessageHistoryItem[]): number {
    if (!this.shouldSummarize(messageHistory)) {
      return 0;
    }
    return Math.min(this.messagesToSummarize, messageHistory.length);
  }
} 