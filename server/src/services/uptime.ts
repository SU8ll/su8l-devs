import axios from 'axios';
import { config } from '../config.js';
import { latestUptime, recordUptime, pruneUptime, uptimeSince, uptimeDaily, type UptimeCheck } from '../db.js';

let running = false;

async function pingTarget(): Promise<{ ok: boolean; latencyMs: number | null }> {
  if (!config.uptimeTarget) return { ok: true, latencyMs: null };
  const start = Date.now();
  try {
    await axios.get(config.uptimeTarget, {
      timeout: 10_000,
      headers: { 'User-Agent': 'SU8L-UptimeProbe/1.0' },
    });
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

export async function runProbe(): Promise<UptimeCheck> {
  const { ok, latencyMs } = await pingTarget();
  recordUptime(ok, latencyMs);
  pruneUptime(60 * 24 * 60 * 60 * 1000); // keep 60 days
  return latestUptime()!;
}

export function startUptimeChecker(): void {
  if (running) return;
  running = true;
  void runProbe();
  const timer = setInterval(() => void runProbe(), Math.max(config.uptimeIntervalMs, 15_000));
  timer.unref();
}

export function getStatusSummary() {
  const latest = latestUptime();
  const h24 = uptimeSince(24 * 60 * 60 * 1000);
  const h7 = uptimeSince(7 * 24 * 60 * 60 * 1000);
  const d30 = uptimeSince(30 * 24 * 60 * 60 * 1000);
  const pct = (s: { checks: number; ok: number }) => (s.checks === 0 ? 100 : Math.round((s.ok / s.checks) * 1000) / 10);
  return {
    target: config.uptimeTarget,
    configured: !!config.uptimeTarget,
    current: latest
      ? { up: latest.ok === 1, latencyMs: latest.latency_ms, at: latest.checked_at }
      : null,
    uptime24h: pct(h24),
    uptime7d: pct(h7),
    uptime30d: pct(d30),
  };
}

export { uptimeDaily };
