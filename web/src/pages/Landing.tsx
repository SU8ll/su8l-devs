import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { Kicker } from '../components/ui';
import FeaturesGrid from '../components/FeaturesGrid';
import { useEffect, useState, useRef } from 'react';
import { api, type StatusSummaryDto } from '../api';
import { useScrollReveal } from '../hooks/useScrollReveal';

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
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-4 py-1.5 text-xs font-semibold text-emerald-300">
      <span className={up === undefined ? 'h-2 w-2 rounded-full bg-emerald-400/40' : up ? 'pulse-dot' : 'h-2 w-2 rounded-full bg-red-400'} />
      {up === undefined ? '…' : up ? t('status.allSystemsOnline') : t('status.badgeDown')}
    </span>
  );
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1500;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="font-display text-3xl font-black text-gradient counter-animate sm:text-4xl">
      {count}{suffix}
    </span>
  );
}

export default function Landing() {
  const { t, lang } = useI18n();
  const isAr = lang === 'ar';
  useScrollReveal();
  const [summary, setSummary] = useState<StatusSummaryDto | null>(null);

  useEffect(() => {
    api<StatusSummaryDto>('/api/status/summary').then(setSummary).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      {/* ═══ Hero ═══════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden py-20 text-center">
        {/* Floating orbs */}
        <div className="hero-orb hero-orb-1" aria-hidden="true" />
        <div className="hero-orb hero-orb-2" aria-hidden="true" />

        {/* Orbit ring decoration */}
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 opacity-20" aria-hidden="true">
          <div className="orbit-ring absolute inset-0" />
        </div>

        <div className="fade-up mb-8 flex items-center gap-3">
          <LiveBadge />
        </div>

        {/* Maintenance banner */}
        {summary?.maintenance_mode === 1 && (
          <div className="relative z-10 mb-6 max-w-2xl rounded-2xl border border-amber-400/30 bg-amber-400/5 px-6 py-4 text-center backdrop-blur-sm">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-bold">
              <span>🔧</span> {t('status.maintenance')}
            </div>
            {summary.maintenance_message && (
              <p className="mt-1 text-sm text-amber-200/80">{summary.maintenance_message}</p>
            )}
          </div>
        )}

        <div className="relative z-10">
          <Kicker>{t('hero.kicker')}</Kicker>

          <h1 className="mt-4 max-w-5xl px-2 font-display text-[2.5rem] font-black leading-[1.1] tracking-tight sm:text-6xl lg:text-8xl">
            <span className="hero-title-line block text-gradient">{t('hero.title1')}</span>
            <span className="hero-title-line block text-glow mt-1">{t('hero.title2')}</span>
          </h1>

          <p className="hero-subtitle mx-auto mt-8 max-w-2xl px-4 text-base leading-relaxed text-muted sm:text-lg">
            {t('hero.subtitle')}
          </p>

          <div className="hero-cta mt-10 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:justify-center">
            <Link to="/pricing" className="btn-primary w-full sm:w-64 sm:text-base">
              {t('hero.cta1')}
            </Link>
            <Link to="/status" className="btn-ghost w-full sm:w-64 sm:text-base">
              {t('hero.cta2')}
            </Link>
          </div>
        </div>

        {/* Stats band */}
        <div className="relative z-10 mt-24 grid w-full max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { v: '∞', l: t('stat.deploy'), isInfinity: true },
            { v: '99.9', l: t('stat.uptime'), suffix: '%' },
            { v: '256', l: t('stat.secure'), suffix: '-bit' },
            { v: '24', l: t('stat.support'), suffix: '/7' },
          ].map((s, i) => (
            <div
              key={i}
              className="stat-glass reveal"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              {s.isInfinity ? (
                <span className="font-display text-3xl font-black text-gradient counter-animate sm:text-4xl">∞</span>
              ) : (
                <AnimatedCounter target={Number(s.v)} suffix={s.suffix || ''} />
              )}
              <div className="mt-2 text-[0.65rem] uppercase tracking-[0.15em] text-muted sm:text-xs">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Features ═══════════════════════════════════════════════════════ */}
      <FeaturesGrid />

      {/* ═══ Products preview ═══════════════════════════════════════════════ */}
      <section className="py-16 sm:py-24">
        <div className="reveal text-center">
          <Kicker>{isAr ? 'ール منتجاتنا' : 'OUR PRODUCTS'}</Kicker>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            {isAr ? 'بوتات ديسكورد احترافية وأدوات على الحاسوب — مصممة للعمل دون توقف' : 'Professional Discord bots and desktop tools — engineered for non-stop performance'}
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '🏛️', title: isAr ? 'بوت المدينة السحابي' : 'Cloud City Bot', desc: isAr ? 'أتمتة شاملة للمدينة — بناء، تقنية، موارد 24/7' : 'Full city automation — build, tech, resources 24/7' },
            { icon: '⚔️', title: isAr ? 'القيادة العسكرية' : 'Military Command', desc: isAr ? 'تدريب وتجمع ودفاع آلي — صفر توقف' : 'Auto train, gather, defend — zero downtime' },
            { icon: '🌐', title: isAr ? 'بوتات الترجمة' : 'Translation Bots', desc: isAr ? 'OSotA Kutlu — ترجمة فورية لـ 9 لغات في الديسكورد' : 'OSotA Kutlu — instant 9-language translation in Discord' },
            { icon: '👑', title: isAr ? 'Kingshot Bot' : 'Kingshot Bot', desc: isAr ? 'نظام إدارةتحالف كامل مع OCR والحضور' : 'Complete alliance management with OCR & attendance' },
          ].map((item, i) => (
            <div
              key={i}
              className="glass feature-card card-hover reveal p-6 sm:p-7"
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-glow/20 bg-glow/5 text-3xl transition-transform duration-300 group-hover:scale-110">
                {item.icon}
              </div>
              <h3 className="font-display text-lg font-bold text-gradient">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Trust bar ═══════════════════════════════════════════════════════ */}
      <section className="py-12 sm:py-16">
        <div className="reveal glass-strong glow-border relative overflow-hidden rounded-3xl px-5 py-14 text-center sm:px-8 sm:py-16">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
          <div className="relative z-10">
            <Kicker>{t('pricing.title')}</Kicker>
            <p className="mx-auto mt-3 max-w-xl text-muted">{t('pricing.subtitle')}</p>
            <div className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row">
              <Link to="/pricing" className="btn-primary w-full sm:w-auto">
                {t('hero.cta1')}
              </Link>
              <Link to="/login" className="btn-ghost w-full sm:w-auto">
                {t('nav.login')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
