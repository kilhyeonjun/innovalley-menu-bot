import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MenuPost } from '@domain/entities';
import { MenuPostBuilder } from '../../fixtures/builders';

describe('MenuPost', () => {
  describe('create', () => {
    it('유효한 데이터로 생성한다', () => {
      const post = new MenuPostBuilder().build();

      expect(post.postId.value).toBe('test-post-123');
      expect(post.title).toBe('주간메뉴[12/22-12/26]');
      expect(post.imageUrl.value).toBe('https://k.kakaocdn.net/dn/test/menu.jpg');
    });

    it('crawledAt이 없으면 현재 시간으로 설정한다', () => {
      const before = new Date();
      const post = MenuPost.create({
        postId: 'test-123',
        title: 'Test',
        imageUrl: 'https://example.com/image.jpg',
        publishedAt: new Date(),
      });
      const after = new Date();

      expect(post.crawledAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(post.crawledAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('빈 postId는 ValidationError를 던진다', () => {
      expect(() =>
        MenuPost.create({
          postId: '',
          title: 'Test',
          imageUrl: 'https://example.com/image.jpg',
          publishedAt: new Date(),
        })
      ).toThrow('PostId는 빈 값일 수 없습니다');
    });

    it('유효하지 않은 imageUrl은 ValidationError를 던진다', () => {
      expect(() =>
        MenuPost.create({
          postId: 'test-123',
          title: 'Test',
          imageUrl: 'invalid-url',
          publishedAt: new Date(),
        })
      ).toThrow('유효하지 않은 이미지 URL입니다');
    });
  });

  describe('fromPersistence', () => {
    it('DB 레코드에서 복원한다', () => {
      const data = {
        id: 'uuid-123',
        postId: 'post-456',
        title: '주간메뉴[12/16-12/20]',
        imageUrl: 'https://example.com/menu.jpg',
        publishedAt: new Date('2024-12-16'),
        crawledAt: new Date('2024-12-16'),
      };

      const post = MenuPost.fromPersistence(data);

      expect(post.id).toBe('uuid-123');
      expect(post.postId.value).toBe('post-456');
      expect(post.title).toBe('주간메뉴[12/16-12/20]');
    });
  });

  describe('isThisWeek', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('이번 주 게시물이면 true를 반환한다', () => {
      // 2024-12-18 수요일로 설정
      vi.setSystemTime(new Date('2024-12-18T10:00:00'));

      // 같은 주 월요일
      const post = new MenuPostBuilder()
        .withPublishedAt(new Date('2024-12-16T09:00:00'))
        .build();

      expect(post.isThisWeek()).toBe(true);
    });

    it('지난 주 게시물이면 false를 반환한다', () => {
      // 2024-12-18 수요일로 설정
      vi.setSystemTime(new Date('2024-12-18T10:00:00'));

      // 지난 주 월요일
      const post = new MenuPostBuilder()
        .withPublishedAt(new Date('2024-12-09T09:00:00'))
        .build();

      expect(post.isThisWeek()).toBe(false);
    });

    it('일요일에 이번 주 판단이 정확하다', () => {
      // 2024-12-22 일요일로 설정
      // 주의: JavaScript에서 일요일(0)이 주의 시작
      vi.setSystemTime(new Date('2024-12-22T10:00:00'));

      // 같은 주 일요일 (일요일이 주의 시작)
      const post = new MenuPostBuilder()
        .withPublishedAt(new Date('2024-12-22T09:00:00'))
        .build();

      expect(post.isThisWeek()).toBe(true);

      // 지난 주 토요일은 false
      const lastWeekPost = new MenuPostBuilder()
        .withPublishedAt(new Date('2024-12-21T09:00:00'))
        .build();

      expect(lastWeekPost.isThisWeek()).toBe(false);
    });
  });

  describe('getWeekRange', () => {
    it('제목에서 주간 범위를 추출한다', () => {
      const post = new MenuPostBuilder()
        .withTitle('주간메뉴[12/22-12/26]')
        .build();

      const range = post.getWeekRange();

      expect(range).toEqual({ start: '12/22', end: '12/26' });
    });

    it('한 자리 날짜도 추출한다', () => {
      const post = new MenuPostBuilder()
        .withTitle('주간메뉴[1/2-1/6]')
        .build();

      const range = post.getWeekRange();

      expect(range).toEqual({ start: '1/2', end: '1/6' });
    });

    it('범위가 없으면 null을 반환한다', () => {
      const post = new MenuPostBuilder()
        .withTitle('이번 주 메뉴입니다')
        .build();

      expect(post.getWeekRange()).toBeNull();
    });

    it('잘못된 형식은 null을 반환한다', () => {
      const post = new MenuPostBuilder()
        .withTitle('주간메뉴(12월22일~26일)')
        .build();

      expect(post.getWeekRange()).toBeNull();
    });
  });

  describe('toPersistence', () => {
    it('영속화를 위한 plain object를 반환한다', () => {
      const publishedAt = new Date('2024-12-16');
      const crawledAt = new Date('2024-12-16');

      const post = new MenuPostBuilder()
        .withPostId('post-789')
        .withTitle('주간메뉴[12/16-12/20]')
        .withImageUrl('https://example.com/menu.jpg')
        .withPublishedAt(publishedAt)
        .withCrawledAt(crawledAt)
        .build();

      const persistence = post.toPersistence();

      expect(persistence).toEqual({
        postId: 'post-789',
        title: '주간메뉴[12/16-12/20]',
        imageUrl: 'https://example.com/menu.jpg',
        publishedAt,
        crawledAt,
      });
    });
  });
});
