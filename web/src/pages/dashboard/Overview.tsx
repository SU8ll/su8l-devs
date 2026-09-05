import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAuth } from '../../AuthContext';
import { api, type DashboardDto } from '../../api';
import { Badge, Kicker, Spinner, formatDate } from '../../components/ui';

export default function Overview() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardDto | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardDto>('/api/dashboard').then(setData).catch(() => setError(t('dashboard.error.loadFailed')));
  }, [user?.avatar]);

  if (error) return <div className="text-red-300">{error}</div>;
  if (!data) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;

  const statusUp = data.status.current?.up;
  const ping = data.status.current?.latencyMs;

  return (
    <div className="space-y-6">
      {/* Profile */}
      <section className="glass glow-border relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-glow/10 blur-3xl" />
        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <div className="shrink-0">
            {data.user.avatar ? (
              <img src={data.user.avatar} alt="" className="avatar-glow h-24 w-24 object-cover" />
            ) : (
              <div className="avatar-glow flex h-24 w-24 items-center justify-center bg-gradient-to-br from-primary to-glow font-display text-3xl font-black text-white">
                {data.user.username[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-extrabold text-gradient text-glow">{data.user.username}</h1>
              <Badge tone="green">✓ {data.activeSubscriptions > 0 ? t('dashboard.badge.active') : t('dashboard.badge.guest')}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">{data.user.email}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <StatChip label={t('dash.activeSubs')} value={`${data.activeSubscriptions}`} />
              <StatChip label={t('dash.extraSlotTitle')} value={data.ownsExtraSlot ? '+1' : '—'} />
            </div>
          </div>
        </div>
      </section>

      {/* Subscriptions */}
      <section>
        <Kicker>{t('dash.activeSubs')}</Kicker>
        {data.subscriptions.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <div className="text-3xl">🚀</div>
            <h3 className="mt-3 font-display text-lg font-bold">{t('dash.noSub')}</h3>
            <p className="mt-1 text-sm text-muted">{t('dash.noSubDesc')}</p>
            <Link to="/pricing" className="btn-primary mt-6 inline-flex">
              {t('dash.upgrade')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.subscriptions.map((s) => (
              <div key={s.id} className="glass card-hover rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold">{s.planName}</h3>
                  <Badge tone={s.active ? 'green' : s.status === 'expired' ? 'red' : 'slate'}>
                    {s.active ? t('dash.statusActive') : s.status === 'expired' ? t('dash.statusExpired') : t('dash.statusCancelled')}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted">{t('checkout.cycle')}</span>
                  <span className="font-semibold capitalize">{t(`pricing.${s.cycle}`)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted">{t('checkout.amount')}</span>
                  <span className="font-semibold">${s.amount}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted">{t('dash.expires')}</span>
                  <span className="font-mono text-glow/80">{formatDate(s.currentPeriodEnd)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Extra Slot upsell — STRICTLY only rendered for users with an active base subscription */}
      {data.activeSubscriptions > 0 && (
        <section>
          <Kicker>{t('dash.extraSlotTitle')}</Kicker>
          <div className="glass glow-border rounded-3xl p-7">
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-glow/30 text-glow">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M3 6h18M3 12h18M3 18h11" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-base font-bold">{t('dash.extraSlotTitle')}</h3>
                  <p className="mt-1 max-w-md text-sm text-muted">{t('dash.extraSlotDesc')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone="purple">$15</Badge>
                    <span className="text-xs text-muted">{t('dash.extraSlotOneTime')}</span>
                  </div>
                </div>
              </div>
              {data.ownsExtraSlot ? (
                <Badge tone="green">{t('dash.extraSlotOwned')}</Badge>
              ) : (
                <Link to="/checkout?extra=1" className="btn-primary shrink-0">
                  {t('dash.extraSlotCta')}
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Status widget */}
      <section>
        <Kicker>{t('dash.status')}</Kicker>
        <div className="glass rounded-3xl p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className={`h-3 w-3 rounded-full ${statusUp ? 'pulse-dot' : 'bg-red-400'}`} />
              <div>
                <div className="font-semibold">
                  {statusUp === undefined ? '…' : statusUp ? t('status.operational') : t('status.degraded')}
                </div>
                <div className="text-xs text-muted">
                  {t('dash.livePing')}: {ping != null ? `${ping}${t('status.ms')}` : '—'} · {t('dash.lastCheck')}:{' '}
                  {data.status.current ? new Date(data.status.current.at).toLocaleTimeString() : '—'}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              <MiniStat label={t('status.uptime24')} value={`${data.status.uptime24h}%`} />
              <MiniStat label={t('status.uptime7')} value={`${data.status.uptime7d}%`} />
              <MiniStat label={t('status.uptime30')} value={`${data.status.uptime30d}%`} />
            </div>
          </div>
          <div className="mt-5">
            <Link to="/dashboard/status" className="nav-link text-sm underline decoration-glow/40 underline-offset-4">
              {t('dash.viewStatus')} →
            </Link>
          </div>
        </div>
      </section>

      {/* Referral */}
      <section>
        <Kicker>{t('referral.title')}</Kicker>
        <div className="glass glow-border rounded-3xl p-7">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-glow/30 text-glow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M19 8v6M22 11h-6" />
                </svg>
              </div>
              <div>
                <h3 className="font-display text-base font-bold">{t('referral.headline')}</h3>
                <p className="mt-1 max-w-md text-sm text-muted">{t('referral.subtitle')}</p>
              </div>
            </div>
            <Link to="/dashboard/referral" className="btn-primary shrink-0">
              {t('dash.referral')}
            </Link>
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <Kicker>{t('dash.quick')}</Kicker>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/dashboard/bot" className="glass card-hover rounded-2xl p-6">
            <div className="text-2xl">⬢</div>
            <h3 className="mt-3 font-display font-bold">{t('dash.manageBot')}</h3>
            <p className="mt-1 text-sm text-muted">{t('dash.botPanel')}</p>
          </Link>
          <Link to="/dashboard/tickets" className="glass card-hover rounded-2xl p-6">
            <div className="text-2xl">▤</div>
            <h3 className="mt-3 font-display font-bold">{t('dash.openTickets')}</h3>
            <p className="mt-1 text-sm text-muted">{t('tickets.subtitle')}</p>
          </Link>
        </div>
      </section>

      <div className="text-center text-xs text-muted">
        {user?.username} · su8ldevs.eu.cc
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-center">
      <div className="font-display text-lg font-extrabold text-gradient">{value}</div>
      <div className="text-[0.65rem] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-lg font-extrabold text-glow">{value}</div>
      <div className="text-[0.65rem] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}
