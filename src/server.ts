import 'reflect-metadata';
import { container } from 'tsyringe';
import { createApp } from './app';
import { env } from '@config/environment';
import { SlackBotService, CronScheduler } from '@infrastructure/index';
import { registerMenuCommand } from '@interface/slack';

async function bootstrap(): Promise<void> {
  console.log('🚀 서버 시작 중...');

  // Express 앱 생성
  const app = createApp();

  // Slack Bot 설정
  try {
    const slackService = container.resolve(SlackBotService);
    const slackApp = slackService.getSlackApp();

    // 슬래시 커맨드 등록
    registerMenuCommand(slackApp);

    // Socket Mode로 Slack 앱 시작 (Socket Mode 사용 시)
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

// 프로세스 종료 핸들링
process.on('SIGINT', async () => {
  console.log('\n👋 서버 종료 중...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 서버 종료 중...');
  process.exit(0);
});

// 시작
bootstrap().catch((error) => {
  console.error('❌ 서버 시작 실패:', error);
  process.exit(1);
});
