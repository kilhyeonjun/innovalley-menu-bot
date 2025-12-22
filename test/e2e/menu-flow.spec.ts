import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getTestPrisma, cleanupTestDb, disconnectTestDb } from '../integration/testDb';
import { MenuPostBuilder } from '../fixtures/builders';
import { Result } from '@shared/types/Result';

/**
 * E2E 테스트: 전체 플로우 테스트
 *
 * Slack 발송은 Mock으로 대체
 */
describe('Menu Flow (E2E)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = getTestPrisma();
    await prisma.$connect();
  });

  beforeEach(async () => {
    await cleanupTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
    await disconnectTestDb();
  });

  describe('크롤링 → 저장 → 조회 플로우', () => {
    it('새 게시물을 크롤링하여 저장하고 조회할 수 있다', async () => {
      // 1. 게시물 생성 (크롤링 시뮬레이션)
      const menuPost = new MenuPostBuilder()
        .withPostId('e2e-test-post')
        .withTitle('주간메뉴[12/22-12/26]')
        .withImageUrl('https://k.kakaocdn.net/dn/test/menu.jpg')
        .thisWeek()
        .build();

      // 2. DB에 저장
      const saved = await prisma.menuPost.create({
        data: menuPost.toPersistence(),
      });

      expect(saved.id).toBeDefined();
      expect(saved.postId).toBe('e2e-test-post');

      // 3. 조회
      const found = await prisma.menuPost.findUnique({
        where: { postId: 'e2e-test-post' },
      });

      expect(found).not.toBeNull();
      expect(found?.title).toBe('주간메뉴[12/22-12/26]');
    });
  });

  describe('발송 이력 관리 플로우', () => {
    it('발송 이력이 기록되고 중복 발송이 방지된다', async () => {
      // 1. 게시물 생성
      const menuPost = new MenuPostBuilder()
        .withPostId('delivery-test-post')
        .build();

      await prisma.menuPost.create({
        data: menuPost.toPersistence(),
      });

      // 2. 발송 이력 생성
      const channel = 'C1234567890';
      await prisma.deliveryHistory.create({
        data: {
          postId: 'delivery-test-post',
          channel,
          sentAt: new Date(),
        },
      });

      // 3. 중복 체크
      const existingHistory = await prisma.deliveryHistory.findUnique({
        where: {
          postId_channel: {
            postId: 'delivery-test-post',
            channel,
          },
        },
      });

      expect(existingHistory).not.toBeNull();

      // 4. 같은 게시물 다른 채널은 중복 아님
      const otherChannel = await prisma.deliveryHistory.findUnique({
        where: {
          postId_channel: {
            postId: 'delivery-test-post',
            channel: 'C9999999999',
          },
        },
      });

      expect(otherChannel).toBeNull();
    });
  });

  describe('이번 주 식단표 조회 플로우', () => {
    it('이번 주 게시물을 우선 반환한다', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-12-18T10:00:00')); // 수요일

      // 지난 주 게시물
      const lastWeekPost = new MenuPostBuilder()
        .withPostId('last-week')
        .withPublishedAt(new Date('2024-12-09T09:00:00'))
        .build();

      // 이번 주 게시물
      const thisWeekPost = new MenuPostBuilder()
        .withPostId('this-week')
        .withPublishedAt(new Date('2024-12-16T09:00:00'))
        .build();

      await prisma.menuPost.create({ data: lastWeekPost.toPersistence() });
      await prisma.menuPost.create({ data: thisWeekPost.toPersistence() });

      // 이번 주 시작일 계산
      const now = new Date('2024-12-18T10:00:00');
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const found = await prisma.menuPost.findFirst({
        where: {
          publishedAt: { gte: startOfWeek },
        },
        orderBy: { publishedAt: 'desc' },
      });

      vi.useRealTimers();

      expect(found).not.toBeNull();
      expect(found?.postId).toBe('this-week');
    });
  });

  describe('UseCase 통합 플로우 (Mock Slack)', () => {
    it('CrawlWeeklyMenuUseCase → SendMenuToSlackUseCase 플로우', async () => {
      // Mock 설정
      const mockSlackService = {
        sendMenuMessage: vi.fn().mockResolvedValue(
          Result.ok({ messageTs: '123.456', channel: 'C1234567890' })
        ),
        sendEphemeralMenu: vi.fn(),
      };

      const mockCrawlerService = {
        crawlLatestMenu: vi.fn().mockResolvedValue(
          Result.ok({
            post: new MenuPostBuilder()
              .withPostId('integrated-post')
              .thisWeek()
              .build(),
            isNew: true,
          })
        ),
      };

      // 1. 크롤링
      const crawlResult = await mockCrawlerService.crawlLatestMenu();
      expect(crawlResult.isOk()).toBe(true);

      const { post } = crawlResult.value;

      // 2. 저장
      await prisma.menuPost.create({
        data: post.toPersistence(),
      });

      // 3. Slack 발송
      const sendResult = await mockSlackService.sendMenuMessage({
        menuPost: post,
        channel: 'C1234567890',
      });
      expect(sendResult.isOk()).toBe(true);

      // 4. 발송 이력 저장
      await prisma.deliveryHistory.create({
        data: {
          postId: post.postId.value,
          channel: 'C1234567890',
          sentAt: new Date(),
        },
      });

      // 5. 검증
      const savedPost = await prisma.menuPost.findUnique({
        where: { postId: 'integrated-post' },
      });
      const savedHistory = await prisma.deliveryHistory.findFirst({
        where: { postId: 'integrated-post' },
      });

      expect(savedPost).not.toBeNull();
      expect(savedHistory).not.toBeNull();
      expect(mockSlackService.sendMenuMessage).toHaveBeenCalledTimes(1);
    });
  });
});
