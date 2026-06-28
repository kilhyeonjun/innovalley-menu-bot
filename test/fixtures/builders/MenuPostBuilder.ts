import { MenuPost } from '@domain/entities';
import { PrismaClient } from '@prisma/client';

interface MenuPostBuilderProps {
  id?: string;
  postId: string;
  title: string;
  imageUrl: string;
  publishedAt: Date;
  crawledAt: Date;
}

/**
 * MenuPost 테스트 빌더
 */
export class MenuPostBuilder {
  private explicitTitle = false;

  private props: MenuPostBuilderProps = {
    postId: 'test-post-123',
    title: '주간메뉴[12/22-12/26]',
    imageUrl: 'https://k.kakaocdn.net/dn/test/menu.jpg',
    publishedAt: new Date(),
    crawledAt: new Date(),
  };

  withId(id: string): this {
    this.props.id = id;
    return this;
  }

  withPostId(postId: string): this {
    this.props.postId = postId;
    return this;
  }

  withTitle(title: string): this {
    this.props.title = title;
    this.explicitTitle = true;
    return this;
  }

  withImageUrl(imageUrl: string): this {
    this.props.imageUrl = imageUrl;
    return this;
  }

  withPublishedAt(publishedAt: Date): this {
    this.props.publishedAt = publishedAt;
    if (!this.explicitTitle) {
      this.props.title = this.titleForWeekOf(publishedAt);
    }
    return this;
  }

  withCrawledAt(crawledAt: Date): this {
    this.props.crawledAt = crawledAt;
    return this;
  }

  /**
   * 이번 주 게시물로 설정
   */
  thisWeek(): this {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // 월요일
    startOfWeek.setHours(9, 0, 0, 0);
    return this.withPublishedAt(startOfWeek);
  }

  /**
   * 지난 주 게시물로 설정
   */
  lastWeek(): this {
    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);
    return this.withPublishedAt(lastWeek);
  }

  private titleForWeekOf(date: Date): string {
    const monday = new Date(date);
    const dayOfWeek = monday.getDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    monday.setDate(date.getDate() - daysSinceMonday);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const format = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `주간메뉴[${format(monday)}-${format(friday)}]`;
  }

  /**
   * MenuPost 엔티티 생성
   */
  build(): MenuPost {
    return MenuPost.create(this.props);
  }

  /**
   * 빌더 속성 반환 (테스트용)
   */
  getProps(): MenuPostBuilderProps {
    return { ...this.props };
  }

  /**
   * DB에 저장하고 엔티티 반환
   */
  async persist(prisma: PrismaClient): Promise<MenuPost> {
    const data = await prisma.menuPost.create({
      data: {
        postId: this.props.postId,
        title: this.props.title,
        imageUrl: this.props.imageUrl,
        publishedAt: this.props.publishedAt,
        crawledAt: this.props.crawledAt,
      },
    });

    return MenuPost.fromPersistence({
      id: data.id,
      postId: data.postId,
      title: data.title,
      imageUrl: data.imageUrl,
      publishedAt: data.publishedAt,
      crawledAt: data.crawledAt,
    });
  }
}
