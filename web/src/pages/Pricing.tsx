import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { api, type DashboardDto, type PlanDto, type PlansResponse } from '../api';
import { Badge, Kicker, Spinner } from '../components/ui';
import { useScrollReveal } from '../hooks/useScrollReveal';

type Cycle = 'monthly' | 'yearly';

interface BotProduct {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  tagline: string;
  taglineAr: string;
  icon: string;
  features: string[];
  featuresAr: string[];
  hasHostingChoice?: boolean;
}

const BOT_PRODUCTS: BotProduct[] = [
  {
    id: 'kingshot',
    name: 'Kingshot Discord Bot',
    nameAr: 'بوت Kingshot للديسكورد',
    price: 10,
    tagline: 'Complete Kingshot Alliance Management System',
    taglineAr: 'نظام إدارة التحالف الكامل لـ Kingshot',
    icon: '👑',
    hasHostingChoice: true,
    features: [
      'Alliance Management',
      'Gift Code System',
      'Attendance & OCR',
      'Power Tracking',
      'Event Notifications',
      'Centralized Control Panel',
    ],
    featuresAr: [
      'إدارة التحالف',
      'نظام أكواد الهدايا',
      'الحضور والـ OCR',
      'تتبع القوة',
      'إشعارات الأحداث',
      'لوحة تحكم موحدة',
    ],
  },
  {
    id: 'osota',
    name: 'OSotA Kutlu',
    nameAr: 'OSotA Kutlu',
    price: 10,
    tagline: 'Multilingual Discord Translation Bot',
    taglineAr: 'بوت ترجمة متعدد اللغات للديسكورد',
    icon: '🌐',
    hasHostingChoice: true,
    features: [
      '9 Languages Supported',
      'Reaction Translation',
      'Right-Click Translate',
      'Auto Language Detection',
      'Private DM Translations',
      'Individual Preferences',
    ],
    featuresAr: [
      'دعم 9 لغات',
      'ترجمة بالتفاعل',
      'ترجمة بنقرة يمين',
      'كشف اللغة تلقائياً',
      'ترجمة خاصة بالرسائل المباشرة',
      'تفضيلات فردية',
    ],
  },
  {
    id: 'command-center',
    name: 'Command Center',
    nameAr: 'Command Center',
    price: 170,
    tagline: 'AI-Powered War Management',
    taglineAr: 'إدارة الحروب بالذكاء الاصطناعي',
    icon: '⚔️',
    features: [
      'AI War Brain',
      'Live Threat Analysis',
      'Instant Rally Management',
      'Battle Intelligence',
      'Strategic Decision Support',
      'Built for KvK',
    ],
    featuresAr: [
      'ذكاء الحرب بالـ AI',
      'تحليل التهديدات المباشر',
      'إدارة الفورات الفورية',
      'ذكاء المعركة',
      'دعم القرارات الاستراتيجية',
      'مصمم لـ KvK',
    ],
  },
  {
    id: 'auto-help',
    name: 'Auto Help',
    nameAr: 'المساعدة التلقائية',
    price: 25,
    tagline: 'ADB-Based Automated Alliance Help',
    taglineAr: 'مساعدةتحالف تلقائية عبر ADB',
    icon: '⚡',
    features: [
      'Background Operation',
      'Multi-Account Support',
      'Instant Detection & Execution',
      'Live System Monitoring',
      'Automatic Operation',
      'No Mouse Interference',
    ],
    featuresAr: [
      'تشغيل في الخلفية',
      'دعم حسابات متعددة',
      'كشف وتنفيذ فوري',
      'مراقبة مباشرة',
      'تشغيل تلقائي',
      'بدون تداخل بالماوس',
    ],
  },
];

