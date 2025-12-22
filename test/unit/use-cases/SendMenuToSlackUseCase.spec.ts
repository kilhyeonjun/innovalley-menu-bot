import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SendMenuToSlackUseCase } from '@application/use-cases/SendMenuToSlackUseCase';
import { ISlackService } from '@domain/services';
import { IDeliveryHistoryRepository } from '@domain/repositories';
import { DeliveryHistory } from '@domain/entities';
import { Result } from '@shared/types/Result';
import { SlackDeliveryError, DuplicateError } from '@shared/errors/DomainError';
import { MenuPostBuilder, DeliveryHistoryBuilder } from '../../fixtures/builders';

describe('SendMenuToSlackUseCase', () => {
  let useCase: SendMenuToSlackUseCase;
  let mockSlackService: ISlackService;
  let mockDeliveryHistoryRepository: IDeliveryHistoryRepository;

  beforeEach(() => {
    mockSlackService = {
      sendMenuMessage: vi.fn(),
      sendEphemeralMenu: vi.fn(),
    };

    mockDeliveryHistoryRepository = {
      save: vi.fn(),
      findByPostIdAndChannel: vi.fn(),
      findByDateRange: vi.fn(),
      findLatestByChannel: vi.fn(),
    };

    useCase = new SendMenuToSlackUseCase(
      mockSlackService,
      mockDeliveryHistoryRepository
    );
  });

  describe('execute', () => {
    it('Slack에 메시지를 발송하고 이력을 저장한다', async () => {
      const menuPost = new MenuPostBuilder()
        .withPostId('post-123')
        .build();
      const channel = 'C1234567890';

      vi.mocked(mockDeliveryHistoryRepository.findByPostIdAndChannel).mockResolvedValue(null);
      vi.mocked(mockSlackService.sendMenuMessage).mockResolvedValue(
        Result.ok({ messageTs: '1234567890.123456', channel })
      );
      vi.mocked(mockDeliveryHistoryRepository.save).mockImplementation(
        async (history) => history
      );

      const result = await useCase.execute({ menuPost, channel });

      expect(result.isOk()).toBe(true);
      expect(result.value.messageTs).toBe('1234567890.123456');
      expect(result.value.deliveryHistory.postId.value).toBe('post-123');
      expect(result.value.deliveryHistory.channel).toBe(channel);
      expect(mockDeliveryHistoryRepository.save).toHaveBeenCalled();
    });

    it('이미 발송된 게시물은 DuplicateError를 반환한다', async () => {
      const menuPost = new MenuPostBuilder()
        .withPostId('post-123')
        .build();
      const channel = 'C1234567890';
      const existingHistory = new DeliveryHistoryBuilder()
        .withPostId('post-123')
        .withChannel(channel)
        .build();

      vi.mocked(mockDeliveryHistoryRepository.findByPostIdAndChannel).mockResolvedValue(
        existingHistory
      );

      const result = await useCase.execute({ menuPost, channel });

      expect(result.isError()).toBe(true);
      expect(result.error).toBeInstanceOf(DuplicateError);
      expect(result.error.message).toContain('이미 발송된 게시물');
      expect(mockSlackService.sendMenuMessage).not.toHaveBeenCalled();
    });

    it('Slack 발송 실패 시 에러를 반환한다', async () => {
      const menuPost = new MenuPostBuilder().build();
      const slackError = new SlackDeliveryError('Slack API 오류');

      vi.mocked(mockDeliveryHistoryRepository.findByPostIdAndChannel).mockResolvedValue(null);
      vi.mocked(mockSlackService.sendMenuMessage).mockResolvedValue(
        Result.fail(slackError)
      );

      const result = await useCase.execute({
        menuPost,
        channel: 'C1234567890',
      });

      expect(result.isError()).toBe(true);
      expect(result.error).toBe(slackError);
      expect(mockDeliveryHistoryRepository.save).not.toHaveBeenCalled();
    });

    it('예외 발생 시 SlackDeliveryError로 래핑한다', async () => {
      const menuPost = new MenuPostBuilder().build();

      vi.mocked(mockDeliveryHistoryRepository.findByPostIdAndChannel).mockRejectedValue(
        new Error('DB connection failed')
      );

      const result = await useCase.execute({
        menuPost,
        channel: 'C1234567890',
      });

      expect(result.isError()).toBe(true);
      expect(result.error).toBeInstanceOf(SlackDeliveryError);
      expect(result.error.message).toContain('UseCase 실행 실패');
    });
  });
});
