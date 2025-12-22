import { MenuPost } from '@domain/entities';
import { Result } from '@shared/types/Result';
import { CrawlingError } from '@shared/errors/DomainError';

export interface CrawlLatestMenuCriteria {
  channelUrl?: string;
}

export interface CrawlLatestMenuResult {
  post: MenuPost;
  isNew: boolean;
}

/**
 * 크롤러 서비스 인터페이스
 */
export interface ICrawlerService {
  /**
   * 최신 주간 식단표 크롤링
   */
  crawlLatestMenu(
    criteria?: CrawlLatestMenuCriteria
  ): Promise<Result<CrawlLatestMenuResult, CrawlingError>>;
}

export const ICrawlerService = Symbol('ICrawlerService');
