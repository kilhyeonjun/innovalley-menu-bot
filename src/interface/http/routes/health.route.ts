import { Router } from 'express';

const router = Router();

/**
 * 헬스체크 엔드포인트
 */
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
