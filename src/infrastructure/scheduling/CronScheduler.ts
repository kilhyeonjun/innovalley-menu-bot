import { injectable, inject } from 'tsyringe';
import cron, { ScheduledTask } from 'node-cron';
import { CheckAndSendMenuUseCase, CheckAndSendMenuResult } from '@application/use-cases';
import { getMenuSendNotBefore, isMenuCheckWindow } from '@shared/menuSendPolicy';

/** One attempt per KST hour; the next tick, not a long-running retry loop, retries. */
@injectable()
export class CronScheduler {
  private task: ScheduledTask | null = null;
  private pending: Promise<void> | null = null;
  private lastCheck: string | null = null;
  private lastResult: CheckAndSendMenuResult | null = null;
  private lastError: string | null = null;
  private startsAt: string | null = null;
  private registeredAt = 0;

  constructor(
    @inject(CheckAndSendMenuUseCase)
    private readonly checkAndSendMenuUseCase: CheckAndSendMenuUseCase
  ) {}

  start(): void {
    if (this.task) return;
    this.startsAt = getMenuSendNotBefore().toISOString();
    if (!process.env.SLACK_CHANNEL_ID) {
      throw new Error('SLACK_CHANNEL_ID 환경변수가 설정되지 않았습니다');
    }
    this.task = cron.schedule('0 9-15 * * 1-5', () => { void this.runNow(); }, {
      timezone: 'Asia/Seoul',
    });
    this.registeredAt = Date.now();
    // Rebuild the timer on every boot, and recover a missed tick only inside the window.
    if (isMenuCheckWindow()) void this.runNow();
  }

  async stop(): Promise<void> {
    this.task?.stop();
    this.task = null;
    await this.pending;
  }

  getStatus() {
    const now = new Date();
    const enabled = this.startsAt !== null && now.getTime() >= Date.parse(this.startsAt);
    const due = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    if (due.getUTCHours() < 9) {
      due.setUTCDate(due.getUTCDate() - 1);
      due.setUTCHours(15);
    }
    while (due.getUTCDay() === 0 || due.getUTCDay() === 6) {
      due.setUTCDate(due.getUTCDate() - 1);
      due.setUTCHours(15);
    }
    due.setUTCHours(Math.min(due.getUTCHours(), 15), 0, 0, 0);
    const dueAt = due.getTime() - 9 * 60 * 60 * 1000;
    const overdue = enabled && dueAt >= Date.parse(this.startsAt!) && dueAt >= this.registeredAt &&
      (!this.lastCheck || Date.parse(this.lastCheck) < dueAt);
    return {
      registered: this.task !== null,
      timezone: 'Asia/Seoul',
      schedule: '0 9-15 * * 1-5',
      startsAt: this.startsAt,
      checking: this.pending !== null,
      lastCheck: this.lastCheck,
      lastResult: this.lastResult,
      lastError: this.lastError,
      overdue,
      healthy: this.task !== null && !this.lastError && !overdue && this.lastResult?.success !== false,
    };
  }

  runNow(): Promise<void> {
    if (!this.task || !isMenuCheckWindow()) return Promise.resolve();
    if (this.pending) return this.pending;
    this.pending = this.check().finally(() => { this.pending = null; });
    return this.pending;
  }

  private async check(): Promise<void> {
    this.lastCheck = new Date().toISOString();
    try {
      const channel = process.env.SLACK_CHANNEL_ID;
      if (!channel) throw new Error('SLACK_CHANNEL_ID 환경변수가 설정되지 않았습니다');
      const result = await this.checkAndSendMenuUseCase.execute({ channel, maxRetries: 1, retryIntervalMs: 0 });
      if (result.isError()) {
        this.lastResult = null;
        this.lastError = result.error.message;
      } else {
        this.lastResult = result.value;
        this.lastError = result.value.success ? null : result.value.skipReason || '이번 주 식단표 미발송';
      }
    } catch (error) {
      this.lastResult = null;
      this.lastError = error instanceof Error ? error.message : String(error);
    }
    if (this.lastError) console.error('[Scheduler]', this.lastError);
  }
}
