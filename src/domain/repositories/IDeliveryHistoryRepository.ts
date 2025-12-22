import { DeliveryHistory } from '@domain/entities';

/**
 * 발송 이력 Repository 인터페이스
 */
export interface IDeliveryHistoryRepository {
  /**
   * 발송 이력 저장
   */
  save(history: DeliveryHistory): Promise<DeliveryHistory>;

  /**
   * postId와 channel로 조회 (없으면 null)
   */
  findByPostIdAndChannel(
    postId: string,
    channel: string
  ): Promise<DeliveryHistory | null>;

  /**
   * 날짜 범위로 조회
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<DeliveryHistory[]>;

  /**
   * 특정 채널의 최근 발송 이력 조회
   */
  findLatestByChannel(channel: string): Promise<DeliveryHistory | null>;
}

export const IDeliveryHistoryRepository = Symbol('IDeliveryHistoryRepository');
