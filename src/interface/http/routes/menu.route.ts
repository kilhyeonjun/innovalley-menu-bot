import { Router, Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { CrawlWeeklyMenuUseCase } from '@application/use-cases';

const router = Router();

/**
 * 최신 식단표 조회 (크롤링)
 * GET /api/menu/latest
 */
router.get(
  '/latest',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const forceRefresh = req.query.force === 'true';
      const useCase = container.resolve(CrawlWeeklyMenuUseCase);
      const result = await useCase.execute({ forceRefresh });

      if (result.isError()) {
        res.status(500).json({
          success: false,
          error: result.error.message,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          postId: result.value.post.postId.value,
          title: result.value.post.title,
          imageUrl: result.value.post.imageUrl.value,
          publishedAt: result.value.post.publishedAt,
          isNewPost: result.value.isNewPost,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
