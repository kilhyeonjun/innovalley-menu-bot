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
const CHANNEL_ID = '_LCxlxlxb';

interface CrawledData {
  postId: string;
  title: string;
  imageUrl: string;
  publishedAt: Date;
}

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

  private async crawlPage(url: string): Promise<CrawledData> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const firstPostInfo = await this.extractFirstPostInfo(page);

      if (!firstPostInfo.postId || !firstPostInfo.title) {
        throw new Error(`목록에서 게시물 정보를 찾을 수 없습니다`);
      }

      const detailUrl = `https://pf.kakao.com/${CHANNEL_ID}/${firstPostInfo.postId}`;
      await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      const imageUrl = await this.extractImageUrl(page);

      if (!imageUrl) {
        throw new Error(`이미지 URL을 찾을 수 없습니다`);
      }

      return {
        postId: firstPostInfo.postId,
        title: firstPostInfo.title,
        imageUrl,
        publishedAt: this.parseDate(firstPostInfo.dateText),
      };
    } finally {
      await page.close();
    }
  }

  private async extractFirstPostInfo(
    page: Page
  ): Promise<{ postId: string; title: string; dateText: string }> {
    return await page.evaluate((channelId) => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      let postId = '';
      let title = '';
      let dateText = '';

      for (const link of links) {
        const href = link.getAttribute('href') || '';
        const match = href.match(new RegExp(`/${channelId}/(\\d+)$`));

        if (match) {
          postId = match[1];

          const strongInLink = link.querySelector('strong');
          if (strongInLink) {
            title = strongInLink.textContent?.trim() || '';
          }

          const parent = link.closest('div, generic, article');
          if (parent) {
            const allElements = Array.from(parent.querySelectorAll('div, span'));
            const dateEl = allElements.find(
              (el) => /^\d{4}\.\d{2}\.\d{2}\.$/.test(el.textContent?.trim() || '')
            );
            dateText = dateEl?.textContent?.trim() || '';
          }

          if (postId && title) break;
        }
      }

      return { postId, title, dateText };
    }, CHANNEL_ID);
  }

  private async extractImageUrl(page: Page): Promise<string> {
    return await page.evaluate(() => {
      const img = document.querySelector('img[alt="이미지"]') as HTMLImageElement | null;
      if (img?.src) {
        return img.src.startsWith('http') ? img.src : `https:${img.src}`;
      }

      const contentImg = document.querySelector('main img, [class*="content"] img') as HTMLImageElement | null;
      if (contentImg?.src) {
        return contentImg.src.startsWith('http') ? contentImg.src : `https:${contentImg.src}`;
      }

      return '';
    });
  }

  private parseDate(dateText: string): Date {
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

    const dateMatch = dateText.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
    if (dateMatch) {
      return new Date(
        parseInt(dateMatch[1]),
        parseInt(dateMatch[2]) - 1,
        parseInt(dateMatch[3])
      );
    }

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
