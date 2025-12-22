import { describe, it, expect, beforeEach, afterAll, vi, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { MenuPost } from '@domain/entities';
import { MenuPostBuilder } from '../../fixtures/builders';

/**
 * MenuPostRepository 통합 테스트
 *
 * 실제 SQLite DB를 사용하여 테스트
 */
describe('MenuPostRepository (Integration)', () => {
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

  // Repository를 직접 사용하지 않고 Prisma로 직접 테스트 (통합 테스트)
  describe('save (MenuPost 저장)', () => {
    it('새 게시물을 저장한다', async () => {
      const post = new MenuPostBuilder()
        .withPostId('new-post-123')
        .withTitle('주간메뉴[12/22-12/26]')
        .build();

      const data = post.toPersistence();
      const saved = await prisma.menuPost.create({ data });

      expect(saved.id).toBeDefined();
      expect(saved.postId).toBe('new-post-123');
      expect(saved.title).toBe('주간메뉴[12/22-12/26]');

      // DB에서 확인
      const found = await prisma.menuPost.findUnique({
        where: { postId: 'new-post-123' },
      });
      expect(found).not.toBeNull();
      expect(found?.title).toBe('주간메뉴[12/22-12/26]');
    });

    it('기존 게시물을 업데이트한다 (upsert)', async () => {
      // 먼저 저장
      const original = new MenuPostBuilder()
        .withPostId('update-post-123')
        .withTitle('원본 제목')
        .build();
      await prisma.menuPost.create({ data: original.toPersistence() });

      // 같은 postId로 다시 저장 (제목 변경)
      const updated = new MenuPostBuilder()
        .withPostId('update-post-123')
        .withTitle('수정된 제목')
        .build();
      const result = await prisma.menuPost.upsert({
        where: { postId: 'update-post-123' },
        create: updated.toPersistence(),
        update: updated.toPersistence(),
      });

      expect(result.title).toBe('수정된 제목');

      // DB에서 확인 (1개만 존재해야 함)
      const count = await prisma.menuPost.count({
        where: { postId: 'update-post-123' },
      });
      expect(count).toBe(1);
    });
  });

  describe('findByPostId', () => {
    it('존재하는 게시물을 반환한다', async () => {
      const post = new MenuPostBuilder()
        .withPostId('find-post-123')
        .build();
      await prisma.menuPost.create({ data: post.toPersistence() });

      const found = await prisma.menuPost.findUnique({
        where: { postId: 'find-post-123' },
      });

      expect(found).not.toBeNull();
      expect(found?.postId).toBe('find-post-123');
    });

    it('존재하지 않는 게시물은 null을 반환한다', async () => {
      const found = await prisma.menuPost.findUnique({
        where: { postId: 'non-existent' },
      });

      expect(found).toBeNull();
    });
  });

  describe('findLatest', () => {
    it('가장 최근 게시물을 반환한다', async () => {
      const older = new MenuPostBuilder()
        .withPostId('older-post')
        .withPublishedAt(new Date('2024-12-10'))
        .build();
      const newer = new MenuPostBuilder()
        .withPostId('newer-post')
        .withPublishedAt(new Date('2024-12-17'))
        .build();

      await prisma.menuPost.create({ data: older.toPersistence() });
      await prisma.menuPost.create({ data: newer.toPersistence() });

      const latest = await prisma.menuPost.findFirst({
        orderBy: { publishedAt: 'desc' },
      });

      expect(latest).not.toBeNull();
      expect(latest?.postId).toBe('newer-post');
    });

    it('게시물이 없으면 null을 반환한다', async () => {
      const latest = await prisma.menuPost.findFirst({
        orderBy: { publishedAt: 'desc' },
      });

      expect(latest).toBeNull();
    });
  });

  describe('findThisWeek', () => {
    it('이번 주 게시물을 반환한다', async () => {
      // 현재 시간 기준으로 이번 주 시작 계산
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // 이번 주 내 게시물
      const thisWeekDate = new Date(startOfWeek);
      thisWeekDate.setDate(startOfWeek.getDate() + 1); // 월요일

      const thisWeekPost = new MenuPostBuilder()
        .withPostId('this-week-post')
        .withPublishedAt(thisWeekDate)
        .build();
      await prisma.menuPost.create({ data: thisWeekPost.toPersistence() });

      const found = await prisma.menuPost.findFirst({
        where: {
          publishedAt: { gte: startOfWeek },
        },
        orderBy: { publishedAt: 'desc' },
      });

      expect(found).not.toBeNull();
      expect(found?.postId).toBe('this-week-post');
    });

    it('이번 주 게시물이 없으면 null을 반환한다', async () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // 지난 주 게시물
      const lastWeekDate = new Date(startOfWeek);
      lastWeekDate.setDate(startOfWeek.getDate() - 7);

      const lastWeekPost = new MenuPostBuilder()
        .withPostId('last-week-post')
        .withPublishedAt(lastWeekDate)
        .build();
      await prisma.menuPost.create({ data: lastWeekPost.toPersistence() });

      const found = await prisma.menuPost.findFirst({
        where: {
          publishedAt: { gte: startOfWeek },
        },
        orderBy: { publishedAt: 'desc' },
      });

      expect(found).toBeNull();
    });
  });

  describe('findByDateRange', () => {
    it('날짜 범위 내 게시물을 반환한다', async () => {
      const posts = [
        new MenuPostBuilder()
          .withPostId('post-1')
          .withPublishedAt(new Date('2024-12-10'))
          .build(),
        new MenuPostBuilder()
          .withPostId('post-2')
          .withPublishedAt(new Date('2024-12-15'))
          .build(),
        new MenuPostBuilder()
          .withPostId('post-3')
          .withPublishedAt(new Date('2024-12-20'))
          .build(),
      ];

      for (const post of posts) {
        await prisma.menuPost.create({ data: post.toPersistence() });
      }

      const found = await prisma.menuPost.findMany({
        where: {
          publishedAt: {
            gte: new Date('2024-12-12'),
            lte: new Date('2024-12-18'),
          },
        },
        orderBy: { publishedAt: 'desc' },
      });

      expect(found).toHaveLength(1);
      expect(found[0].postId).toBe('post-2');
    });
  });
});
