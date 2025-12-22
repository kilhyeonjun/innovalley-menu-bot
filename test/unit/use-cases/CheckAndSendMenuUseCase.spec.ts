import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CheckAndSendMenuUseCase } from '@application/use-cases/CheckAndSendMenuUseCase';
import { ICrawlerService, ISlackService } from '@domain/services';
import { IMenuPostRepository, IDeliveryHistoryRepository } from '@domain/repositories';
import { Result } from '@shared/types/Result';
import { CrawlingError } from '@shared/errors/DomainError';
import { MenuPostBuilder, DeliveryHistoryBuilder } from '../../fixtures/builders';

describe('CheckAndSendMenuUseCase', () => {
  let useCase: CheckAndSendMenuUseCase;
  let mockCrawlerService: ICrawlerService;
  let mockSlackService: ISlackService;
  let mockMenuPostRepository: IMenuPostRepository;
  let mockDeliveryHistoryRepository: IDeliveryHistoryRepository;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-12-18T09:00:00')); // 수요일

    mockCrawlerService = {
      crawlLatestMenu: vi.fn(),
    };

    mockSlackService = {
      sendMenuMessage: vi.fn(),
      sendEphemeralMenu: vi.fn(),
    };

    mockMenuPostRepository = {
      save: vi.fn(),
      findByPostId: vi.fn(),
      findLatest: vi.fn(),
      findThisWeek: vi.fn(),
      findByDateRange: vi.fn(),
    };

    mockDeliveryHistoryRepository = {
      save: vi.fn(),
      findByPostIdAndChannel: vi.fn(),
      findByDateRange: vi.fn(),
      findLatestByChannel: vi.fn(),
    };

    useCase = new CheckAndSendMenuUseCase(
      mockCrawlerService,
      mockSlackService,
      mockMenuPostRepository,
      mockDeliveryHistoryRepository
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('execute', () => {
    const channel = 'C1234567890';

    it('이미 발송된 주차면 skip한다', async () => {
      const thisWeekPost = new MenuPostBuilder()
        .withPostId('this-week-post')
        .thisWeek()
        .build();
      const existingHistory = new DeliveryHistoryBuilder()
        .withPostId('this-week-post')
        .withChannel(channel)
        .build();

      vi.mocked(mockMenuPostRepository.findThisWeek).mockResolvedValue(thisWeekPost);
      vi.mocked(mockDeliveryHistoryRepository.findByPostIdAndChannel).mockResolvedValue(
        existingHistory
      );

      const result = await useCase.execute({ channel });

      expect(result.isOk()).toBe(true);
      expect(result.value.skipped).toBe(true);
      expect(result.value.skipReason).toContain('이미 발송됨');
      expect(mockCrawlerService.crawlLatestMenu).not.toHaveBeenCalled();
    });

    it('새 게시물을 크롤링하고 발송한다', async () => {
      const newPost = new MenuPostBuilder()
        .withPostId('new-post')
        .thisWeek()
        .build();

      vi.mocked(mockMenuPostRepository.findThisWeek).mockResolvedValue(null);
      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.ok({ post: newPost, isNew: true })
      );
      vi.mocked(mockDeliveryHistoryRepository.findByPostIdAndChannel).mockResolvedValue(null);
      vi.mocked(mockSlackService.sendMenuMessage).mockResolvedValue(
        Result.ok({ messageTs: '123.456', channel })
      );
      vi.mocked(mockMenuPostRepository.save).mockResolvedValue(newPost);
      vi.mocked(mockDeliveryHistoryRepository.save).mockImplementation(
        async (h) => h
      );

      const result = await useCase.execute({ channel, maxRetries: 1 });

      expect(result.isOk()).toBe(true);
      expect(result.value.success).toBe(true);
      expect(result.value.attemptCount).toBe(1);
      expect(result.value.sentAt).toBeDefined();
      expect(mockSlackService.sendMenuMessage).toHaveBeenCalled();
    });

    it('이번 주 게시물이 아니면 재시도한다', async () => {
      const lastWeekPost = new MenuPostBuilder()
        .withPostId('last-week-post')
        .lastWeek()
        .build();

      vi.mocked(mockMenuPostRepository.findThisWeek).mockResolvedValue(null);
      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.ok({ post: lastWeekPost, isNew: false })
      );

      // 1회만 시도하도록 설정 (재시도 없이 실패)
      const result = await useCase.execute({
        channel,
        maxRetries: 1,
        retryIntervalMs: 10,
      });

      expect(result.isOk()).toBe(true);
      expect(result.value.success).toBe(false);
      expect(result.value.skipReason).toContain('찾지 못함');
    });

    it('크롤링 실패 시 재시도 후 에러 반환', async () => {
      const crawlingError = new CrawlingError('네트워크 오류');

      vi.mocked(mockMenuPostRepository.findThisWeek).mockResolvedValue(null);
      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.fail(crawlingError)
      );

      const result = await useCase.execute({
        channel,
        maxRetries: 1,
        retryIntervalMs: 10,
      });

      expect(result.isError()).toBe(true);
      expect(result.error).toBe(crawlingError);
    });

    it('크롤링 중 발송된 게시물 발견 시 skip', async () => {
      const thisWeekPost = new MenuPostBuilder()
        .withPostId('concurrent-post')
        .thisWeek()
        .build();
      const history = new DeliveryHistoryBuilder()
        .withPostId('concurrent-post')
        .withChannel(channel)
        .build();

      vi.mocked(mockMenuPostRepository.findThisWeek).mockResolvedValue(null);
      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.ok({ post: thisWeekPost, isNew: false })
      );
      vi.mocked(mockDeliveryHistoryRepository.findByPostIdAndChannel).mockResolvedValue(
        history
      );

      const result = await useCase.execute({ channel, maxRetries: 1 });

      expect(result.isOk()).toBe(true);
      expect(result.value.skipped).toBe(true);
      expect(result.value.skipReason).toContain('이미 발송된 게시물');
    });
  });
});
