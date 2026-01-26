import { injectable, inject } from 'tsyringe';
import { IMenuPostRepository, IDeliveryHistoryRepository } from '@domain/repositories';
import { ICrawlerService, ISlackService } from '@domain/services';
import { DeliveryHistory } from '@domain/entities';
import { Result } from '@shared/types/Result';
import { DomainError } from '@shared/errors/DomainError';

export interface CheckAndSendMenuCriteria {
  channel: string;
  maxRetries?: number;
  retryIntervalMs?: number;
}

export interface CheckAndSendMenuResult {
  success: boolean;
  attemptCount: number;
  sentAt?: Date;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * 스케줄러용 식단표 확인 및 발송 UseCase
 * - 이미 해당 주차 발송됐으면 Skip
 * - 새 게시물 없으면 폴링 재시도
 */
@injectable()
export class CheckAndSendMenuUseCase {
  constructor(
    @inject(ICrawlerService)
    private readonly crawlerService: ICrawlerService,
    @inject(ISlackService)
    private readonly slackService: ISlackService,
    @inject(IMenuPostRepository)
    private readonly menuPostRepository: IMenuPostRepository,
    @inject(IDeliveryHistoryRepository)
    private readonly deliveryHistoryRepository: IDeliveryHistoryRepository
  ) {}

  async execute(
    criteria: CheckAndSendMenuCriteria
  ): Promise<Result<CheckAndSendMenuResult, DomainError>> {
    const { channel, maxRetries = 6, retryIntervalMs = 60 * 60 * 1000 } = criteria;

    // 1. 이번 주 게시물이 이미 발송되었는지 확인
    const thisWeekPost = await this.menuPostRepository.findThisWeek();
    if (thisWeekPost) {
      const existingHistory =
        await this.deliveryHistoryRepository.findByPostIdAndChannel(
          thisWeekPost.postId.value,
          channel
        );

      if (existingHistory) {
        return Result.ok({
          success: true,
          attemptCount: 0,
          skipped: true,
          skipReason: `이번 주 식단표 이미 발송됨: ${thisWeekPost.title}`,
        });
      }
    }

    // 2. 폴링 재시도 로직
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[CheckAndSend] 시도 ${attempt}/${maxRetries}`);

      try {
        // 2-1. 크롤링 시도
        const crawlResult = await this.crawlerService.crawlLatestMenu();

        if (crawlResult.isError()) {
          console.warn(
            `[CheckAndSend] 크롤링 실패 (${attempt}/${maxRetries}): ${crawlResult.error.message}`
          );
          if (attempt === maxRetries) {
            return Result.fail(crawlResult.error);
          }
          console.log(
            `[CheckAndSend] ${retryIntervalMs / 1000 / 60}분 후 재시도 예정...`
          );
          await this.sleep(retryIntervalMs);
          continue;
        }

        const { post: crawledPost, isNew } = crawlResult.value;
        console.log(
          `[CheckAndSend] 크롤링 성공: "${crawledPost.title}" (isNew: ${isNew})`
        );

        // 2-2. 이번 주 게시물인지 확인
        if (!crawledPost.isThisWeek()) {
          console.log(
            `[CheckAndSend] 이번 주 게시물 아님 (${attempt}/${maxRetries}): ${crawledPost.title}`
          );
          if (attempt === maxRetries) {
            return Result.ok({
              success: false,
              attemptCount: attempt,
              skipReason: '이번 주 식단표를 찾지 못함',
            });
          }
          console.log(
            `[CheckAndSend] ${retryIntervalMs / 1000 / 60}분 후 재시도 예정...`
          );
          await this.sleep(retryIntervalMs);
          continue;
        }

        // 2-3. 이미 발송되었는지 확인
        const existingHistory =
          await this.deliveryHistoryRepository.findByPostIdAndChannel(
            crawledPost.postId.value,
            channel
          );

        if (existingHistory) {
          return Result.ok({
            success: true,
            attemptCount: attempt,
            skipped: true,
            skipReason: '이미 발송된 게시물',
          });
        }

        // 2-4. 새 게시물이면 저장
        if (isNew) {
          await this.menuPostRepository.save(crawledPost);
        }

        // 2-5. Slack 발송
        const sendResult = await this.slackService.sendMenuMessage({
          menuPost: crawledPost,
          channel,
        });

        if (sendResult.isError()) {
          return Result.fail(sendResult.error);
        }

        // 2-6. 발송 이력 저장
        const history = DeliveryHistory.create({
          postId: crawledPost.postId.value,
          channel,
        });
        await this.deliveryHistoryRepository.save(history);

        return Result.ok({
          success: true,
          attemptCount: attempt,
          sentAt: new Date(),
        });
      } catch (error) {
        console.error(
          `[CheckAndSend] 예외 발생 (${attempt}/${maxRetries}):`,
          error instanceof Error ? error.message : String(error)
        );
        if (attempt === maxRetries) {
          return Result.fail(
            new DomainError(
              `최대 재시도 횟수 초과: ${error instanceof Error ? error.message : String(error)}`,
              'MAX_RETRY_EXCEEDED',
              error
            )
          );
        }
        console.log(
          `[CheckAndSend] ${retryIntervalMs / 1000 / 60}분 후 재시도 예정...`
        );
        await this.sleep(retryIntervalMs);
      }
    }

    return Result.ok({
      success: false,
      attemptCount: maxRetries,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
