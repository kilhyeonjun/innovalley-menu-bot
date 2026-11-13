import { afterEach, beforeEach, describe, expect, it, vi, Mock } from 'vitest';
import { CronScheduler } from '@infrastructure/scheduling/CronScheduler';
import { CheckAndSendMenuUseCase } from '@application/use-cases/CheckAndSendMenuUseCase';
import { Result } from '@shared/types/Result';
import { SlackDeliveryError } from '@shared/errors/DomainError';

describe('CronScheduler', () => {
  let scheduler: CronScheduler;
  let execute: Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-16T09:00:00+09:00'));
    vi.stubEnv('MENU_SEND_NOT_BEFORE', '2026-11-16T09:00:00+09:00');
    vi.stubEnv('SLACK_CHANNEL_ID', 'C123');
    execute = vi.fn().mockResolvedValue(Result.ok({ success: true, attemptCount: 1 }));
    scheduler = new CronScheduler({ execute } as unknown as CheckAndSendMenuUseCase);
  });

  afterEach(async () => {
    await scheduler.stop();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it.each([
    ['2026-11-16T08:59:59+09:00', false],
    ['2026-11-16T09:00:00+09:00', true],
    ['2026-11-16T15:59:59+09:00', true],
    ['2026-11-16T16:00:00+09:00', false],
    ['2026-11-21T10:00:00+09:00', false],
    ['2026-11-22T10:00:00+09:00', false],
    ['2026-11-22T23:59:59Z', false],
    ['2026-11-23T00:00:00Z', true],
  ])('KST 윈도우에서만 부팅 catch-up: %s', async (now, shouldCheck) => {
    vi.setSystemTime(new Date(now));
    scheduler.start();
    await scheduler.runNow();
    expect(execute).toHaveBeenCalledTimes(shouldCheck ? 1 : 0);
  });

  it('중복 시작은 timer를 늘리지 않고 재시작하면 즉시 한 번 복구한다', async () => {
    scheduler.start();
    scheduler.start();
    await scheduler.runNow();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenLastCalledWith({ channel: 'C123', maxRetries: 1, retryIntervalMs: 0 });
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(execute).toHaveBeenCalledTimes(2);
    await scheduler.stop();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(execute).toHaveBeenCalledTimes(2);
    scheduler.start();
    await scheduler.runNow();
    expect(execute).toHaveBeenCalledTimes(3);
    expect(scheduler.getStatus().registered).toBe(true);
  });

  it('발송 실패와 다음 시간 미체크는 정상 health가 아니다', async () => {
    execute.mockResolvedValueOnce(Result.fail(new SlackDeliveryError('upload failed')));
    scheduler.start();
    await scheduler.runNow();
    expect(scheduler.getStatus()).toMatchObject({ healthy: false, lastError: 'upload failed' });
    execute.mockResolvedValueOnce(Result.ok({ success: false, attemptCount: 1, skipReason: '이번 주 식단표 미발송' }));
    await scheduler.runNow();
    expect(scheduler.getStatus()).toMatchObject({ healthy: false, lastResult: { success: false } });
    execute.mockResolvedValueOnce(Result.ok({ success: true, attemptCount: 0, skipped: true }));
    await scheduler.runNow();
    expect(scheduler.getStatus().healthy).toBe(true);
    vi.setSystemTime(new Date('2026-11-16T16:00:00+09:00'));
    expect(scheduler.getStatus()).toMatchObject({ healthy: false, overdue: true });
  });

  it.each(['2026-11-20T16:00:00+09:00', '2026-11-21T10:00:00+09:00'])(
    '시간대 밖 재기동은 지난 tick 누락으로 오인하지 않는다: %s',
    async (now) => {
      vi.setSystemTime(new Date(now));
      scheduler.start();
      expect(scheduler.getStatus()).toMatchObject({ healthy: true, overdue: false });
      expect(execute).not.toHaveBeenCalled();
      vi.setSystemTime(new Date('2026-11-23T09:01:00+09:00'));
      expect(scheduler.getStatus()).toMatchObject({ healthy: false, overdue: true });
    }
  );

  it('유효하지 않은 시작일은 timer 등록 전에 실패한다', () => {
    vi.stubEnv('MENU_SEND_NOT_BEFORE', '2026-11-16T09:00:00');
    expect(() => scheduler.start()).toThrow('MENU_SEND_NOT_BEFORE');
    expect(scheduler.getStatus().registered).toBe(false);
  });
});
