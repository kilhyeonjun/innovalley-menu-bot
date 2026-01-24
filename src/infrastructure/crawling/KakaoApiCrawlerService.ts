import { injectable } from 'tsyringe';
import { MenuPost } from '@domain/entities';
import {
  ICrawlerService,
  CrawlLatestMenuCriteria,
  CrawlLatestMenuResult,
} from '@domain/services';
import { Result } from '@shared/types/Result';
import { CrawlingError } from '@shared/errors/DomainError';

const DEFAULT_CHANNEL_ID = '_LCxlxlxb';

interface KakaoMedia {
  type: string;
  url: string;
  xlarge_url?: string;
  large_url?: string;
  medium_url?: string;
  small_url?: string;
  width: number;
  height: number;
  mimetype?: string;
}

interface KakaoPost {
  id: number;
  title: string;
  type: string;
  published_at: number;
  created_at: number;
  media: KakaoMedia[];
  permalink: string;
  status: string;
  like_count?: number;
  share_count?: number;
  comment_count?: number;
}

interface KakaoPostsResponse {
  items: KakaoPost[];
  has_next: boolean;
}

/**
 * 카카오 채널 내부 JSON API를 사용하는 크롤러 서비스
 *
 * Playwright 기반 HTML 파싱 대신 카카오의 내부 API를 직접 호출하여
 * 안정적이고 빠른 데이터 수집이 가능합니다.
 *
 * API Endpoint: https://pf.kakao.com/rocket-web/web/profiles/{channelId}/posts
 */
@injectable()
export class KakaoApiCrawlerService implements ICrawlerService {
  private readonly userAgent =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  async crawlLatestMenu(
    criteria: CrawlLatestMenuCriteria = {}
  ): Promise<Result<CrawlLatestMenuResult, CrawlingError>> {
    const channelId = this.extractChannelId(criteria.channelUrl) || DEFAULT_CHANNEL_ID;

    try {
      const latestPost = await this.fetchLatestPost(channelId);

      if (!latestPost) {
        return Result.fail(new CrawlingError('게시물을 찾을 수 없습니다'));
      }

      const imageUrl = this.extractImageUrl(latestPost);
      if (!imageUrl) {
        return Result.fail(new CrawlingError('이미지 URL을 찾을 수 없습니다'));
      }

      const post = MenuPost.create({
        postId: String(latestPost.id),
        title: latestPost.title,
        imageUrl,
        publishedAt: new Date(latestPost.published_at),
      });

      return Result.ok({
        post,
        isNew: true,
      });
    } catch (error) {
      return Result.fail(
        new CrawlingError(
          `크롤링 실패: ${error instanceof Error ? error.message : String(error)}`,
          error
        )
      );
    }
  }

  private async fetchLatestPost(channelId: string): Promise<KakaoPost | null> {
    const url = `https://pf.kakao.com/rocket-web/web/profiles/${channelId}/posts?includePinnedPost=true`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        Accept: 'application/json',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: `https://pf.kakao.com/${channelId}/posts`,
      },
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
    }

    const data: KakaoPostsResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    return data.items[0];
  }

  private extractImageUrl(post: KakaoPost): string | null {
    if (!post.media || post.media.length === 0) {
      return null;
    }

    const imageMedia = post.media.find((m) => m.type === 'image');
    if (!imageMedia) {
      return null;
    }

    const url =
      imageMedia.xlarge_url ||
      imageMedia.large_url ||
      imageMedia.medium_url ||
      imageMedia.url;

    if (!url) {
      return null;
    }

    return url.startsWith('http') ? url : `https:${url}`;
  }

  private extractChannelId(channelUrl?: string): string | null {
    if (!channelUrl) {
      return null;
    }

    const match = channelUrl.match(/pf\.kakao\.com\/([^/]+)/);
    return match ? match[1] : null;
  }
}
