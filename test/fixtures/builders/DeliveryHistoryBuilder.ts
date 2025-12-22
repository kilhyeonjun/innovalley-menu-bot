import { DeliveryHistory } from '@domain/entities';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

interface DeliveryHistoryBuilderProps {
  id: string;
  postId: string;
  channel: string;
  sentAt: Date;
}

/**
 * DeliveryHistory 테스트 빌더
 */
export class DeliveryHistoryBuilder {
  private props: DeliveryHistoryBuilderProps = {
    id: randomUUID(),
    postId: 'test-post-123',
    channel: 'C1234567890',
    sentAt: new Date(),
  };

  withId(id: string): this {
    this.props.id = id;
    return this;
  }

  withPostId(postId: string): this {
    this.props.postId = postId;
    return this;
  }

  withChannel(channel: string): this {
    this.props.channel = channel;
    return this;
  }

  withSentAt(sentAt: Date): this {
    this.props.sentAt = sentAt;
    return this;
  }

  /**
   * DeliveryHistory 엔티티 생성
   */
  build(): DeliveryHistory {
    return DeliveryHistory.create(this.props);
  }

  /**
   * 빌더 속성 반환 (테스트용)
   */
  getProps(): DeliveryHistoryBuilderProps {
    return { ...this.props };
  }

  /**
   * DB에 저장하고 엔티티 반환
   * 주의: MenuPost가 먼저 존재해야 함
   */
  async persist(prisma: PrismaClient): Promise<DeliveryHistory> {
    const data = await prisma.deliveryHistory.create({
      data: {
        id: this.props.id,
        postId: this.props.postId,
        channel: this.props.channel,
        sentAt: this.props.sentAt,
      },
    });

    return DeliveryHistory.fromPersistence({
      id: data.id,
      postId: data.postId,
      channel: data.channel,
      sentAt: data.sentAt,
    });
  }
}
