import { PostId, ImageUrl } from '@domain/value-objects';

export interface MenuPostProps {
  id?: string;
  postId: string;
  title: string;
  imageUrl: string;
  publishedAt: Date;
  crawledAt?: Date;
}

/**
 * 식단표 게시물 엔티티
 */
export class MenuPost {
  private constructor(
    public readonly id: string | undefined,
    public readonly postId: PostId,
    public readonly title: string,
    public readonly imageUrl: ImageUrl,
    public readonly publishedAt: Date,
    public readonly crawledAt: Date
  ) {}

  static create(props: MenuPostProps): MenuPost {
    return new MenuPost(
      props.id,
      PostId.create(props.postId),
      props.title,
      ImageUrl.create(props.imageUrl),
      props.publishedAt,
      props.crawledAt ?? new Date()
    );
  }

  /**
   * DB 레코드에서 MenuPost 복원
   */
  static fromPersistence(data: {
    id: string;
    postId: string;
    title: string;
    imageUrl: string;
    publishedAt: Date;
    crawledAt: Date;
  }): MenuPost {
    return new MenuPost(
      data.id,
      PostId.create(data.postId),
      data.title,
      ImageUrl.create(data.imageUrl),
      data.publishedAt,
      data.crawledAt
    );
  }

  /**
   * 이번 주 게시물인지 확인
   * 제목의 주간 범위 [MM/DD-MM/DD]를 우선 확인하고,
   * 없으면 publishedAt 기준으로 판단
   */
  isThisWeek(): boolean {
    const now = new Date();
    const thisMonday = new Date(now);
    const dayOfWeek = now.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    thisMonday.setDate(now.getDate() - daysSinceMonday);
    thisMonday.setHours(0, 0, 0, 0);

    // 제목에서 주간 범위 추출 시도
    const weekRange = this.getWeekRange();
    if (weekRange) {
      // 제목의 시작 날짜가 이번 주 월요일인지 확인
      const [startMonth, startDay] = weekRange.start.split('/').map(Number);
      const titleMonday = new Date(now.getFullYear(), startMonth - 1, startDay);

      // 연말/연초 처리: 1월인데 제목이 12월이면 작년
      if (now.getMonth() === 0 && startMonth === 12) {
        titleMonday.setFullYear(now.getFullYear() - 1);
      }
      // 12월인데 제목이 1월이면 내년
      if (now.getMonth() === 11 && startMonth === 1) {
        titleMonday.setFullYear(now.getFullYear() + 1);
      }

      return (
        titleMonday.getMonth() === thisMonday.getMonth() &&
        titleMonday.getDate() === thisMonday.getDate()
      );
    }

    // 제목에서 범위 못 찾으면 기존 publishedAt 로직 사용
    return this.publishedAt >= thisMonday;
  }

  /**
   * 제목에서 주간 범위 추출 (예: [12/22-12/26])
   */
  getWeekRange(): { start: string; end: string } | null {
    const match = this.title.match(/\[(\d{1,2}\/\d{1,2})-(\d{1,2}\/\d{1,2})\]/);
    if (!match) return null;
    return { start: match[1], end: match[2] };
  }

  /**
   * 영속화를 위한 plain object 변환
   */
  toPersistence(): {
    postId: string;
    title: string;
    imageUrl: string;
    publishedAt: Date;
    crawledAt: Date;
  } {
    return {
      postId: this.postId.value,
      title: this.title,
      imageUrl: this.imageUrl.value,
      publishedAt: this.publishedAt,
      crawledAt: this.crawledAt,
    };
  }
}
