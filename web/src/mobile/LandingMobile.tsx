import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { productImage } from '../productImages';
import MobileLayout, { MIcons, type MobileNavItem } from './MobileLayout';
import { api, type StatusSummaryDto } from '../api';

export default function LandingMobile() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAr = lang === 'ar';
  const [summary, setSummary] = useState<StatusSummaryDto | null>(null);

  useEffect(() => {
    api<StatusSummaryDto>('/api/status/summary').then(setSummary).catch(() => {});
  }, []);

  const up = summary?.current?.up;

  const nav: MobileNavItem[] = user
    ? [
        { to: '/', label: t('nav.home'), icon: MIcons.home, end: true },
        { to: '/pricing', label: t('nav.pricing'), icon: MIcons.pricing },
        { to: '/status', label: t('nav.status'), icon: MIcons.status },
        { to: '/dashboard', label: t('nav.dashboard'), icon: MIcons.overview },
        { to: '/terms', label: t('nav.terms'), icon: MIcons.terms },
      ]
    : [
        { to: '/', label: t('nav.home'), icon: MIcons.home, end: true },
        { to: '/pricing', label: t('nav.pricing'), icon: MIcons.pricing },
        { to: '/status', label: t('nav.status'), icon: MIcons.status },
        { to: '/terms', label: t('nav.terms'), icon: MIcons.terms },
        { to: '/login', label: isAr ? 'دخول' : 'Login', icon: MIcons.login },
      ];

  return (
    <MobileLayout
      title={t('nav.brand')}
      subtitle={t('nav.tagline')}
      items={nav}
      onHome={() => navigate('/')}
    >

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
            <Link key={i} to="/pricing" className="m-product-row" style={{textDecoration:'none'}}>
              <div style={{width:48,height:48,flexShrink:0,borderRadius:12,border:'1px solid rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.03)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                {item.imageKey && productImage(item.imageKey) ? (
                  <img src={productImage(item.imageKey)!} alt="" style={{width:36,height:36,objectFit:'contain',display:'block'}} />
                ) : (
                  <span style={{fontSize:20}}>{item.icon}</span>
                )}
              </div>
              <div style={{minWidth:0, flex:1}}>
                <div style={{fontSize:14, fontWeight:700, color:'#F5F5F7', lineHeight:1.2}}>{item.title}</div>
                <div style={{fontSize:12.5, color:'#9A99A6', lineHeight:1.4, marginTop:3, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>{item.desc}</div>
              </div>
              <span style={{color:'#6B6A78', flexShrink:0, marginLeft:8}}>›</span>
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
