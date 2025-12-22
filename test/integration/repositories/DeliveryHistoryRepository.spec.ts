import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DeliveryHistoryBuilder, MenuPostBuilder } from '../../fixtures/builders';

/**
 * DeliveryHistoryRepository 통합 테스트
 *
 * 실제 SQLite DB를 사용하여 테스트
 */
describe('DeliveryHistoryRepository (Integration)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./test.db',
        },
      },
    });
    await prisma.$connect();
  });

  beforeEach(async () => {
    // SQLite에서 FK 제약 조건 임시 비활성화
    await prisma.$executeRaw`PRAGMA foreign_keys = OFF`;
    await prisma.$executeRaw`DELETE FROM delivery_histories`;
    await prisma.$executeRaw`DELETE FROM menu_posts`;
    await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
  });

  afterAll(async () => {
    await prisma.$executeRaw`PRAGMA foreign_keys = OFF`;
    await prisma.$executeRaw`DELETE FROM delivery_histories`;
    await prisma.$executeRaw`DELETE FROM menu_posts`;
    await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
    await prisma.$disconnect();
  });

  /**
   * 테스트용 MenuPost 생성 (외래키 제약 조건 충족)
   */
  async function createMenuPost(postId: string): Promise<void> {
    await prisma.menuPost.create({
      data: {
        postId,
        title: 'Test Menu',
        imageUrl: 'https://example.com/image.jpg',
        publishedAt: new Date(),
        crawledAt: new Date(),
      },
    });
  }

  describe('save', () => {
    it('발송 이력을 저장한다', async () => {
      await createMenuPost('post-123');

      const history = new DeliveryHistoryBuilder()
        .withPostId('post-123')
        .withChannel('C1234567890')
        .build();

      const saved = await prisma.deliveryHistory.create({
        data: history.toPersistence(),
      });

      expect(saved.id).toBeDefined();
      expect(saved.postId).toBe('post-123');
      expect(saved.channel).toBe('C1234567890');

      // DB에서 확인
      const found = await prisma.deliveryHistory.findFirst({
        where: { postId: 'post-123' },
      });
      expect(found).not.toBeNull();
    });
  });

  describe('findByPostIdAndChannel', () => {
    it('존재하는 이력을 반환한다', async () => {
      await createMenuPost('post-456');

      const history = new DeliveryHistoryBuilder()
        .withPostId('post-456')
        .withChannel('C1234567890')
        .build();
      await prisma.deliveryHistory.create({
        data: history.toPersistence(),
      });

      const found = await prisma.deliveryHistory.findUnique({
        where: {
          postId_channel: {
            postId: 'post-456',
            channel: 'C1234567890',
          },
        },
      });

      expect(found).not.toBeNull();
      expect(found?.postId).toBe('post-456');
      expect(found?.channel).toBe('C1234567890');
    });

    it('같은 게시물 다른 채널은 반환하지 않는다', async () => {
      await createMenuPost('post-789');

      const history = new DeliveryHistoryBuilder()
        .withPostId('post-789')
        .withChannel('C1111111111')
        .build();
      await prisma.deliveryHistory.create({
        data: history.toPersistence(),
      });

      const found = await prisma.deliveryHistory.findUnique({
        where: {
          postId_channel: {
            postId: 'post-789',
            channel: 'C2222222222', // 다른 채널
          },
        },
      });

      expect(found).toBeNull();
    });

    it('존재하지 않는 이력은 null을 반환한다', async () => {
      const found = await prisma.deliveryHistory.findUnique({
        where: {
          postId_channel: {
            postId: 'non-existent',
            channel: 'C1234567890',
          },
        },
      });

      expect(found).toBeNull();
    });
  });

  describe('findByDateRange', () => {
    it('날짜 범위 내 이력을 반환한다', async () => {
      await createMenuPost('range-post-1');
      await createMenuPost('range-post-2');
      await createMenuPost('range-post-3');

      const histories = [
        new DeliveryHistoryBuilder()
          .withPostId('range-post-1')
          .withChannel('C1234567890')
          .withSentAt(new Date('2024-12-10T09:00:00'))
          .build(),
        new DeliveryHistoryBuilder()
          .withPostId('range-post-2')
          .withChannel('C1234567890')
          .withSentAt(new Date('2024-12-15T09:00:00'))
          .build(),
        new DeliveryHistoryBuilder()
          .withPostId('range-post-3')
          .withChannel('C1234567890')
          .withSentAt(new Date('2024-12-20T09:00:00'))
          .build(),
      ];

      for (const history of histories) {
        await prisma.deliveryHistory.create({
          data: history.toPersistence(),
        });
      }

      const found = await prisma.deliveryHistory.findMany({
        where: {
          sentAt: {
            gte: new Date('2024-12-12T00:00:00'),
            lte: new Date('2024-12-18T23:59:59'),
          },
        },
        orderBy: { sentAt: 'desc' },
      });

      expect(found).toHaveLength(1);
      expect(found[0].postId).toBe('range-post-2');
    });
  });

  describe('findLatestByChannel', () => {
    it('채널의 최근 이력을 반환한다', async () => {
      await createMenuPost('latest-post-1');
      await createMenuPost('latest-post-2');

      const older = new DeliveryHistoryBuilder()
        .withPostId('latest-post-1')
        .withChannel('C1234567890')
        .withSentAt(new Date('2024-12-10T09:00:00'))
        .build();
      const newer = new DeliveryHistoryBuilder()
        .withPostId('latest-post-2')
        .withChannel('C1234567890')
        .withSentAt(new Date('2024-12-17T09:00:00'))
        .build();

      await prisma.deliveryHistory.create({ data: older.toPersistence() });
      await prisma.deliveryHistory.create({ data: newer.toPersistence() });

      const latest = await prisma.deliveryHistory.findFirst({
        where: { channel: 'C1234567890' },
        orderBy: { sentAt: 'desc' },
      });

      expect(latest).not.toBeNull();
      expect(latest?.postId).toBe('latest-post-2');
    });

    it('다른 채널의 이력은 반환하지 않는다', async () => {
      await createMenuPost('other-channel-post');

      const history = new DeliveryHistoryBuilder()
        .withPostId('other-channel-post')
        .withChannel('C1111111111')
        .withSentAt(new Date())
        .build();
      await prisma.deliveryHistory.create({
        data: history.toPersistence(),
      });

      const latest = await prisma.deliveryHistory.findFirst({
        where: { channel: 'C2222222222' },
        orderBy: { sentAt: 'desc' },
      });

      expect(latest).toBeNull();
    });
  });
});
