import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConversationSummarizerService } from './conversation-summarizer.service';

describe('ConversationSummarizerService', () => {
  let service: ConversationSummarizerService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-api-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationSummarizerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ConversationSummarizerService>(ConversationSummarizerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shouldSummarize', () => {
    it('should return false for conversations with less than 50 messages', () => {
      const shortHistory = Array(49).fill({ role: 'user', content: 'test' });
      expect(service.shouldSummarize(shortHistory)).toBe(false);
    });

    it('should return true for conversations with exactly 50 messages', () => {
      const exactHistory = Array(50).fill({ role: 'user', content: 'test' });
      expect(service.shouldSummarize(exactHistory)).toBe(true);
    });

    it('should return true for conversations with more than 50 messages', () => {
      const longHistory = Array(60).fill({ role: 'user', content: 'test' });
      expect(service.shouldSummarize(longHistory)).toBe(true);
    });

    it('should return false for empty or null history', () => {
      expect(service.shouldSummarize([])).toBe(false);
      expect(service.shouldSummarize(null as any)).toBe(false);
    });
  });

  describe('getMessagesToSummarizeCount', () => {
    it('should return 0 for conversations that do not need summarization', () => {
      const shortHistory = Array(30).fill({ role: 'user', content: 'test' });
      expect(service.getMessagesToSummarizeCount(shortHistory)).toBe(0);
    });

    it('should return 30 for conversations with exactly 50 messages', () => {
      const exactHistory = Array(50).fill({ role: 'user', content: 'test' });
      expect(service.getMessagesToSummarizeCount(exactHistory)).toBe(30);
    });

    it('should return 30 for conversations with more than 50 messages', () => {
      const longHistory = Array(100).fill({ role: 'user', content: 'test' });
      expect(service.getMessagesToSummarizeCount(longHistory)).toBe(30);
    });
  });

  describe('processConversationSummarization', () => {
    it('should return original history for conversations with less than 50 messages', async () => {
      const shortHistory = Array(30).fill({ role: 'user', content: 'test' });
      const result = await service.processConversationSummarization(shortHistory);
      expect(result).toEqual(shortHistory);
    });

    it('should return original history for null or empty history', async () => {
      expect(await service.processConversationSummarization([])).toEqual([]);
      expect(await service.processConversationSummarization(null as any)).toEqual(null);
    });
  });
}); 