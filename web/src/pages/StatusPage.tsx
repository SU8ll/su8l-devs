import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { api, type StatusHistoryDto, type StatusSummaryDto } from '../api';
import { Badge, Spinner } from '../components/ui';
import UptimeChart from '../components/UptimeChart';

export default function StatusPage() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<StatusSummaryDto | null>(null);
  const [history, setHistory] = useState<StatusHistoryDto | null>(null);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        api<StatusSummaryDto>('/api/status/summary'),
        api<StatusHistoryDto>('/api/status/history?days=30'),
      ]);
      setSummary(s);
      setHistory(h);
    } catch {
      setError('Failed to load status.');
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const probe = async () => {
    setProbing(true);
    try {
      const s = await api<StatusSummaryDto>('/api/status/live');
      setSummary(s);
      const h = await api<StatusHistoryDto>('/api/status/history?days=30');
      setHistory(h);
    } catch {
      setError('Probe failed.');
    } finally {
      setProbing(false);
    }
  };

  if (error) return <div className="mx-auto max-w-4xl px-4 py-24 text-center text-red-300">{error}</div>;
  if (!summary) return <div className="flex justify-center py-32"><Spinner size={36} /></div>;

  const maintenance = summary.maintenance_mode === 1;
  const up = summary.current?.up;
  const ping = summary.current?.latencyMs;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
      <div className="pt-12 text-center">
        <h1 className="font-display text-3xl font-black text-gradient">{t('status.title')}</h1>
        <p className="mt-2 text-muted">{t('status.subtitle')}</p>
      </div>

      {/* Maintenance banner */}
      {maintenance && (
        <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 text-center backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-lg">
            <span>🔧</span> {t('status.maintenance')}
          </div>
          {summary.maintenance_message && (
            <p className="mt-2 text-sm text-amber-200/80">{summary.maintenance_message}</p>
          )}
        </div>
      )}

      {/* Current status */}
      <div className="glass-strong glow-border mt-10 rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-4">
            <span className={`h-4 w-4 rounded-full ${maintenance ? 'bg-red-400' : up ? 'pulse-dot' : 'bg-red-400'}`} />
            <div className="text-start">
              <div className="font-display text-xl font-bold">
                {maintenance
                  ? t('status.underMaintenance')
                  : up === undefined
                    ? '…'
                    : up
                      ? t('status.operational')
                      : summary.configured
                        ? t('status.down')
                        : t('status.notConfigured')}
              </div>
              {!maintenance && (
                <div className="text-sm text-muted">
                  {t('dash.livePing')}: {ping != null ? `${ping}${t('status.ms')}` : '—'} · {t('dash.lastCheck')}:{' '}
                  {summary.current ? new Date(summary.current.at).toLocaleTimeString() : '—'}
                </div>
              )}
            </div>
          </div>
          {!maintenance && (
            <button type="button" className="btn-ghost shrink-0" onClick={probe} disabled={probing}>
              {probing ? '…' : '⟳'} {t('status.checkNow')}
            </button>
          )}
        </div>

        {!maintenance && (
          <>
            <div className="mt-8 grid grid-cols-3 gap-4">
              <UptimeStat label={t('status.uptime24')} value={summary.uptime24h} />
              <UptimeStat label={t('status.uptime7')} value={summary.uptime7d} />
              <UptimeStat label={t('status.uptime30')} value={summary.uptime30d} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
              <Badge tone="slate">{t('status.target')}: {summary.target || t('status.notSet')}</Badge>
            </div>
          </>
        )}
      </div>

      {/* 30-day history */}
      {!maintenance && (
        <div className="glass mt-8 rounded-3xl p-6 sm:p-8">
          <h2 className="font-display text-lg font-bold text-gradient">{t('status.history')}</h2>
          {history ? (
            <div className="mt-6">
              <UptimeChart history={history.history} />
            </div>
          ) : (
            <div className="flex justify-center py-12">
              <Spinner size={28} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UptimeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-2 py-5 text-center sm:px-4 sm:py-6">
      <div className="font-display text-2xl font-black text-glow sm:text-3xl">{value}%</div>
      <div className="mt-1 text-[0.6rem] uppercase tracking-wider text-muted sm:text-[0.68rem]">{label}</div>
    </div>
  );
}
