const BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  status: number;
  detail?: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

export interface PlanDto {
  key: string;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  slots: number;
  badge: string | null;
  isHighestTier: boolean;
  features: string[];
}

export interface PlansResponse {
  plans: PlanDto[];
  currency: string;
}

export interface MeDto {
  id: string;
  username: string;
  avatar: string | null;
  email: string | null;
  locale: string | null;
  slots: { base: number; extra: number; total: number; active: boolean };
  subscriptions: number;
  extraSlots: number;
}

export interface DashboardDto {
  user: { id: string; username: string; avatar: string | null; email: string | null };
  subscriptions: {
    id: string;
    planKey: string;
    planName: string;
    cycle: string;
    amount: number;
    status: string;
    currentPeriodEnd: number | null;
  }[];
  activeSubscriptions: number;
  slots: { base: number; extra: number; total: number; active: boolean };
  extraSlots: number;
  canBuyExtraSlot: boolean;
  ownsExtraSlot: boolean;
  extraSlotPrice: number;
  status: StatusSummaryDto;
}

export interface StatusSummaryDto {
  target: string;
  configured: boolean;
  current: { up: boolean; latencyMs: number | null; at: string } | null;
  uptime24h: number;
  uptime7d: number;
  uptime30d: number;
}

export interface StatusHistoryDto {
  days: number;
  history: { day: string; ok: number; total: number; latency: number | null }[];
}

export interface OrderSummaryDto {
  id: string;
  status: string;
  plan: string;
  amount: number;
  currency: string;
  extraSlot: boolean;
  discordUsername: string | null;
  discordAvatar: string | null;
  createdAt: string;
  whatsapp: string;
}

export interface CreateCheckoutDto {
  planKey?: string;
  cycle?: 'monthly' | 'yearly';
  promoCode?: string | null;
  extraSlot?: boolean;
}

export interface CreateCheckoutResponse {
  orderId: string;
  paypalOrderId: string;
  approvalUrl: string;
  amount: number;
  currency: string;
  extraSlot: boolean;
  promoApplied: boolean;
}

export type CloudFieldType = 'boolean' | 'number' | 'string' | 'select' | 'radio';

export interface CloudFieldSchema {
  key: string;
  label: string;
  description?: string;
  type: CloudFieldType;
  default: boolean | number | string;
  /** select / radio only */
  options?: string[];
  /** number only */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** render a range slider instead of a plain number input */
  slider?: boolean;
  /** string only */
  placeholder?: string;
  maxLength?: number;
  /** string only — require non-empty value */
  required?: boolean;
}

export interface CloudCategorySchema {
  /** config key for this category/group */
  id: string;
  title: string;
  /** UI-only metadata (not part of the config payload) */
  icon?: string;
  description?: string;
  /** top-level categories may be pure containers (fields live in groups) */
  fields?: CloudFieldSchema[];
  /** nested sub-modules (rendered as sub-section cards) */
  groups?: CloudCategorySchema[];
}

export interface CloudSchema {
  version: number;
  categories: CloudCategorySchema[];
}

export interface CloudConfig {
  law_edicts: {
    laws: {
      auto_enact_laws: boolean;
      urgent_mobilization: string;
      rush_job: string;
      comprehensive_care: string;
      productivity_day: string;
      double_time: string;
      festivities: string;
    };
  };
  vip_bank: {
    vip_config: {
      auto_use_vip_time: boolean;
      auto_buy_vip_30d: boolean;
      min_gems_balance: number;
      renew_days_left: number;
      auto_use_vip_xp: boolean;
      max_vip_target: number;
      buy_xp_diamonds: number;
    };
    bank_config: {
      auto_withdraw_bank: boolean;
      auto_deposit_gems: boolean;
      bank_locker: string;
      bank_use_max_gems: boolean;
      bank_amount: number;
    };
  };
  alliance_systems: {
    alliance_basics: {
      alliance_auto_help: boolean;
      collect_alliance_chest: boolean;
      alliance_auto_donate: boolean;
      alliance_donate_use_bag: boolean;
      claim_alliance_dev_daily: boolean;
      claim_alliance_dev_weekly: boolean;
    };
    alliance_shop: {
      shop_enable_auto_buy: boolean;
      shop_daily_min_discount: number;
      shop_daily_max_spend: number;
      shop_weekly_min_discount: number;
      shop_weekly_max_spend: number;
    };
    alliance_auto_join: {
      autojoin_enable: boolean;
      autojoin_join_faster: boolean;
      autojoin_skip_unreachable: boolean;
      autojoin_troops: string;
      autojoin_reactivate: number;
    };
    alliance_championship: {
      champ_auto_enroll: boolean;
      champ_lane: string;
      champ_infantry: number;
      champ_cavalry: number;
      champ_ranged: number;
    };
  };
  combat_events: {
    bear_trap: {
      bear_enable_autojoin: boolean;
      bear_join_trap_1: boolean;
      bear_join_open_rallies: boolean;
      bear_auto_launch_own: boolean;
      bear_max_marches: number;
      bear_fill_capacity: boolean;
      bear_max_troops: number;
      bear_auto_donate_arrows: boolean;
    };
    beast: {
      beast_enable: boolean;
      beast_lvl_min: number;
      beast_lvl_max: number;
      beast_retry: number;
      beast_best_heroes: boolean;
      beast_prefer_diana: boolean;
      beast_prefer_fahd: boolean;
      beast_use_stamina_packs: boolean;
    };
    terror_rally: {
      terror_enable: boolean;
      terror_lvl_min: number;
      terror_lvl_max: number;
      terror_max_rallies: number;
      terror_prepare_time: string;
    };
  };
  development: {
    training: {
      train_enable: boolean;
      train_mode: string;
      train_tier: number;
      train_speedup: string;
    };
    hospital: {
      hosp_auto_heal: boolean;
      hosp_batch_size: number;
      hosp_speedup: string;
      hosp_wait_help: number;
    };
  };
  gathering_island: {
    gathering: {
      gather_enable: boolean;
      gather_march_slots: number;
      gather_tile_min: number;
      gather_formation: string;
      gather_strategy: string;
      gather_iron_priority: number;
      gather_boost: boolean;
    };
    island: {
      island_life_tree: boolean;
      island_logging_camps: boolean;
      island_auto_like: boolean;
    };
  };
  daily_collection: {
    collection: {
      col_mails: boolean;
      col_quests: boolean;
      col_rewards: boolean;
      col_achievements: boolean;
      col_gifts: boolean;
      col_alliance_red_packets: boolean;
    };
    pet_adventure: {
      pet_dispatch: boolean;
      pet_claim_explore: boolean;
      pet_claim_alliance: boolean;
    };
  };
}

export interface CloudConfigDto {
  config: CloudConfig;
  schema: CloudSchema;
  slotsAvailable: number;
  locked: boolean;
  discord: { username: string; id: string } | null;
}

export interface SaveCloudConfigResponse {
  ok: boolean;
  config: CloudConfig;
  dispatched: boolean;
  dispatchReason?: string;
}
