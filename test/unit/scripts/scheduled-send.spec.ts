import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const script = path.resolve('scripts/run_scheduled_send.py');

function run(now: string): string {
  return execFileSync('python3', [script, '--dry-run', '--now', now], {
    encoding: 'utf8',
  }).trim();
}

describe('scheduled menu sender', () => {
  it('평일 09:00~15:59 KST에만 실행한다', () => {
    expect(run('2026-08-31T09:00:00+09:00')).toContain('would_send');
    expect(run('2026-08-31T15:59:00+09:00')).toContain('would_send');
    expect(run('2026-08-31T08:59:00+09:00')).toContain('outside_window');
    expect(run('2026-09-05T10:00:00+09:00')).toContain('outside_window');
  });
});
