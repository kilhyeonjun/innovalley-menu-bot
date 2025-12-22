import { injectable } from 'tsyringe';
import { chromium, Browser, Page } from 'playwright';
import { MenuPost } from '@domain/entities';
import {
  ICrawlerService,
  CrawlLatestMenuCriteria,
  CrawlLatestMenuResult,
} from '@domain/services';
import { Result } from '@shared/types/Result';
import { CrawlingError } from '@shared/errors/DomainError';

const DEFAULT_CHANNEL_URL = 'https://pf.kakao.com/_LCxlxlxb/posts';

interface CrawledData {
  postId: string;
  title: string;
  imageUrl: string;
  publishedAt: Date;
}

/**
 * Playwright 기반 크롤러 서비스
 * 판교 이노밸리 구내식당 카카오 채널 크롤링
 */
@injectable()
export class PlaywrightCrawlerService implements ICrawlerService {
  private browser: Browser | null = null;

  async crawlLatestMenu(
    criteria: CrawlLatestMenuCriteria = {}
  ): Promise<Result<CrawlLatestMenuResult, CrawlingError>> {
    const channelUrl = criteria.channelUrl || DEFAULT_CHANNEL_URL;

    try {
      const data = await this.crawlPage(channelUrl);

      const post = MenuPost.create({
        postId: data.postId,
        title: data.title,
        imageUrl: data.imageUrl,
        publishedAt: data.publishedAt,
      });

      return Result.ok({
        post,
        isNew: true, // Repository에서 중복 체크
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

  private async crawlPage(url: string): Promise<CrawledData> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // 페이지 로딩 대기
      await page.waitForTimeout(2000);

      // 데이터 추출
      const data = await this.extractData(page);

      return data;
    } finally {
      await page.close();
    }
  }

  private async extractData(page: Page): Promise<CrawledData> {
    // 게시물 정보 추출
    const result = await page.evaluate(() => {
      // 첫 번째 게시물 카드에서 링크 추출
      const linkElement = document.querySelector('a[href*="/posts/"]') as HTMLAnchorElement | null;
      const postUrl = linkElement?.href || '';
      const postIdMatch = postUrl.match(/\/(\d+)$/);
      const postId = postIdMatch ? postIdMatch[1] : '';

      // 제목 추출
      const titleElement = document.querySelector('.tit_card');
      const title = titleElement?.textContent?.trim() || '';

      // 이미지 URL 추출 (background-image 스타일에서)
      const imageContainer = document.querySelector('.wrap_fit_thumb') as HTMLElement | null;
      let imageUrl = '';
      if (imageContainer) {
        const bgImage = imageContainer.style.backgroundImage;
        const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
        imageUrl = urlMatch ? urlMatch[1] : '';
      }

      // 날짜 추출
      const dateElement = document.querySelector('.txt_date');
      const dateText = dateElement?.textContent?.trim() || '';

      return { postId, title, imageUrl, dateText };
    });

    if (!result.postId || !result.title || !result.imageUrl) {
      throw new Error(
        `필수 데이터 누락: postId=${result.postId}, title=${result.title}, imageUrl=${result.imageUrl ? 'exists' : 'missing'}`
      );
    }

    // 날짜 파싱
    const publishedAt = this.parseDate(result.dateText);

    return {
      postId: result.postId,
      title: result.title,
      imageUrl: result.imageUrl,
      publishedAt,
    };
  }

  private parseDate(dateText: string): Date {
    // "2시간 전", "1일 전", "2025.12.22." 등의 형식 처리
    const now = new Date();

    if (dateText.includes('시간 전')) {
      const hours = parseInt(dateText) || 1;
      return new Date(now.getTime() - hours * 60 * 60 * 1000);
    }

    if (dateText.includes('분 전')) {
      const minutes = parseInt(dateText) || 1;
      return new Date(now.getTime() - minutes * 60 * 1000);
    }

    if (dateText.includes('일 전')) {
      const days = parseInt(dateText) || 1;
      return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // YYYY.MM.DD. 형식
    const dateMatch = dateText.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    if (dateMatch) {
      return new Date(
        parseInt(dateMatch[1]),
        parseInt(dateMatch[2]) - 1,
        parseInt(dateMatch[3])
      );
    }

    // 파싱 실패 시 현재 시간
    return now;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
