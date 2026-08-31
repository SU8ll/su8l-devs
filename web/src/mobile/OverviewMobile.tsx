import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { api, type DashboardDto } from '../api';
import { Badge, Spinner, formatDate } from '../components/ui';

export default function OverviewMobile({ openAvatarPicker }: { openAvatarPicker?: () => void }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardDto | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<DashboardDto>('/api/dashboard').then(setData).catch(() => setError('Failed to load dashboard'));
  }, [user?.avatar]);

  if (error) return <div className="text-red-300">{error}</div>;
  if (!data) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;

  const statusUp = data.status.current?.up;
  const ping = data.status.current?.latencyMs;

  return (
    <div>
      {/* Profile */}
      <section className="m-card relative overflow-hidden" style={{ padding: '1.25rem' }}>
        <div className="flex items-center gap-3.5">
          <button type="button" onClick={openAvatarPicker} className="relative shrink-0 rounded-full">
            {data.user.avatar ? (
              <img src={data.user.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-glow font-display text-xl font-black text-white">
                {data.user.username[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-display text-lg font-extrabold text-gradient">{data.user.username}</h1>
            </div>
            <p className="truncate text-xs text-muted">{data.user.email}</p>
            <div className="mt-1.5">
              <Badge tone="green">✓ {data.activeSubscriptions > 0 ? t('dash.statusActive') : 'GUEST'}</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="m-section">
        <div className="m-section-title">{t('dash.activeSubs')}</div>
        <div className="m-stats">
          <div className="m-stat">
            <div className="font-display text-2xl font-black text-gradient">{data.activeSubscriptions}</div>
            <div className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-muted">{t('dash.activeSubs')}</div>
          </div>
          <div className="m-stat">
            <div className="font-display text-2xl font-black text-gradient">{data.ownsExtraSlot ? '+1' : '—'}</div>
            <div className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-muted">{t('dash.extraSlotTitle')}</div>
          </div>
        </div>
      </section>

      {/* Subscriptions */}
      <section className="m-section">
        <div className="m-section-title">{t('dash.activeSubs')}</div>
        {data.subscriptions.length === 0 ? (
          <div className="m-card text-center">
            <div className="text-3xl">🚀</div>
            <h3 className="mt-2 font-display text-lg font-bold">{t('dash.noSub')}</h3>
            <p className="mt-1 text-sm text-muted">{t('dash.noSubDesc')}</p>
            <Link to="/pricing" className="m-btn m-btn-primary mt-5 w-full">{t('dash.upgrade')}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.subscriptions.map((s) => (
              <div key={s.id} className="m-card">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold">{s.planName}</h3>
                  <Badge tone={s.active ? 'green' : s.status === 'expired' ? 'red' : 'slate'}>
                    {s.active ? t('dash.statusActive') : s.status === 'expired' ? t('dash.statusExpired') : t('dash.statusCancelled')}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <Row label={t('checkout.cycle')} value={t(`pricing.${s.cycle}`)} />
                  <Row label={t('checkout.amount')} value={`$${s.amount}`} />
                  <Row label={t('dash.expires')} value={formatDate(s.currentPeriodEnd)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Extra Slot upsell */}
      {data.activeSubscriptions > 0 && (
        <section className="m-section">
          <div className="m-section-title">{t('dash.extraSlotTitle')}</div>
          <div className="m-card" style={{ borderColor: 'rgba(168,85,247,0.2)' }}>
            <h3 className="font-display text-base font-bold">{t('dash.extraSlotTitle')}</h3>
            <p className="mt-1 text-sm text-muted">{t('dash.extraSlotDesc')}</p>
            <div className="mt-3 flex items-center gap-2">
              <Badge tone="purple">$15</Badge>
              <span className="text-xs text-muted">one-time · permanent</span>
            </div>
            {data.ownsExtraSlot ? (
              <div className="mt-4"><Badge tone="green">{t('dash.extraSlotOwned')}</Badge></div>
            ) : (
              <Link to="/checkout?extra=1" className="m-btn m-btn-primary mt-4 w-full">{t('dash.extraSlotCta')}</Link>
            )}
          </div>
        </section>
      )}

      {/* Status */}
      <section className="m-section">
        <div className="m-section-title">{t('dash.status')}</div>
        <div className="m-card">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${statusUp ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <div className="flex-1">
              <div className="text-sm font-semibold">
                {statusUp === undefined ? '…' : statusUp ? t('status.operational') : t('status.degraded')}
              </div>
              <div className="text-[0.7rem] text-muted">
                {t('dash.livePing')}: {ping != null ? `${ping}${t('status.ms')}` : '—'}
              </div>
            </div>
          </div>
          <div className="m-stats mt-3">
            <div className="m-stat"><div className="font-display text-xl font-black text-glow">{data.status.uptime24h}%</div><div className="mt-0.5 text-[0.6rem] uppercase tracking-wider text-muted">{t('status.uptime24')}</div></div>
            <div className="m-stat"><div className="font-display text-xl font-black text-glow">{data.status.uptime7d}%</div><div className="mt-0.5 text-[0.6rem] uppercase tracking-wider text-muted">{t('status.uptime7')}</div></div>
          </div>
          <Link to="/dashboard/status" className="nav-link mt-3 inline-block text-sm underline decoration-glow/40 underline-offset-4">
            {t('dash.viewStatus')} →
          </Link>
        </div>
      </section>

      {/* Referral quick card */}
      <section className="m-section">
        <div className="m-card">
          <h3 className="font-display text-base font-bold">{t('referral.headline')}</h3>
          <p className="mt-1 text-sm text-muted">{t('referral.subtitle')}</p>
          <Link to="/dashboard/referral" className="m-btn m-btn-ghost mt-4 w-full">{t('dash.referral')}</Link>
        </div>
      </section>

      {/* Quick actions */}
      <section className="m-section">
        <div className="m-section-title">{t('dash.quick')}</div>
        <div className="space-y-3">
          <Link to="/dashboard/bot" className="m-card flex items-center gap-3">
            <span className="text-2xl">⬢</span>
            <span className="flex-1">
              <span className="block font-display font-bold">{t('dash.manageBot')}</span>
              <span className="block text-sm text-muted">{t('dash.botPanel')}</span>
            </span>
            <span className="text-muted">›</span>
          </Link>
          <Link to="/dashboard/tickets" className="m-card flex items-center gap-3">
            <span className="text-2xl">▤</span>
            <span className="flex-1">
              <span className="block font-display font-bold">{t('dash.openTickets')}</span>
              <span className="block text-sm text-muted">{t('tickets.subtitle')}</span>
            </span>
            <span className="text-muted">›</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-semibold capitalize">{value}</span>
    </div>
  );
}
