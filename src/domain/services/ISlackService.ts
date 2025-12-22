import { MenuPost } from '@domain/entities';
import { Result } from '@shared/types/Result';
import { SlackDeliveryError } from '@shared/errors/DomainError';

export interface SendMenuMessageCriteria {
  menuPost: MenuPost;
  channel: string;
}

export interface SendMenuMessageResult {
  messageTs: string;
  channel: string;
}

export interface SendEphemeralMenuCriteria {
  menuPost: MenuPost;
  channel: string;
  userId: string;
}

/**
 * Slack 서비스 인터페이스
 */
export interface ISlackService {
  /**
   * 채널에 식단표 메시지 발송
   */
  sendMenuMessage(
    criteria: SendMenuMessageCriteria
  ): Promise<Result<SendMenuMessageResult, SlackDeliveryError>>;

  /**
   * 개인에게 임시 메시지 발송 (다른 사람에게 안 보임)
   */
  sendEphemeralMenu(
    criteria: SendEphemeralMenuCriteria
  ): Promise<Result<SendMenuMessageResult, SlackDeliveryError>>;
}

export const ISlackService = Symbol('ISlackService');
