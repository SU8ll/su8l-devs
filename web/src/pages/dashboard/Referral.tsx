import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { getReferral, type ReferralDto } from '../../api';
import { Badge, Kicker, Spinner, formatDate } from '../../components/ui';

export default function Referral() {
  const { t } = useI18n();
  const [data, setData] = useState<ReferralDto | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getReferral().then(setData).catch(() => setError('Failed to load referral'));
  }, []);

  const progress = useMemo(() => {
    if (!data) return 0;
    return Math.min(100, (data.count / data.freeMonthThreshold) * 100);
  }, [data]);

  if (error) return <div className="text-red-300">{error}</div>;
  if (!data) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;

  const referral = data;
  const rewardEarned = referral.reward?.awarded != null && referral.count >= referral.freeMonthThreshold;

  async function copy() {
    try {
      await navigator.clipboard.writeText(referral.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass glow-border relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-glow/10 blur-3xl" />
        <div className="relative">
          <Kicker>{t('referral.title')}</Kicker>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-gradient text-glow">{t('referral.headline')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">{t('referral.subtitle')}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatBox label={t('referral.statDiscount')} value={`${data.discount}%`} />
            <StatBox label={t('referral.statFriends')} value={`${data.count}/${data.freeMonthThreshold}`} />
            <StatBox label={t('referral.statReward')} value={`1 ${t('referral.freeMonth')}`} />
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted">{t('referral.yourCode')}</span>
              <span className="font-mono text-xs text-muted">{data.count} {t('referral.friendsLabel')}</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-lg font-bold tracking-widest text-glow">
                {data.code}
              </div>
              <button type="button" onClick={copy} className="btn-primary shrink-0">
                {copied ? t('referral.copied') : t('referral.copy')}
              </button>
            </div>
            <p className="mt-2 break-all text-xs text-muted">{data.shareUrl}</p>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-end justify-between">
              <span className="text-sm font-semibold text-muted">{t('referral.progressTitle')}</span>
              <span className="text-sm font-bold text-glow">
                {Math.max(0, data.count)} / {data.freeMonthThreshold}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-glow transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {rewardEarned
                ? t('referral.rewardEarned')
                : t('referral.rewardRemaining').replace('{n}', String(data.referralsRemaining))}
            </p>
          </div>
        </div>
      </section>

      {data.invitees.length > 0 && (
        <section>
          <Kicker>{t('referral.friendsTitle')}</Kicker>
          <div className="glass rounded-3xl p-6">
            <ul className="divide-y divide-white/5">
              {data.invitees.map((inv, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  {inv.avatar ? (
                    <img src={inv.avatar} alt="" className="avatar-glow h-9 w-9 object-cover" />
                  ) : (
                    <div className="avatar-glow flex h-9 w-9 items-center justify-center bg-gradient-to-br from-primary to-glow font-display text-xs font-black text-white">
                      {inv.username[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{inv.username}</div>
                    <div className="text-xs text-muted">{formatDate(new Date(inv.joinedAt).getTime())}</div>
                  </div>
                  <Badge tone="green">{t('referral.eliteBadge')}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="text-center text-xs text-muted">{t('referral.footnote')}</div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <div className="font-display text-2xl font-extrabold text-gradient">{value}</div>
      <div className="mt-1 text-[0.65rem] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}
