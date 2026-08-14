import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Kicker } from '../components/ui';
import FeaturesGrid from '../components/FeaturesGrid';
import { useEffect, useState } from 'react';
import { api, type StatusSummaryDto } from '../api';

function LiveBadge() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<StatusSummaryDto | null>(null);
  useEffect(() => {
    api<StatusSummaryDto>('/api/status/summary')
      .then(setSummary)
      .catch(() => {});
  }, []);
  const up = summary?.current?.up;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-muted">
      <span className={up === undefined ? 'h-2 w-2 rounded-full bg-glow/40' : up ? 'pulse-dot' : 'h-2 w-2 rounded-full bg-red-400'} />
      {up === undefined ? '…' : up ? t('status.allSystemsOnline') : t('status.badgeDown')}
    </span>
  );
}

export default function Landing() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* Hero */}
      <section className="relative flex min-h-[72vh] flex-col items-center justify-center py-20 text-center">
        <div className="fade-up mb-6 flex items-center gap-3">
          <LiveBadge />
        </div>
        <Kicker>{t('hero.kicker')}</Kicker>
        <h1 className="max-w-4xl font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          <span className="text-glow">{t('hero.title1')}</span>{' '}
          <span className="text-gradient">{t('hero.title2')}</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {t('hero.subtitle')}
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link to="/pricing" className="btn-primary w-64">
            {t('hero.cta1')}
          </Link>
          <Link to="/status" className="btn-ghost w-64">
            {t('hero.cta2')}
          </Link>
        </div>

        {/* Stats band */}
        <div className="mt-20 grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { v: '∞', l: t('stat.deploy') },
            { v: '99.9%', l: t('stat.uptime') },
            { v: 'AES-256', l: t('stat.secure') },
            { v: '24/7', l: t('stat.support') },
          ].map((s, i) => (
            <div
              key={i}
              className="glass card-hover fade-up rounded-2xl px-4 py-6 text-center"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="font-display text-2xl font-extrabold text-gradient">{s.v}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <FeaturesGrid />

      {/* CTA band */}
      <section className="py-20">
        <div className="glass-strong glow-border relative overflow-hidden rounded-3xl px-8 py-16 text-center">
          <div className="orb orb-1 !opacity-30" />
          <Kicker>{t('pricing.title')}</Kicker>
          <p className="mx-auto mt-2 max-w-xl text-muted">{t('pricing.subtitle')}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/pricing" className="btn-primary">
              {t('hero.cta1')}
            </Link>
            <Link to="/login" className="btn-ghost">
              {t('nav.login')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
