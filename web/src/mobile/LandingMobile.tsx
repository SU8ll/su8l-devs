import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { productImage } from '../productImages';
import MobileLayout, { type MobileNavItem } from './MobileLayout';
import { api, type StatusSummaryDto } from '../api';

export default function LandingMobile() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAr = lang === 'ar';
  const [summary, setSummary] = useState<StatusSummaryDto | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    api<StatusSummaryDto>('/api/status/summary').then(setSummary).catch(() => {});
  }, []);

  const up = summary?.current?.up;

  const nav: MobileNavItem[] = [
    { to: '/', label: t('nav.home'), icon: '⌂', end: true },
    { to: '/pricing', label: t('nav.pricing'), icon: '♦', primary: true },
    { to: '/status', label: t('nav.status'), icon: '◈' },
    { to: '/terms', label: t('nav.terms'), icon: 'ℹ' },
    { to: '/login', label: isAr ? 'دخول' : 'Login', icon: '→' },
  ];

  return (
    <MobileLayout
      title={logoFailed ? 'SU8L' : t('nav.brand')}
      subtitle={t('nav.tagline')}
      items={nav}
      onHome={() => navigate('/')}
    >
      {/* Brand header */}
      <div className="flex items-center gap-3 pb-1">
        {logoFailed ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-glow">
            <span className="font-display text-sm font-black text-white">SU</span>
          </div>
        ) : (
          <img
            src="/logo.png"
            alt=""
            className="h-11 w-11 rounded-2xl object-contain"
            onError={() => setLogoFailed(true)}
          />
        )}
        <div>
          <div className="font-display text-lg font-extrabold text-gradient">{t('nav.brand')}</div>
          <div className="text-[0.68rem] font-medium uppercase tracking-[0.25em] text-muted">{t('nav.tagline')}</div>
        </div>
      </div>

      {/* Hero */}
      <section className="m-hero-pad">
        <span className="m-hero-badge">
          <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          {up === undefined ? '…' : up ? t('status.allSystemsOnline') : t('status.badgeDown')}
        </span>
        <div className="m-hero">
          <h1>
            <span className="block text-gradient">{t('hero.title1')}</span>
            <span className="block mt-1">{t('hero.title2')}</span>
          </h1>
          <p className="m-sub mt-3">{t('hero.subtitle')}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link to="/pricing" className="m-btn m-btn-primary">{t('hero.cta1')}</Link>
            <Link to="/status" className="m-btn m-btn-ghost">{t('hero.cta2')}</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="m-stats mt-8">
          {[
            { v: '∞', l: t('stat.deploy') },
            { v: '99.9%', l: t('stat.uptime') },
            { v: '256-bit', l: t('stat.secure') },
            { v: '24/7', l: t('stat.support') },
          ].map((s, i) => (
            <div key={i} className="m-stat">
              <div className="font-display text-2xl font-black text-gradient">{s.v}</div>
              <div className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-muted">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="m-section">
        <div className="m-section-title">{isAr ? 'منتجاتنا' : 'OUR PRODUCTS'}</div>
        <div className="m-card space-y-4" style={{ padding: '0.75rem' }}>
          {[
            { icon: '🏛️', imageKey: 'cloud-city-bot', title: isAr ? 'بوت المدينة السحابي' : 'Cloud City Bot', desc: isAr ? 'أتمتة شاملة للمدينة — بناء، تقنية، موارد 24/7' : 'Full city automation — build, tech, resources 24/7' },
            { icon: '⚔️', imageKey: 'command-center', title: isAr ? 'القيادة العسكرية' : 'Military Command', desc: isAr ? 'تدريب وتجمع ودفاع آلي — صفر توقف' : 'Auto train, gather, defend — zero downtime' },
            { icon: '🌐', imageKey: 'osota', title: isAr ? 'أدوات الترجمة' : 'Translation Tools', desc: isAr ? 'OSotA Kutlu — ترجمة فورية لأكثر من 9 لغات' : 'OSotA Kutlu — instant translation for 9+ languages' },
            { icon: '👑', imageKey: 'kingshot', title: isAr ? 'Kingshot Bot' : 'Kingshot Bot', desc: isAr ? 'إدارة تحالف كامل مع OCR والحضور' : 'Complete alliance management with OCR & attendance' },
          ].map((item, i) => (
            <Link key={i} to="/pricing" className="m-product-row flex items-center gap-3 rounded-2xl border border-white/[0.05]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-2xl">
                {item.imageKey && productImage(item.imageKey) ? (
                  <img src={productImage(item.imageKey)!} alt="" className="h-9 w-9 rounded-lg object-contain" />
                ) : (
                  <span>{item.icon}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{item.title}</div>
                <div className="truncate text-xs text-muted">{item.desc}</div>
              </div>
              <span className="ml-auto text-muted">›</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust / CTA */}
      <section className="m-section">
        <div className="m-card" style={{ background: 'rgba(168,85,247,0.05)', borderColor: 'rgba(168,85,247,0.18)' }}>
          <div className="m-title" style={{ fontSize: '1.35rem' }}>{t('pricing.title')}</div>
          <p className="m-sub mt-1">{t('pricing.subtitle')}</p>
          <div className="mt-5 flex flex-col gap-3">
            <Link to="/pricing" className="m-btn m-btn-primary">{t('hero.cta1')}</Link>
            {user ? (
              <button type="button" className="m-btn m-btn-ghost" onClick={() => navigate('/dashboard')}>{t('nav.dashboard')}</button>
            ) : (
              <Link to="/login" className="m-btn m-btn-ghost">{t('nav.login')}</Link>
            )}
          </div>
        </div>
      </section>
    </MobileLayout>
  );
}
