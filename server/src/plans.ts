export interface Plan {
  key: string;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  slots: number;
  badge?: string;
  features: string[];
  isHighestTier?: boolean;
}

const YEARLY_DISCOUNT = 0.8;
export const PLANS: Plan[] = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'The foundation of your fleet',
    monthly: 18,
    yearly: Math.round(18 * 12 * YEARLY_DISCOUNT),
    slots: 1,
    features: [
      '10 commands unlocked',
      '1 active bot slot',
      'Full Cloud Configurator',
      'Discord identity sync',
      '24/7 Ticket Support',
    ],
  },
  {
    key: 'elite',
    name: 'Elite',
    tagline: 'Maximum power. 35+ commands.',
    monthly: 22,
    yearly: Math.round(22 * 12 * YEARLY_DISCOUNT),
    slots: 6,
    badge: 'TOP TIER',
    isHighestTier: true,
    features: [
      '35+ commands unlocked',
      'Priority 24/7 Ticket Support',
      'Dedicated cloud resources',
      'Full Cloud Configurator',
      'Real-time status page',
    ],
  },
];

export interface Product {
  key: string;
  name: string;
  nameAr: string;
  tagline: string;
  taglineAr: string;
  price: number;
  icon: string;
  features: string[];
  featuresAr: string[];
}

export const PRODUCTS: Product[] = [
  {
    key: 'kingshot',
    name: 'Kingshot Bot',
    nameAr: 'بوت Kingshot',
    tagline: 'Complete Alliance Management System',
    taglineAr: 'نظام إدارة التحالف الكامل',
    price: 10,
    icon: '👑',
    features: [
      'Alliance Management',
      'Gift Code System',
      'Attendance & OCR',
      'Power Tracking',
      'Event Notifications',
      'Control Panel',
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
    key: 'osota',
    name: 'OSotA Kutlu',
    nameAr: 'OSotA Kutlu',
    tagline: 'Multilingual Translation Bot',
    taglineAr: 'بوت ترجمة متعدد اللغات',
    price: 10,
    icon: '🌐',
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
    key: 'command-center',
    name: 'Command Center',
    nameAr: 'Command Center',
    tagline: 'AI-Powered War Management',
    taglineAr: 'إدارة الحروب بالذكاء الاصطناعي',
    price: 170,
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
    key: 'auto-help',
    name: 'Auto Help',
    nameAr: 'المساعدة التلقائية',
    tagline: 'ADB-Based Automated Alliance Help',
    taglineAr: 'مساعدةتحالف تلقائية عبر ADB',
    price: 25,
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

export function getProduct(key: string | undefined | null): Product | undefined {
  return PRODUCTS.find((p) => p.key === key);
}

export const EXTRA_SLOT_PRICE = 15;
export const CURRENCY = 'USD';
export const DEFAULT_PROMO_DISCOUNT = 20;

export function promoPrice(plan: Plan, cycle: 'monthly' | 'yearly', discountPct: number): number {
  const base = cycle === 'yearly' ? plan.yearly : plan.monthly;
  const safe = Math.max(0, Math.min(100, discountPct));
  return Math.round((base * (100 - safe)) / 100);
}

export function getPlan(key: string | undefined | null): Plan | undefined {
  return PLANS.find((p) => p.key === key);
}

export function getHighestTier(): Plan {
  const p = PLANS.find((x) => x.isHighestTier);
  if (!p) throw new Error('No highest-tier plan configured');
  return p;
}

export function planCycleMonths(cycle: 'monthly' | 'yearly'): number {
  return cycle === 'yearly' ? 12 : 1;
}
