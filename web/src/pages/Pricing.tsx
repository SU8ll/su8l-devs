import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { api, type DashboardDto, type PlanDto, type PlansResponse } from '../api';
import { Badge, Kicker, Spinner } from '../components/ui';
import { useScrollReveal } from '../hooks/useScrollReveal';

type Cycle = 'monthly' | 'yearly';

export default function Pricing() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanDto[] | null>(null);
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [error, setError] = useState('');
  useScrollReveal();

  useEffect(() => {
    api<PlansResponse>('/api/plans')
      .then((r) => setPlans(r.plans))
      .catch(() => setError('Failed to load plans'));
  }, []);

  useEffect(() => {
    if (user) {
      api<DashboardDto>('/api/dashboard').then(setDashboard).catch(() => {});
    }
  }, [user]);

  const activeKeys = new Set(
    (dashboard?.subscriptions ?? [])
      .filter((s) => s.status === 'active')
      .map((s) => s.planKey)
  );
  const planActive = (key: string) => activeKeys.has(key);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-red-300">{error}</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
      <div className="pt-12 text-center">
        <h1 className="sr-only">{t('pricing.title')}</h1>
        <Kicker>{t('pricing.title')}</Kicker>
        <p className="mx-auto mt-2 max-w-2xl text-muted">{t('pricing.subtitle')}</p>

        <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
              cycle === 'monthly' ? 'bg-gradient-to-r from-primary to-glow text-white shadow-glow' : 'text-muted hover:text-white'
            }`}
          >
            {t('pricing.monthly')}
          </button>
          <button
            type="button"
            onClick={() => setCycle('yearly')}
            className={`rounded-full px-6 py-2 text-sm font-semibold transition-all ${
              cycle === 'yearly' ? 'bg-gradient-to-r from-primary to-glow text-white shadow-glow' : 'text-muted hover:text-white'
            }`}
          >
            {t('pricing.yearly')}
          </button>
        </div>
      </div>

      {!plans ? (
        <div className="flex justify-center py-32">
          <Spinner size={36} />
        </div>
      ) : (
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-2 max-w-4xl mx-auto">
          {plans.map((p, idx) => {
            const price = cycle === 'monthly' ? p.monthly : p.yearly;
            const per = cycle === 'monthly' ? t('pricing.perMonth') : t('pricing.perYear');
            const isElite = p.isHighestTier;
            return (
              <div
                key={p.key}
                className={`glass pricing-card card-hover fade-up relative flex flex-col rounded-3xl p-8 ${
                  isElite ? 'glow-border lg:-translate-y-3' : ''
                }`}
                style={{ animationDelay: `${idx * 0.12}s` }}
              >
                {p.badge && (
                  <div className="absolute -top-3 right-8">
                    <Badge tone={isElite ? 'purple' : 'green'}>
                      {isElite ? t('pricing.badge.top') : t('pricing.badge.popular')}
                    </Badge>
                  </div>
                )}
                <h3 className="font-display text-xl font-extrabold text-gradient">{t(`plan.${p.key}.name`) || p.name}</h3>
                <p className="mt-1 text-sm text-muted">{t(`plan.${p.key}.tagline`) || p.tagline}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="font-display text-5xl font-black text-gradient">${price}</span>
                  <span className="mb-1.5 text-sm text-muted">{per}</span>
                </div>
                {cycle === 'yearly' && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-sm text-muted line-through">${p.monthly * 12}</span>
                    <Badge tone="green">{t('pricing.save')}</Badge>
                  </div>
                )}
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {p.features.map((f, fi) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <svg className="mt-0.5 shrink-0 text-glow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-ink/90">{t(`plan.${p.key}.f${fi + 1}`) || f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {planActive(p.key) ? (
                    <div className="btn-ghost w-full cursor-default opacity-70">{t('pricing.current')}</div>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary w-full"
                      onClick={() => {
                        if (loading) return;
                        if (!user) {
                          navigate('/login', { state: { from: `/checkout?plan=${p.key}&cycle=${cycle}` } });
                          return;
                        }
                        navigate(`/checkout?plan=${p.key}&cycle=${cycle}`);
                      }}
                    >
                      {t('pricing.buy')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-16 text-center text-sm text-muted">
        <p>
          🔒 {t('login.subtitle')} · 🎟 {t('dash.openTickets')} ·{' '}
          <Link to="/refund" className="nav-link underline decoration-glow/40 underline-offset-4">
            {t('nav.refund')}
          </Link>
        </p>
      </div>
    </div>
  );
}