export default function Pricing() {
  const { t, lang } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanDto[] | null>(null);
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [error, setError] = useState('');
  const [hostingModal, setHostingModal] = useState<BotProduct | null>(null);
  const isAr = lang === 'ar';
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
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
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

      {/* ── Other Bots Section ──────────────────────────────── */}
      <div className="mt-24">
        <div className="reveal text-center">
          <Kicker>{isAr ? 'بوتات أخرى' : 'OTHER PRODUCTS'}</Kicker>
          <p className="mx-auto mt-3 max-w-2xl text-muted">
            {isAr ? 'بوتات ديسكورد وأدوات على الحاسوب — جاهزة للعمل' : 'Discord bots & desktop tools — ready to deploy'}
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {BOT_PRODUCTS.map((bot, idx) => (
            <div
              key={bot.id}
              className="glass pricing-card card-hover fade-up relative flex flex-col rounded-3xl p-6"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="text-4xl mb-4">{bot.icon}</div>
              <h3 className="font-display text-lg font-extrabold text-gradient">
                {isAr ? bot.nameAr : bot.name}
              </h3>
              <p className="mt-1 text-sm text-muted min-h-[40px]">
                {isAr ? bot.taglineAr : bot.tagline}
              </p>
              <div className="mt-4 flex items-end gap-1">
                <span className="font-display text-3xl font-black text-gradient">${bot.price}</span>
                <span className="mb-1 text-xs text-muted">{isAr ? 'دفعة واحدة' : 'one-time'}</span>
              </div>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {(isAr ? bot.featuresAr : bot.features).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <svg className="mt-0.5 shrink-0 text-glow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-ink/80">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <button
                  type="button"
                  className="btn-primary w-full text-sm"
                  onClick={() => {
                    if (bot.hasHostingChoice) {
                      setHostingModal(bot);
                    } else {
                      toast(isAr ? 'تواصل معنا عبر التذاكر للطلب' : 'Contact us via tickets to order', 'ok');
                    }
                  }}
                >
                  {isAr ? 'شراء' : 'Buy Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hosting Choice Modal ────────────────────────────── */}
      {hostingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={() => setHostingModal(null)}>
          <div
            className="glass-strong w-full max-w-lg rounded-3xl p-8 glow-border modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-2xl font-extrabold text-gradient text-center">
              {hostingModal.icon} {isAr ? hostingModal.nameAr : hostingModal.name}
            </h2>
            <p className="mt-2 text-center text-sm text-muted">
              {isAr ? 'اختر نوع الاستضافة' : 'Choose your hosting type'}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                className="glass feature-card group flex flex-col items-center gap-3 rounded-2xl border border-white/8 p-6 text-center transition-all duration-300 hover:border-emerald-400/40 hover:bg-emerald-400/5"
                onClick={() => {
                  setHostingModal(null);
                  toast(isAr ? 'تم اختيار الاستضافة المحلية المجانية' : 'Free local hosting selected', 'ok');
                }}
              >
                <div className="text-3xl transition-transform duration-300 group-hover:scale-110">🏠</div>
                <div>
                  <div className="font-display text-lg font-bold text-emerald-400">
                    {isAr ? 'استضافة محلية' : 'Local Hosting'}
                  </div>
                  <div className="text-sm text-muted mt-1">
                    {isAr ? 'مجاني — تشغيل على جهازك' : 'Free — runs on your PC'}
                  </div>
                </div>
                <div className="rounded-full bg-emerald-400/10 px-4 py-1.5 text-sm font-bold text-emerald-400">
                  $0
                </div>
              </button>

              <button
                type="button"
                className="glass feature-card group flex flex-col items-center gap-3 rounded-2xl border border-white/8 p-6 text-center transition-all duration-300 hover:border-glow/40 hover:bg-glow/5"
                onClick={() => {
                  setHostingModal(null);
                  if (!user) {
                    navigate('/login');
                    return;
                  }
                  toast(isAr ? 'تواصل معنا عبر التذاكر لتفعيل الاستضافة السحابية ($8/شهر)' : 'Contact us via tickets to activate cloud hosting ($8/mo)', 'ok');
                }}
              >
                <div className="text-3xl transition-transform duration-300 group-hover:scale-110">☁️</div>
                <div>
                  <div className="font-display text-lg font-bold text-glow">
                    {isAr ? 'استضافة سحابية' : 'Cloud Hosting'}
                  </div>
                  <div className="text-sm text-muted mt-1">
                    {isAr ? '24/7 — على سيرفرنا' : '24/7 — on our server'}
                  </div>
                </div>
                <div className="rounded-full bg-glow/10 px-4 py-1.5 text-sm font-bold text-glow">
                  $8<span className="text-xs font-normal text-muted">/mo</span>
                </div>
              </button>
            </div>

            <button
              type="button"
              className="mt-6 w-full text-sm text-muted hover:text-white transition-colors"
              onClick={() => setHostingModal(null)}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
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

function toast(msg: string, kind?: string) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast ' + (kind || '');
  setTimeout(() => el.classList.add('hidden'), 3500);
}
