import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import {
  api,
  type CreateCheckoutResponse,
  type DashboardDto,
  type PlanDto,
  type PlansResponse,
} from '../api';
import { Kicker, Spinner } from '../components/ui';
import { Link } from 'react-router-dom';

type PromoState = 'idle' | 'applying' | 'valid' | 'invalid' | 'forbidden';

const PROMO_MONTHLY = 25;
const PROMO_YEARLY = Math.round(PROMO_MONTHLY * 12 * 0.8);

export default function Checkout() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const extra = params.get('extra') === '1';

  const [plans, setPlans] = useState<PlanDto[] | null>(null);
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [plan, setPlan] = useState<PlanDto | null>(null);
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(
    params.get('cycle') === 'yearly' ? 'yearly' : 'monthly'
  );

  const [promoInput, setPromoInput] = useState('');
  const [promoState, setPromoState] = useState<PromoState>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<PlansResponse>('/api/plans')
      .then((r) => {
        setPlans(r.plans);
        const key = params.get('plan');
        const p = r.plans.find((x) => x.key === key) ?? r.plans.find((x) => x.isHighestTier) ?? r.plans[0]!;
        setPlan(p);
      })
      .catch(() => setError('Failed to load plans'));
    api<DashboardDto>('/api/dashboard').then(setDashboard).catch(() => {});
  }, [params]);

  const promoApplied = promoState === 'valid';
  const elite = plan?.isHighestTier;

  const extraSlotPrice = dashboard?.extraSlotPrice ?? 15;

  const basePrice = (() => {
    if (extra) return extraSlotPrice;
    if (!plan) return 0;
    return cycle === 'yearly' ? plan.yearly : plan.monthly;
  })();

  const effectivePrice = promoApplied && elite ? (cycle === 'yearly' ? PROMO_YEARLY : PROMO_MONTHLY) : basePrice;

  const applyPromo = async () => {
    if (!promoInput.trim() || promoState === 'applying') return;
    setPromoState('applying');
    try {
      if (elite) {
        const res = await api<{ valid: boolean }>('/api/checkout/validate-promo', {
          method: 'POST',
          body: { promoCode: promoInput.trim() },
        });
        setPromoState(res.valid ? 'valid' : 'invalid');
      } else {
        setPromoState('forbidden');
      }
    } catch {
      setPromoState('invalid');
    }
  };

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await api<CreateCheckoutResponse>('/api/checkout/create', {
        method: 'POST',
        body: extra
          ? { extraSlot: true }
          : { planKey: plan!.key, cycle, promoCode: promoApplied ? promoInput.trim() : null },
      });
      if (res.approvalUrl) {
        window.location.href = res.approvalUrl;
      } else {
        setError('The payment provider did not return a checkout link.');
        setBusy(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create payment.');
      setBusy(false);
    }
  };

  if (extra && dashboard && !dashboard.activeSubscriptions) {
    return (
      <div className="mx-auto max-w-xl px-4 py-28 text-center">
        <Kicker>{t('pricing.extraTitle')}</Kicker>
        <p className="mt-3 text-muted">{t('checkout.extraLocked')}</p>
        <Link to="/pricing" className="btn-primary mt-8 inline-flex">
          {t('checkout.backPricing')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <div className="pt-12 text-center">
        <Kicker>{extra ? t('pricing.extraTitle') : t('checkout.title')}</Kicker>
        <p className="mt-2 text-muted">{extra ? t('checkout.extraNote') : t('checkout.subtitle')}</p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        {/* Order summary */}
        <div className="glass-strong glow-border rounded-3xl p-7 lg:col-span-3">
          <h2 className="font-display text-lg font-bold">{t('checkout.summary')}</h2>

          {extra ? (
            <div className="mt-6 space-y-4">
              <Row label={t('pricing.extraTitle')} value={`$${extraSlotPrice}`} />
              <Row label={t('checkout.cycle')} value={t('pricing.monthly')} />
              <div className="rounded-xl border border-glow/25 bg-glow/5 p-4 text-sm text-muted">
                {t('checkout.extraNote')}
              </div>
            </div>
          ) : !plan || !plans ? (
            <div className="flex justify-center py-16">
              <Spinner size={28} />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <Row label={t('checkout.plan')} value={`${t(`plan.${plan.key}.name`) || plan.name} — ${t('checkout.plan')}`} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted">{t('checkout.cycle')}</span>
                <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                  {(['monthly', 'yearly'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCycle(c)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                        cycle === c ? 'bg-gradient-to-r from-primary to-glow text-white shadow-glow' : 'text-muted'
                      }`}
                    >
                      {t(`pricing.${c}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Promo */}
              <div className="pt-2">
                <label className="mb-1.5 block text-sm text-muted">{t('checkout.promoLabel')}</label>
                <div className="flex gap-2">
                  <input
                    className="neon-input font-mono uppercase"
                    placeholder={t('checkout.promoPlaceholder')}
                    value={promoInput}
                    disabled={promoApplied}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      if (promoState !== 'idle') setPromoState('idle');
                    }}
                  />
                  <button type="button" className="btn-ghost shrink-0" onClick={applyPromo} disabled={promoApplied || promoState === 'applying'}>
                    {promoApplied ? '✓' : promoState === 'applying' ? '…' : t('checkout.apply')}
                  </button>
                </div>
                <div className="mt-2 min-h-5 text-xs">
                  {promoState === 'valid' && (
                    <span className="text-emerald-300">
                      ✓ {t('checkout.applied')} — ${elite ? (cycle === 'yearly' ? PROMO_YEARLY : PROMO_MONTHLY) : ''}
                    </span>
                  )}
                  {promoState === 'invalid' && <span className="text-red-300">{t('checkout.promoInvalid')}</span>}
                  {promoState === 'forbidden' && <span className="text-amber-300">{t('checkout.promoForbidden')}</span>}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t('checkout.amount')}</span>
              <div className="text-end">
                {promoApplied && (
                  <div className="text-sm text-muted line-through">${basePrice}</div>
                )}
                {cycle === 'yearly' && !promoApplied && plan && (
                  <div className="text-sm text-muted line-through">${plan.monthly * 12}</div>
                )}
                <div className="font-display text-3xl font-black text-gradient">
                  ${effectivePrice}
                  <span className="ms-1 text-sm font-medium text-muted">USD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pay panel */}
        <div className="glass rounded-3xl p-7 lg:col-span-2">
          <div className="flex items-center gap-2 text-sm text-muted">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            {t('checkout.payPanel')}
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          <button type="button" className="btn-primary mt-6 w-full !py-4" onClick={buy} disabled={busy || (!extra && !plan)}>
            {busy ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size={18} />
                {t('checkout.redirecting')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 7a5 5 0 0 1 10 0h1a6 6 0 0 0-12 0v3a6 6 0 0 0-1 3.5V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5a6 6 0 0 0-1-3.5V7zm8 0a3 3 0 0 0-6 0v3h6V7z" />
                </svg>
                {t('checkout.pay')}
              </span>
            )}
          </button>

          <div className="mt-6 space-y-3 text-xs text-muted">
            <p className="flex items-start gap-2">
              <span className="text-glow">🛡</span> {t('success.secure')}.
            </p>
            <p className="flex items-start gap-2">
              <span className="text-glow">✓</span> {t('footer.rights')}
            </p>
          </div>
        </div>
      </div>

      {user && (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted">
          <span className="h-2 w-2 rounded-full bg-glow" />
          {user.username} · {t('checkout.summary')}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
