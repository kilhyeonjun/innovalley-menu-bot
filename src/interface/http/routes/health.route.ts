import { Router } from 'express';
import { container } from 'tsyringe';
import { CronScheduler } from '@infrastructure/scheduling/CronScheduler';

const router = Router();

/**
 * 헬스체크 엔드포인트
 */
router.get('/', (_req, res) => {
  const scheduler = container.resolve(CronScheduler).getStatus();
  res.status(scheduler.healthy ? 200 : 503).json({
    status: scheduler.healthy ? 'ok' : 'degraded',
    scheduler,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
