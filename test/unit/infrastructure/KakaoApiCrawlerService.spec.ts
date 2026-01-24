import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { KakaoApiCrawlerService } from '@infrastructure/crawling/KakaoApiCrawlerService';

describe('KakaoApiCrawlerService', () => {
  let service: KakaoApiCrawlerService;

  beforeEach(() => {
    service = new KakaoApiCrawlerService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('crawlLatestMenu', () => {
    it('API 응답에서 최신 게시물을 파싱한다', async () => {
      const mockResponse = {
        items: [
          {
            id: 112166904,
            title: '이노밸리 구내식당 주간메뉴[01/19-01/23]',
            type: 'image',
            published_at: 1737350400000,
            created_at: 1737350400000,
            media: [
              {
                type: 'image',
                url: 'http://k.kakaocdn.net/dn/test/img.jpg',
                xlarge_url: 'http://k.kakaocdn.net/dn/test/img_xl.jpg',
                width: 1059,
                height: 721,
              },
            ],
            permalink: 'http://pf.kakao.com/_LCxlxlxb/112166904',
            status: 'published',
          },
        ],
        has_next: true,
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.crawlLatestMenu();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.post.postId.value).toBe('112166904');
        expect(result.value.post.title).toBe('이노밸리 구내식당 주간메뉴[01/19-01/23]');
        expect(result.value.post.imageUrl.value).toBe(
          'http://k.kakaocdn.net/dn/test/img_xl.jpg'
        );
      }
    });

    it('xlarge_url이 없으면 url을 사용한다', async () => {
      const mockResponse = {
        items: [
          {
            id: 123,
            title: '테스트 메뉴',
            type: 'image',
            published_at: 1737350400000,
            created_at: 1737350400000,
            media: [
              {
                type: 'image',
                url: 'http://k.kakaocdn.net/dn/test/img.jpg',
                width: 800,
                height: 600,
              },
            ],
            permalink: 'http://pf.kakao.com/_LCxlxlxb/123',
            status: 'published',
          },
        ],
        has_next: false,
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.crawlLatestMenu();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.post.imageUrl.value).toBe(
          'http://k.kakaocdn.net/dn/test/img.jpg'
        );
      }
    });

    it('게시물이 없으면 에러를 반환한다', async () => {
      const mockResponse = {
        items: [],
        has_next: false,
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.crawlLatestMenu();

      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error.message).toContain('게시물을 찾을 수 없습니다');
      }
    });

    it('미디어가 없으면 에러를 반환한다', async () => {
      const mockResponse = {
        items: [
          {
            id: 123,
            title: '테스트',
            type: 'text',
            published_at: 1737350400000,
            created_at: 1737350400000,
            media: [],
            permalink: 'http://pf.kakao.com/_LCxlxlxb/123',
            status: 'published',
          },
        ],
        has_next: false,
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.crawlLatestMenu();

      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error.message).toContain('이미지 URL을 찾을 수 없습니다');
      }
    });

    it('API 요청 실패시 에러를 반환한다', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const result = await service.crawlLatestMenu();

      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error.message).toContain('API 요청 실패');
      }
    });

    it('네트워크 에러시 에러를 반환한다', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

      const result = await service.crawlLatestMenu();

      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error.message).toContain('Network error');
      }
    });

    it('channelUrl에서 채널 ID를 추출한다', async () => {
      const mockResponse = {
        items: [
          {
            id: 456,
            title: '다른 채널 메뉴',
            type: 'image',
            published_at: 1737350400000,
            created_at: 1737350400000,
            media: [{ type: 'image', url: 'http://test.com/img.jpg', width: 100, height: 100 }],
            permalink: 'http://pf.kakao.com/_TestChannel/456',
            status: 'published',
          },
        ],
        has_next: false,
      };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await service.crawlLatestMenu({
        channelUrl: 'https://pf.kakao.com/_TestChannel/posts',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('_TestChannel'),
        expect.any(Object)
      );
    });
  });
});
