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

// Exactly two plans. Yearly is monthly × 12 × 0.80 (20% annual discount).
// Feature copy is the canonical source (localized in the web layer by index).
const YEARLY_DISCOUNT = 0.8;
export const PLANS: Plan[] = [
  {
    key: 'starter',
    name: 'Starter',
    tagline: 'The foundation of your fleet',
    monthly: 35,
    yearly: Math.round(35 * 12 * YEARLY_DISCOUNT), // $336
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
    monthly: 45,
    yearly: Math.round(45 * 12 * YEARLY_DISCOUNT), // $432
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

export const PROMO_FORCED_MONTHLY_PRICE = 25;
export const PROMO_FORCED_YEARLY_PRICE = Math.round(PROMO_FORCED_MONTHLY_PRICE * 12 * YEARLY_DISCOUNT);
export const EXTRA_SLOT_PRICE = 15;
export const CURRENCY = 'USD';

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
