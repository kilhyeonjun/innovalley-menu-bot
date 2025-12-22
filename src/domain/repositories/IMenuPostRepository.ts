import { MenuPost } from '@domain/entities';

/**
 * 식단표 게시물 Repository 인터페이스
 */
export interface IMenuPostRepository {
  /**
   * 게시물 저장
   */
  save(post: MenuPost): Promise<MenuPost>;

  /**
   * postId로 조회 (없으면 null)
   */
  findByPostId(postId: string): Promise<MenuPost | null>;

  /**
   * 가장 최근 게시물 조회
   */
  findLatest(): Promise<MenuPost | null>;

  /**
   * 이번 주 게시물 조회
   */
  findThisWeek(): Promise<MenuPost | null>;

  /**
   * 날짜 범위로 조회
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<MenuPost[]>;
}

export const IMenuPostRepository = Symbol('IMenuPostRepository');
