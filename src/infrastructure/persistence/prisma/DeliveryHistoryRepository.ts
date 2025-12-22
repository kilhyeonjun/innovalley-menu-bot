import { injectable } from 'tsyringe';
import { DeliveryHistory } from '@domain/entities';
import { IDeliveryHistoryRepository } from '@domain/repositories';
import { getPrismaClient } from './PrismaClient';

/**
 * 발송 이력 Repository Prisma 구현체
 */
@injectable()
export class DeliveryHistoryRepository implements IDeliveryHistoryRepository {
  private get prisma() {
    return getPrismaClient();
  }

  async save(history: DeliveryHistory): Promise<DeliveryHistory> {
    const data = history.toPersistence();

    const saved = await this.prisma.deliveryHistory.create({
      data,
    });

    return DeliveryHistory.fromPersistence(saved);
  }

  async findByPostIdAndChannel(
    postId: string,
    channel: string
  ): Promise<DeliveryHistory | null> {
    const found = await this.prisma.deliveryHistory.findUnique({
      where: {
        postId_channel: { postId, channel },
      },
    });

    return found ? DeliveryHistory.fromPersistence(found) : null;
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<DeliveryHistory[]> {
    const found = await this.prisma.deliveryHistory.findMany({
      where: {
        sentAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    return found.map((h) => DeliveryHistory.fromPersistence(h));
  }

  async findLatestByChannel(channel: string): Promise<DeliveryHistory | null> {
    const found = await this.prisma.deliveryHistory.findFirst({
      where: { channel },
      orderBy: { sentAt: 'desc' },
    });

    return found ? DeliveryHistory.fromPersistence(found) : null;
  }
}
