import { injectable, inject } from 'tsyringe';
import { MenuPost, DeliveryHistory } from '@domain/entities';
import { IDeliveryHistoryRepository } from '@domain/repositories';
import { ISlackService } from '@domain/services';
import { Result } from '@shared/types/Result';
import { SlackDeliveryError, DuplicateError } from '@shared/errors/DomainError';

export interface SendMenuToSlackCriteria {
  menuPost: MenuPost;
  channel: string;
}

export interface SendMenuToSlackResult {
  deliveryHistory: DeliveryHistory;
  messageTs: string;
}

/**
 * Slack으로 식단표 발송 UseCase
 * - 채널에 식단표 메시지 발송
 * - 중복 발송 방지
 */
@injectable()
export class SendMenuToSlackUseCase {
  constructor(
    @inject(ISlackService)
    private readonly slackService: ISlackService,
    @inject(IDeliveryHistoryRepository)
    private readonly deliveryHistoryRepository: IDeliveryHistoryRepository
  ) {}

  async execute(
    criteria: SendMenuToSlackCriteria
  ): Promise<Result<SendMenuToSlackResult, SlackDeliveryError | DuplicateError>> {
    const { menuPost, channel } = criteria;

    try {
      // 1. 중복 발송 체크
      const existingHistory =
        await this.deliveryHistoryRepository.findByPostIdAndChannel(
          menuPost.postId.value,
          channel
        );

      if (existingHistory) {
        return Result.fail(
          new DuplicateError(
            `이미 발송된 게시물입니다: ${menuPost.postId.value} → ${channel}`
          )
        );
      }

      // 2. Slack 발송
      const sendResult = await this.slackService.sendMenuMessage({
        menuPost,
        channel,
      });

      if (sendResult.isError()) {
        return Result.fail(sendResult.error);
      }

      // 3. 발송 이력 저장
      const history = DeliveryHistory.create({
        postId: menuPost.postId.value,
        channel,
      });

      const savedHistory = await this.deliveryHistoryRepository.save(history);

      return Result.ok({
        deliveryHistory: savedHistory,
        messageTs: sendResult.value.messageTs,
      });
    } catch (error) {
      return Result.fail(
        new SlackDeliveryError(
          `Slack 발송 UseCase 실행 실패: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      );
    }
  }
}
