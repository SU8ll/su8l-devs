import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n';
import { claimReferralReward, getReferral, type ReferralDto } from '../../api';
import { Badge, Kicker, Spinner, formatDate } from '../../components/ui';

export default function Referral() {
  const { t } = useI18n();
  const [data, setData] = useState<ReferralDto | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => getReferral().then(setData).catch(() => setError('Failed to load referral'));

  useEffect(() => {
    load();
  }, []);

  const goal = data?.goal ?? data?.freeMonthThreshold ?? 5;

  const progress = useMemo(() => {
    if (!data) return 0;
    return Math.min(100, (data.count / goal) * 100);
  }, [data, goal]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(data!.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function onClaim() {
    if (claiming) return;
    setClaiming(true);
    setClaimMsg(null);
    try {
      const r = await claimReferralReward();
      setClaimMsg({ ok: true, text: t('referral.claimSuccess').replace('{plan}', r.freePlanName) });
      load();
    } catch (e) {
      setClaimMsg({ ok: false, text: t('referral.claimFailed') });
    } finally {
      setClaiming(false);
    }
  }

  if (error) return <div className="text-red-300">{error}</div>;
  if (!data) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;

  const referral = data;
  const rewardEarned = referral.claimed;

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
            <StatBox label={t('referral.statFriends')} value={`${data.count}/${goal}`} />
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
                {Math.max(0, data.count)} / {goal}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-glow transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {data.canClaim
                ? t('referral.rewardReady')
                : rewardEarned
                  ? t('referral.rewardEarned')
                  : t('referral.rewardRemaining').replace('{n}', String(Math.max(0, goal - data.count)))}
            </p>
          </div>

          {data.canClaim && (
            <div className="mt-6 rounded-2xl border border-glow/40 bg-glow/10 p-5 text-center">
              <p className="mb-3 text-sm font-semibold text-glow">{t('referral.rewardReadyTitle')}</p>
              <button type="button" onClick={onClaim} disabled={claiming} className="btn-primary">
                {claiming ? t('referral.claiming') : t('referral.claimButton')}
              </button>
              {claimMsg && (
                <p className={`mt-3 text-xs ${claimMsg.ok ? 'text-emerald-300' : 'text-red-300'}`}>{claimMsg.text}</p>
              )}
            </div>
          )}

          {rewardEarned && !data.canClaim && (
            <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-5 text-center">
              <p className="text-sm font-semibold text-emerald-300">{t('referral.claimedNotice')}</p>
            </div>
          )}
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
