import { injectable } from 'tsyringe';
import { MenuPost } from '@domain/entities';
import { IMenuPostRepository } from '@domain/repositories';
import { getPrismaClient } from './PrismaClient';

/**
 * 식단표 게시물 Repository Prisma 구현체
 */
@injectable()
export class MenuPostRepository implements IMenuPostRepository {
  private get prisma() {
    return getPrismaClient();
  }

  async save(post: MenuPost): Promise<MenuPost> {
    const data = post.toPersistence();

    const saved = await this.prisma.menuPost.upsert({
      where: { postId: data.postId },
      create: data,
      update: data,
    });

    return MenuPost.fromPersistence(saved);
  }

  async findByPostId(postId: string): Promise<MenuPost | null> {
    const found = await this.prisma.menuPost.findUnique({
      where: { postId },
    });

    return found ? MenuPost.fromPersistence(found) : null;
  }

  async findLatest(): Promise<MenuPost | null> {
    const found = await this.prisma.menuPost.findFirst({
      orderBy: { publishedAt: 'desc' },
    });

    return found ? MenuPost.fromPersistence(found) : null;
  }

  async findThisWeek(): Promise<MenuPost | null> {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const found = await this.prisma.menuPost.findFirst({
      where: {
        publishedAt: { gte: startOfWeek },
      },
      orderBy: { publishedAt: 'desc' },
    });

    return found ? MenuPost.fromPersistence(found) : null;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<MenuPost[]> {
    const found = await this.prisma.menuPost.findMany({
      where: {
        publishedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    return found.map((p) => MenuPost.fromPersistence(p));
  }
}
