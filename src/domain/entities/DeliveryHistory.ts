import { PostId } from '@domain/value-objects';
import { randomUUID } from 'crypto';

export interface DeliveryHistoryProps {
  id?: string;
  postId: string;
  channel: string;
  sentAt?: Date;
}

/**
 * 발송 이력 엔티티
 */
export class DeliveryHistory {
  private constructor(
    public readonly id: string,
    public readonly postId: PostId,
    public readonly channel: string,
    public readonly sentAt: Date
  ) {}

  static create(props: DeliveryHistoryProps): DeliveryHistory {
    return new DeliveryHistory(
      props.id ?? randomUUID(),
      PostId.create(props.postId),
      props.channel,
      props.sentAt ?? new Date()
    );
  }

  /**
   * DB 레코드에서 DeliveryHistory 복원
   */
  static fromPersistence(data: {
    id: string;
    postId: string;
    channel: string;
    sentAt: Date;
  }): DeliveryHistory {
    return new DeliveryHistory(
      data.id,
      PostId.create(data.postId),
      data.channel,
      data.sentAt
    );
  }

  /**
   * 영속화를 위한 plain object 변환
   */
  toPersistence(): {
    id: string;
    postId: string;
    channel: string;
    sentAt: Date;
  } {
    return {
      id: this.id,
      postId: this.postId.value,
      channel: this.channel,
      sentAt: this.sentAt,
    };
  }
}
