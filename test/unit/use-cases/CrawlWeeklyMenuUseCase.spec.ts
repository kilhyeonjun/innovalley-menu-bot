import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrawlWeeklyMenuUseCase } from '@application/use-cases/CrawlWeeklyMenuUseCase';
import { ICrawlerService } from '@domain/services';
import { IMenuPostRepository } from '@domain/repositories';
import { MenuPost } from '@domain/entities';
import { Result } from '@shared/types/Result';
import { CrawlingError } from '@shared/errors/DomainError';
import { MenuPostBuilder } from '../../fixtures/builders';

describe('CrawlWeeklyMenuUseCase', () => {
  let useCase: CrawlWeeklyMenuUseCase;
  let mockCrawlerService: ICrawlerService;
  let mockMenuPostRepository: IMenuPostRepository;

  beforeEach(() => {
    mockCrawlerService = {
      crawlLatestMenu: vi.fn(),
    };

    mockMenuPostRepository = {
      save: vi.fn(),
      findByPostId: vi.fn(),
      findLatest: vi.fn(),
      findThisWeek: vi.fn(),
      findByDateRange: vi.fn(),
    };

    useCase = new CrawlWeeklyMenuUseCase(
      mockCrawlerService,
      mockMenuPostRepository
    );
  });

  describe('execute', () => {
    it('새 게시물을 크롤링하고 저장한다', async () => {
      const crawledPost = new MenuPostBuilder()
        .withPostId('new-post-123')
        .build();

      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.ok({ post: crawledPost, isNew: true })
      );
      vi.mocked(mockMenuPostRepository.findByPostId).mockResolvedValue(null);
      vi.mocked(mockMenuPostRepository.save).mockResolvedValue(crawledPost);

      const result = await useCase.execute();

      expect(result.isOk()).toBe(true);
      expect(result.value.isNewPost).toBe(true);
      expect(result.value.post.postId.value).toBe('new-post-123');
      expect(mockMenuPostRepository.save).toHaveBeenCalledWith(crawledPost);
    });

    it('기존 게시물이면 저장하지 않고 반환한다', async () => {
      const existingPost = new MenuPostBuilder()
        .withPostId('existing-post-123')
        .build();

      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.ok({ post: existingPost, isNew: false })
      );
      vi.mocked(mockMenuPostRepository.findByPostId).mockResolvedValue(existingPost);

      const result = await useCase.execute();

      expect(result.isOk()).toBe(true);
      expect(result.value.isNewPost).toBe(false);
      expect(result.value.post.postId.value).toBe('existing-post-123');
      expect(mockMenuPostRepository.save).not.toHaveBeenCalled();
    });

    it('forceRefresh=true면 기존 게시물도 다시 저장한다', async () => {
      const post = new MenuPostBuilder()
        .withPostId('post-123')
        .build();

      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.ok({ post, isNew: false })
      );
      vi.mocked(mockMenuPostRepository.findByPostId).mockResolvedValue(post);
      vi.mocked(mockMenuPostRepository.save).mockResolvedValue(post);

      const result = await useCase.execute({ forceRefresh: true });

      expect(result.isOk()).toBe(true);
      expect(result.value.isNewPost).toBe(true);
      expect(mockMenuPostRepository.save).toHaveBeenCalled();
    });

    it('크롤링 실패 시 에러를 반환한다', async () => {
      const crawlingError = new CrawlingError('네트워크 오류');
      vi.mocked(mockCrawlerService.crawlLatestMenu).mockResolvedValue(
        Result.fail(crawlingError)
      );

      const result = await useCase.execute();

      expect(result.isError()).toBe(true);
      expect(result.error).toBe(crawlingError);
    });

    it('예외 발생 시 CrawlingError로 래핑한다', async () => {
      vi.mocked(mockCrawlerService.crawlLatestMenu).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await useCase.execute();

      expect(result.isError()).toBe(true);
      expect(result.error).toBeInstanceOf(CrawlingError);
      expect(result.error.message).toContain('UseCase 실행 실패');
    });
  });
});
