import { injectable, inject } from 'tsyringe';
import cron, { ScheduledTask } from 'node-cron';
import { CheckAndSendMenuUseCase } from '@application/use-cases';

/**
 * Cron 스케줄러
 * 매주 월요일 오전 9시에 식단표 발송
 */
@injectable()
export class CronScheduler {
  private task: ScheduledTask | null = null;

  constructor(
    @inject(CheckAndSendMenuUseCase)
    private readonly checkAndSendMenuUseCase: CheckAndSendMenuUseCase
  ) {}

  /**
   * 스케줄러 시작
   * @param cronExpression cron 표현식 (기본: 매주 월요일 09:00)
   */
  start(cronExpression = '0 9 * * 1'): void {
    const channel = process.env.SLACK_CHANNEL_ID;

    if (!channel) {
      console.error('[Scheduler] SLACK_CHANNEL_ID 환경변수가 설정되지 않았습니다');
      return;
    }

    this.task = cron.schedule(
      cronExpression,
      async () => {
        console.log('[Scheduler] 주간 식단표 발송 작업 시작');

        const result = await this.checkAndSendMenuUseCase.execute({
          channel,
          maxRetries: 6,
          retryIntervalMs: 60 * 60 * 1000, // 1시간
        });

        if (result.isError()) {
          console.error('[Scheduler] 발송 실패:', result.error.message);
          return;
        }

        const { success, attemptCount, sentAt, skipped, skipReason } = result.value;

        if (skipped) {
          console.log(`[Scheduler] 발송 스킵: ${skipReason}`);
          return;
        }

        if (success) {
          console.log(
            `[Scheduler] 발송 성공: ${attemptCount}번째 시도, ${sentAt?.toISOString()}`
          );
        } else {
          console.warn(`[Scheduler] 발송 실패: ${attemptCount}번 시도 후 포기`);
        }
      },
      {
        timezone: 'Asia/Seoul',
      }
    );

    console.log('[Scheduler] 스케줄러 시작됨 (매주 월요일 09:00 KST)');
  }

  /**
   * 스케줄러 중지
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('[Scheduler] 스케줄러 중지됨');
    }
  }

  /**
   * 수동 실행 (테스트용)
   */
  async runNow(): Promise<void> {
    const channel = process.env.SLACK_CHANNEL_ID;

    if (!channel) {
      throw new Error('SLACK_CHANNEL_ID 환경변수가 설정되지 않았습니다');
    }

    console.log('[Scheduler] 수동 실행 시작');

    const result = await this.checkAndSendMenuUseCase.execute({
      channel,
      maxRetries: 1,
      retryIntervalMs: 0,
    });

    if (result.isError()) {
      throw result.error;
    }

    console.log('[Scheduler] 수동 실행 완료:', result.value);
  }
}
