import { injectable, inject } from 'tsyringe';
import { MenuPost } from '@domain/entities';
import { IMenuPostRepository } from '@domain/repositories';
import { ICrawlerService } from '@domain/services';
import { Result } from '@shared/types/Result';
import { CrawlingError } from '@shared/errors/DomainError';

export interface CrawlWeeklyMenuCriteria {
  forceRefresh?: boolean;
}

export interface CrawlWeeklyMenuResult {
  post: MenuPost;
  isNewPost: boolean;
}

/**
 * 주간 식단표 크롤링 UseCase
 * - 최신 식단표를 크롤링하여 저장
 * - 이미 존재하면 기존 데이터 반환
 */
@injectable()
export class CrawlWeeklyMenuUseCase {
  constructor(
    @inject(ICrawlerService)
    private readonly crawlerService: ICrawlerService,
    @inject(IMenuPostRepository)
    private readonly menuPostRepository: IMenuPostRepository
  ) {}

  async execute(
    criteria: CrawlWeeklyMenuCriteria = {}
  ): Promise<Result<CrawlWeeklyMenuResult, CrawlingError>> {
    try {
      // 1. 크롤링 실행
      const crawlResult = await this.crawlerService.crawlLatestMenu();

      if (crawlResult.isError()) {
        return Result.fail(crawlResult.error);
      }

      const { post: crawledPost } = crawlResult.value;

      // 2. 기존 게시물 확인
      const existingPost = await this.menuPostRepository.findByPostId(
        crawledPost.postId.value
      );

      // 3. 이미 존재하면 기존 데이터 반환 (forceRefresh가 아닌 경우)
      if (existingPost && !criteria.forceRefresh) {
        return Result.ok({
          post: existingPost,
          isNewPost: false,
        });
      }

      // 4. 새 게시물 저장
      const savedPost = await this.menuPostRepository.save(crawledPost);

      return Result.ok({
        post: savedPost,
        isNewPost: true,
      });
    } catch (error) {
      return Result.fail(
        new CrawlingError(
          `크롤링 UseCase 실행 실패: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      );
    }
  }
}
