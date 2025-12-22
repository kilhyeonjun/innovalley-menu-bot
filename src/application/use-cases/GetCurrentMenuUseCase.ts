import { injectable, inject } from 'tsyringe';
import { MenuPost } from '@domain/entities';
import { IMenuPostRepository } from '@domain/repositories';
import { ICrawlerService, ISlackService } from '@domain/services';
import { Result } from '@shared/types/Result';
import { DomainError, NotFoundError } from '@shared/errors/DomainError';

export interface GetCurrentMenuCriteria {
  userId: string;
  channel: string;
}

export interface GetCurrentMenuResult {
  post: MenuPost;
  source: 'cache' | 'crawl';
}

/**
 * 온디맨드 식단표 조회 UseCase
 * - /식단 슬래시 커맨드에서 호출
 * - DB에 이번 주 식단표 있으면 즉시 반환
 * - 없으면 크롤링 후 반환
 */
@injectable()
export class GetCurrentMenuUseCase {
  constructor(
    @inject(ICrawlerService)
    private readonly crawlerService: ICrawlerService,
    @inject(ISlackService)
    private readonly slackService: ISlackService,
    @inject(IMenuPostRepository)
    private readonly menuPostRepository: IMenuPostRepository
  ) {}

  async execute(
    criteria: GetCurrentMenuCriteria
  ): Promise<Result<GetCurrentMenuResult, DomainError>> {
    const { userId, channel } = criteria;

    try {
      // 1. DB에서 이번 주 게시물 조회
      const cachedPost = await this.menuPostRepository.findThisWeek();

      if (cachedPost) {
        // 1-1. 캐시 히트: ephemeral 메시지로 응답
        await this.slackService.sendEphemeralMenu({
          menuPost: cachedPost,
          channel,
          userId,
        });

        return Result.ok({
          post: cachedPost,
          source: 'cache',
        });
      }

      // 2. DB에 없으면 크롤링
      const crawlResult = await this.crawlerService.crawlLatestMenu();

      if (crawlResult.isError()) {
        return Result.fail(crawlResult.error);
      }

      const { post: crawledPost } = crawlResult.value;

      // 3. 이번 주 게시물이 아니면 에러
      if (!crawledPost.isThisWeek()) {
        // 가장 최근 게시물이라도 보여주기
        const latestPost = await this.menuPostRepository.findLatest();
        if (latestPost) {
          await this.slackService.sendEphemeralMenu({
            menuPost: latestPost,
            channel,
            userId,
          });

          return Result.ok({
            post: latestPost,
            source: 'cache',
          });
        }

        return Result.fail(
          new NotFoundError('이번 주 식단표를 찾을 수 없습니다')
        );
      }

      // 4. 새 게시물 저장
      const savedPost = await this.menuPostRepository.save(crawledPost);

      // 5. ephemeral 메시지로 응답
      await this.slackService.sendEphemeralMenu({
        menuPost: savedPost,
        channel,
        userId,
      });

      return Result.ok({
        post: savedPost,
        source: 'crawl',
      });
    } catch (error) {
      return Result.fail(
        new DomainError(
          `식단표 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
          'GET_MENU_ERROR',
          error
        )
      );
    }
  }
}
