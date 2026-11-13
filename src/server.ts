import 'reflect-metadata';
import { container } from 'tsyringe';
import { createApp } from './app';
import { env } from '@config/environment';
import { SlackBotService } from '@infrastructure/index';
import { registerMenuCommand } from '@interface/slack';
import { CronScheduler } from '@infrastructure/scheduling/CronScheduler';
import { Server } from 'node:http';

let scheduler: CronScheduler | null = null;
let server: Server | null = null;
let shuttingDown = false;

let slackApp: import('@slack/bolt').App | null = null;
async function bootstrap(): Promise<void> {
  console.log('🚀 서버 시작 중...');
  const app = createApp();
  try {
    const slackService = container.resolve(SlackBotService);
    slackApp = slackService.getSlackApp();

    // 글로벌 에러 핸들러 (크래시 방지)
    slackApp.error(async (error) => {
      console.error('[Slack] 처리되지 않은 에러:', error);
    });
    // 모든 Slack 요청 로깅 미들웨어
    slackApp.use(async ({ payload, next }) => {
      console.log(`[Slack] 요청 수신: type=${(payload as { type?: string }).type || 'unknown'}`);
      await next();
    });
    // 슬래시 커맨드 등록
    registerMenuCommand(slackApp);
    if (env.slackAppToken) {
      // Keep HTTP startup independent, but never hide a failed Slack initialization as healthy.
      slackApp
        .start()
        .then(() => console.log('⚡ Slack Bot 시작됨 (Socket Mode)'))
        .catch((error) => {
          console.error('❌ Slack Bot 시작 실패:', error);
          void shutdown('SLACK_ERROR');
        });
    }
  } catch (error) {
    throw new Error(`Slack Bot 초기화 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
  scheduler = container.resolve(CronScheduler);
  scheduler.start();
  // Express 서버 시작
  server = app.listen(env.port, () => {
    console.log(`\n✅ 서버 실행 중: http://localhost:${env.port}`);
    console.log(`   환경: ${env.nodeEnv}`);
    console.log(`\n📋 엔드포인트:`);
    console.log(`   GET  /health           - 헬스체크`);
    console.log(`   GET  /api/menu/latest  - 최신 식단표 조회`);
    console.log(`\n🤖 Slack 커맨드:`);
    console.log(`   /식단                  - 이번 주 식단표 조회`);
  });
  server.on('error', (error) => {
    console.error('❌ HTTP 서버 실패:', error);
    void shutdown('HTTP_ERROR');
  });
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n👋 ${signal} 수신, 서버 종료 중...`);
  try {
    // Stop accepting HTTP work, then drain cron and existing requests before exiting.
    const closed = server
      ? new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()))
      : Promise.resolve();
    await scheduler?.stop();
    await closed;
    if (slackApp) {
      await slackApp.stop();
      console.log('✅ Slack Bot 정상 종료');
    }
  } catch (error) {
    console.error('⚠️ Slack Bot 종료 실패:', error);
  }
  process.exit(signal === 'HTTP_ERROR' || signal === 'SLACK_ERROR' ? 1 : 0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// 시작
bootstrap().catch((error) => {
  console.error('❌ 서버 시작 실패:', error);
  process.exit(1);
});
