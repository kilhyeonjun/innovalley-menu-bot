import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { once } from 'node:events';
import { createServer, Server } from 'node:http';

const script = path.resolve('scripts/run_scheduled_send.py');
let server: Server | undefined;

afterEach(() => {
  server?.close();
});

function run(now: string): string {
  return execFileSync('python3', [script, '--dry-run', '--now', now], {
    encoding: 'utf8',
  }).trim();
}

async function runAgainst(body: string): Promise<number | null> {
  server = createServer((_, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(body);
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server address unavailable');
  const child = spawn('python3', [
    script,
    '--now',
    '2026-08-31T10:00:00+09:00',
    '--url',
    `http://127.0.0.1:${address.port}`,
  ]);
  const [code] = (await once(child, 'exit')) as [number | null];
  return code;
}

describe('scheduled menu sender', () => {
  it('평일 09:00~15:59 KST에만 실행한다', () => {
    expect(run('2026-08-31T09:00:00+09:00')).toContain('would_send');
    expect(run('2026-08-31T15:59:00+09:00')).toContain('would_send');
    expect(run('2026-08-31T08:59:00+09:00')).toContain('outside_window');
    expect(run('2026-09-05T10:00:00+09:00')).toContain('outside_window');
  });

  it('내부 발송 실패를 cron 성공으로 처리하지 않는다', async () => {
    expect(await runAgainst('{"success":true,"data":{"success":false}}')).toBe(1);
    expect(await runAgainst('{"success":true,"data":{"success":true}}')).toBe(0);
  });
});
