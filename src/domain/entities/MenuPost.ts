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
   */
  isThisWeek(): boolean {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    return this.publishedAt >= startOfWeek;
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
