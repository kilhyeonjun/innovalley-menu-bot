import dns from 'node:dns/promises';
import net from 'node:net';

interface ProbeResult {
  ok: boolean;
  ms: number;
  err?: string;
}

const ANCHOR_PROBES: ReadonlyArray<{ name: string; host: string; port: number }> = [
  { name: 'cloudflare', host: '1.1.1.1', port: 443 },
  { name: 'google-dns', host: '8.8.8.8', port: 443 },
];

const TCP_TIMEOUT_MS = 3000;

function tcpProbe(host: string, port: number, timeoutMs = TCP_TIMEOUT_MS): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const sock = new net.Socket();
    let settled = false;
    const finish = (ok: boolean, err?: string) => {
      if (settled) return;
      settled = true;
      try { sock.destroy(); } catch { /* noop */ }
      resolve({ ok, ms: Date.now() - start, err });
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false, 'timeout'));
    sock.once('error', (e) => finish(false, (e as NodeJS.ErrnoException).code || e.message));
    try { sock.connect(port, host); } catch (e) { finish(false, String(e)); }
  });
}

/**
 * undici fetch가 던지는 'TypeError: fetch failed'에서 실제 원인을 풀어낸다.
 * Node 18+ undici는 cause 체인에 진짜 errno/code/syscall를 보존한다.
 */
export function formatErrorCause(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const parts: string[] = [`${err.name}: ${err.message}`];
  let cur: unknown = (err as { cause?: unknown }).cause;
  let depth = 0;
  while (cur && depth < 4) {
    if (cur instanceof Error) {
      const c = cur as NodeJS.ErrnoException & { code?: string; address?: string; port?: number };
      const tags = [c.code, c.syscall, c.address && `${c.address}${c.port ? ':' + c.port : ''}`]
        .filter(Boolean)
        .join(' ');
      parts.push(`cause[${depth}] ${cur.name}: ${cur.message}${tags ? ' (' + tags + ')' : ''}`);
      cur = (cur as { cause?: unknown }).cause;
    } else {
      parts.push(`cause[${depth}] ${String(cur)}`);
      break;
    }
    depth++;
  }
  return parts.join(' | ');
}

/**
 * fetch 실패 시 호출. DNS·TCP 도달성을 한 번에 측정해 한 줄 요약으로 반환.
 * 외부 anchor(1.1.1.1, 8.8.8.8) 비교로 "대상만 막힘" vs "전체 outbound 막힘"을 구분 가능.
 */
export async function captureNetworkDiagnostics(targetUrl: string): Promise<string> {
  const lines: string[] = [];

  let targetHost: string | null = null;
  let targetPort = 443;
  try {
    const u = new URL(targetUrl);
    targetHost = u.hostname;
    if (u.port) targetPort = Number(u.port);
    else if (u.protocol === 'http:') targetPort = 80;
  } catch {
    lines.push(`url-parse-fail:${targetUrl}`);
  }

  if (targetHost) {
    let resolved: string | null = null;
    try {
      const r = await dns.lookup(targetHost);
      resolved = r.address;
      lines.push(`dns ${targetHost}=${r.address}`);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      lines.push(`dns ${targetHost}=ERR(${err.code || err.message})`);
    }
    if (resolved) {
      const r = await tcpProbe(resolved, targetPort);
      lines.push(`tcp ${targetHost}:${targetPort}=${r.ok ? 'ok' : 'FAIL'}/${r.ms}ms${r.err ? '(' + r.err + ')' : ''}`);
    }
  }

  for (const a of ANCHOR_PROBES) {
    const r = await tcpProbe(a.host, a.port);
    lines.push(`tcp ${a.name} ${a.host}:${a.port}=${r.ok ? 'ok' : 'FAIL'}/${r.ms}ms${r.err ? '(' + r.err + ')' : ''}`);
  }

  return lines.join(' | ');
}
