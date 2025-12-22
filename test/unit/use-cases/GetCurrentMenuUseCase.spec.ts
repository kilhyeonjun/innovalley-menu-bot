import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GetCurrentMenuUseCase } from '@application/use-cases/GetCurrentMenuUseCase';
import { ICrawlerService, ISlackService } from '@domain/services';
import { IMenuPostRepository } from '@domain/repositories';
import { Result } from '@shared/types/Result';
import { CrawlingError, NotFoundError } from '@shared/errors/DomainError';
import { MenuPostBuilder } from '../../fixtures/builders';

describe('GetCurrentMenuUseCase', () => {
  let useCase: GetCurrentMenuUseCase;
  let mockCrawlerService: ICrawlerService;
  let mockSlackService: ISlackService;
  let mockMenuPostRepository: IMenuPostRepository;

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

    useCase = new GetCurrentMenuUseCase(
      mockCrawlerService,
      mockSlackService,
      mockMenuPostRepository
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('execute', () => {
    const criteria = {
      userId: 'U1234567890',
      channel: 'C1234567890',
    };

    it('캐시된 게시물이 있으면 즉시 반환한다', async () => {
      const cachedPost = new MenuPostBuilder()
        .withPostId('cached-post')
        .thisWeek()
        .build();

      vi.mocked(mockMenuPostRepository.findThisWeek).mockResolvedValue(cachedPost);
      vi.mocked(mockSlackService.sendEphemeralMenu).mockResolvedValue(
        Result.ok({ messageTs: '123.456', channel: criteria.channel })
      );

      const result = await useCase.execute(criteria);

      expect(result.isOk()).toBe(true);
      expect(result.value.source).toBe('cache');
      expect(result.value.post.postId.value).toBe('cached-post');
      expect(mockSlackService.sendEphemeralMenu).toHaveBeenCalledWith({
        menuPost: cachedPost,
        channel: criteria.channel,
        userId: criteria.userId,
      });
      expect(mockCrawlerService.crawlLatestMenu).not.toHaveBeenCalled();
    });

    it('캐시가 없으면 크롤링 후 반환한다', async () => {
      const crawledPost = new MenuPostBuilder()
        .withPostId('crawled-post')
        .thisWeek()
        .build();

      vi.mocked(mockMenuPostRepository.findThisWeek).mockResolvedValue(null);
      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.ok({ post: crawledPost, isNew: true })
      );
      vi.mocked(mockMenuPostRepository.save).mockResolvedValue(crawledPost);
      vi.mocked(mockSlackService.sendEphemeralMenu).mockResolvedValue(
        Result.ok({ messageTs: '123.456', channel: criteria.channel })
      );

      const result = await useCase.execute(criteria);

      expect(result.isOk()).toBe(true);
      expect(result.value.source).toBe('crawl');
      expect(result.value.post.postId.value).toBe('crawled-post');
      expect(mockMenuPostRepository.save).toHaveBeenCalled();
    });

    it('이번 주 게시물이 아니면 최근 게시물을 반환한다', async () => {
      const lastWeekPost = new MenuPostBuilder()
        .withPostId('last-week')
        .lastWeek()
        .build();
      const latestPost = new MenuPostBuilder()
        .withPostId('latest')
        .lastWeek()
        .build();

      vi.mocked(mockMenuPostRepository.findThisWeek).mockResolvedValue(null);
      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.ok({ post: lastWeekPost, isNew: false })
      );
      vi.mocked(mockMenuPostRepository.findLatest).mockResolvedValue(latestPost);
      vi.mocked(mockSlackService.sendEphemeralMenu).mockResolvedValue(
        Result.ok({ messageTs: '123.456', channel: criteria.channel })
      );

      const result = await useCase.execute(criteria);

      expect(result.isOk()).toBe(true);
      expect(result.value.source).toBe('cache');
      expect(result.value.post.postId.value).toBe('latest');
    });

    it('이번 주 게시물도 없고 최근 게시물도 없으면 NotFoundError', async () => {
      const lastWeekPost = new MenuPostBuilder()
        .withPostId('last-week')
        .lastWeek()
        .build();

      vi.mocked(mockMenuPostRepository.findThisWeek).mockResolvedValue(null);
      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.ok({ post: lastWeekPost, isNew: false })
      );
      vi.mocked(mockMenuPostRepository.findLatest).mockResolvedValue(null);

      const result = await useCase.execute(criteria);

      expect(result.isError()).toBe(true);
      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.message).toContain('찾을 수 없습니다');
    });

    it('크롤링 실패 시 에러 반환', async () => {
      const crawlingError = new CrawlingError('네트워크 오류');

      vi.mocked(mockMenuPostRepository.findThisWeek).mockResolvedValue(null);
      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.fail(crawlingError)
      );

      const result = await useCase.execute(criteria);

      expect(result.isError()).toBe(true);
      expect(result.error).toBe(crawlingError);
    });
  });
});
