import { describe, it, expect } from 'vitest';
import { PlaywrightCrawlerService } from '@infrastructure/crawling/PlaywrightCrawlerService';

/**
 * Playwright 크롤러 통합 테스트
 *
 * 실제 네트워크 요청이 발생하므로:
 * - 실행 시간이 오래 걸림 (10초 이상)
 * - 네트워크 환경에 따라 실패 가능
 * - CI에서는 선택적으로 실행
 */
describe('PlaywrightCrawlerService (Integration)', () => {
  const crawlerService = new PlaywrightCrawlerService();

  // 실제 크롤링 테스트 (느림, 네트워크 의존)
  // CI에서 실행하려면 INTEGRATION_TEST=true 설정
  const runIntegrationTests = process.env.INTEGRATION_TEST === 'true';

  describe.skipIf(!runIntegrationTests)('실제 크롤링', () => {
    it(
      '카카오 채널에서 최신 게시물을 가져온다',
      async () => {
        const result = await crawlerService.crawlLatestMenu();

        expect(result.isOk()).toBe(true);

        const { post, isNew } = result.value;
        expect(post.postId.value).toBeDefined();
        expect(post.title).toBeDefined();
        expect(post.imageUrl.value).toContain('kakaocdn.net');
        expect(typeof isNew).toBe('boolean');
      },
      { timeout: 30000 }
    );

    it(
      '이미지 URL이 카카오 CDN URL이다',
      async () => {
        const result = await crawlerService.crawlLatestMenu();

        expect(result.isOk()).toBe(true);
        expect(result.value.post.imageUrl.isKakaoCdn()).toBe(true);
      },
      { timeout: 30000 }
    );
  });

  // Mock 없이 구조 검증 테스트
  describe('구조 검증', () => {
    it('CrawlerService 인터페이스를 구현한다', () => {
      expect(crawlerService.crawlLatestMenu).toBeDefined();
      expect(typeof crawlerService.crawlLatestMenu).toBe('function');
    });
  });
});
