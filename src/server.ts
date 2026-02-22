import 'reflect-metadata';
import { container } from 'tsyringe';
import { createApp } from './app';
import { env } from '@config/environment';
import { SlackBotService, CronScheduler } from '@infrastructure/index';
import { registerMenuCommand } from '@interface/slack';

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
      await slackApp.start();
      console.log('⚡ Slack Bot 시작됨 (Socket Mode)');
    }
  } catch (error) {
    console.warn('⚠️ Slack Bot 초기화 실패:', error);
    console.warn('   Slack 관련 기능이 비활성화됩니다.');
  }
  // Cron 스케줄러 시작
  try {
    const scheduler = container.resolve(CronScheduler);
    scheduler.start();
    console.log('⏰ 스케줄러 시작됨 (매주 월요일 09:00 KST)');
  } catch (error) {
    console.warn('⚠️ 스케줄러 초기화 실패:', error);
  }
  // Express 서버 시작
  app.listen(env.port, () => {
    console.log(`\n✅ 서버 실행 중: http://localhost:${env.port}`);
    console.log(`   환경: ${env.nodeEnv}`);
    console.log(`\n📋 엔드포인트:`);
    console.log(`   GET  /health           - 헬스체크`);
    console.log(`   GET  /api/menu/latest  - 최신 식단표 조회`);
    console.log(`\n🤖 Slack 커맨드:`);
    console.log(`   /식단                  - 이번 주 식단표 조회`);
  });
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  console.log(`\n👋 ${signal} 수신, 서버 종료 중...`);
  try {
    if (slackApp) {
      await slackApp.stop();
      console.log('✅ Slack Bot 정상 종료');
    }
  } catch (error) {
    console.error('⚠️ Slack Bot 종료 실패:', error);
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// 시작
bootstrap().catch((error) => {
  console.error('❌ 서버 시작 실패:', error);
  process.exit(1);
});
