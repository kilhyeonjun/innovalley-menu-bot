import express, { Application } from 'express';
import { setupContainer } from '@config/container';
import { healthRouter, menuRouter, errorHandler } from '@interface/http';

/**
 * Express 앱 생성
 */
export function createApp(): Application {
  // DI 컨테이너 초기화
  setupContainer();

  const app = express();

  // 미들웨어
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 라우터
  app.use('/health', healthRouter);
  app.use('/api/menu', menuRouter);

  // 에러 핸들러
  app.use(errorHandler);

  return app;
}
