const BASE = import.meta.env.VITE_API_URL || '';

/** Resolves a server path against the API base URL (absolute in production). */
export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}

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
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('su8l_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers,
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

export interface AvatarItemDto {
  file: string;
  url: string;
}

export interface AvatarsResponse {
  default: string;
  avatars: AvatarItemDto[];
}

export async function getAvatars(): Promise<AvatarsResponse> {
  return api<AvatarsResponse>('/api/avatars');
}

export async function setMyAvatar(file: string): Promise<{ ok: boolean; avatar: string }> {
  return api<{ ok: boolean; avatar: string }>('/api/avatars/me', { method: 'PUT', body: { avatar: file } });
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
    active: boolean;
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
  /** true when the promo made the price $0 and the order was fulfilled server-side (no PayPal). */
  free?: boolean;
}

export type CloudFieldType = 'boolean' | 'number' | 'string' | 'select' | 'radio' | 'slider';

export interface CloudFieldSchema {
  key: string;
  label: string;
  description?: string;
  type: CloudFieldType;
  default: boolean | number | string;
  /** select / radio only */
  options?: string[];
  /** number / slider only */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** string only */
  placeholder?: string;
  maxLength?: number;
  /** string only — require non-empty value */
  required?: boolean;
  /** string / select / radio only — when present the UI must NOT auto-fill defaults */
  preserve_empty?: boolean;
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
  version?: number;
  categories: CloudCategorySchema[];
}

export interface CloudConfig {
  connection: {
    conn_group: {
      conn_auto_recon: boolean;
      conn_recon_delay: number;
      conn_other_login: number;
      conn_action_delay: number;
    };
  };
  collection: {
    col_main: {
      collect_mails: boolean;
      collect_quests: boolean;
      collect_rewards: boolean;
      sign_in_7d: boolean;
      sign_in_14d: boolean;
      home_sign_in: boolean;
      sign_in_draw: boolean;
      month_card: boolean;
      super_vip_daily: boolean;
      vip_daily_gift: boolean;
      vip_daily_exp: boolean;
      online_reward: boolean;
      recharge_reward: boolean;
      daily_task_rewards: boolean;
      homeland_life_tree: boolean;
      common_7d_sign_in: boolean;
      festival_7d_quests: boolean;
      collect_achievements: boolean;
      collect_gifts: boolean;
      free_customize_box: boolean;
      free_choice_pack: boolean;
      auto_claim_snow_fund: boolean;
      snow_fund_free_only: boolean;
      auto_claim_red_packets: boolean;
      server_sprint: boolean;
      auto_upgrade_lords: boolean;
      back_festival_quest: boolean;
      back_festival_boxes: boolean;
      delete_mails: boolean;
    };
  };
  law_edicts: {
    laws: {
      auto_enact: boolean;
      urgent_mob: string;
      rush_job: string;
      comp_care: string;
      prod_day: string;
      double_time: string;
      festivities: string;
    };
  };
  vip_bank: {
    vip: {
      vip_auto_time: boolean;
      vip_auto_buy_30d: boolean;
      vip_min_gems: number;
      vip_renew_days: number;
      vip_auto_xp: boolean;
      vip_max_lvl: number;
      vip_buy_xp: number;
    };
    bank: {
      bank_withdraw: boolean;
      bank_deposit: boolean;
      bank_locker: string;
      bank_use_max: boolean;
      bank_amount: number;
    };
  };
  alliance_systems: {
    alliance_base: {
      alliance_help: boolean;
      alliance_chest: boolean;
      alliance_donate: boolean;
      alliance_donate_bag: boolean;
      alliance_build: boolean;
    };
    alliance_development: {
      dev_daily: boolean;
      dev_weekly: boolean;
    };
    alliance_shop: {
      shop_auto: boolean;
      shop_daily: boolean;
      shop_daily_disc: number;
      shop_daily_spend: number;
      shop_weekly: boolean;
      shop_weekly_disc: number;
      shop_weekly_spend: number;
      filter_5m_const: boolean;
      filter_1h_const: boolean;
      filter_5m_train: boolean;
      filter_1h_train: boolean;
      filter_5m_res: boolean;
      filter_1h_res: boolean;
      filter_5m_heal: boolean;
      filter_1h_heal: boolean;
      filter_10xp: boolean;
      filter_100xp: boolean;
      filter_rename: boolean;
      filter_tp_random: boolean;
      filter_tp_alliance: boolean;
      filter_tp_terr: boolean;
      filter_tp_adv: boolean;
      filter_exp: boolean;
      filter_2h_shield: boolean;
      filter_8h_shield: boolean;
      filter_quinn: boolean;
    };
    alliance_autojoin: {
      aj_enable: boolean;
      aj_faster: boolean;
      aj_skip: boolean;
      aj_troops: string;
      aj_reactivate: number;
    };
    alliance_championship: {
      champ_enable: boolean;
      champ_lane: string;
      champ_inf: number;
      champ_cav: number;
      champ_rng: number;
    };
  };
  combat_traps: {
    alliance_trap: {
      trap_rewards: boolean;
      trap_claim: boolean;
      trap_reserve: boolean;
    };
    mine_war: {
      minewar_enable: boolean;
      minewar_apply: boolean;
      minewar_claim: boolean;
      minewar_battle: boolean;
    };
    viking_vengeance: {
      viking_enable: boolean;
      viking_heroes: number;
      viking_buffer: number;
      viking_lead: number;
      viking_announce: boolean;
    };
    bear_group: {
      bear_enable: boolean;
      bear_t1: boolean;
      bear_t2: boolean;
      bear_open: boolean;
      bear_launch: boolean;
      bear_wait: number;
      bear_max_marches: number;
      bear_fill: boolean;
      bear_max_troops: number;
      bear_donate: boolean;
      bear_arr_donate: number;
      bear_arr_reserve: number;
      bear_arr_maxed: boolean;
    };
    beast_group: {
      beast_enable: boolean;
      beast_min: number;
      beast_max: number;
      beast_retry: number;
      beast_best: boolean;
      beast_diana: boolean;
      beast_fahd: boolean;
      beast_min_stam: number;
      beast_stam_packs: boolean;
      beast_pack_res: number;
      beast_yield: boolean;
    };
    terror_group: {
      terror_enable: boolean;
      terror_min: number;
      terror_max: number;
      terror_rallies: number;
      terror_prep: string;
      terror_retry: number;
      terror_stam_packs: boolean;
      terror_pack_res: number;
      terror_diana: boolean;
      terror_fahd: boolean;
    };
  };
  protection: {
    shield_group: {
      shield_auto_target: boolean;
      shield_buy_gems: boolean;
      shield_duration: string;
      shield_recall_march: boolean;
    };
    recall_attack_group: {
      recall_gathering_attack: boolean;
      recall_seconds_before: number;
    };
  };
  development: {
    training_group: {
      train_enable: boolean;
      train_mode: string;
      train_tier: number;
      train_inf: boolean;
      train_cav: boolean;
      train_arch: boolean;
      train_speedup: string;
      train_bag: boolean;
      train_max: boolean;
    };
    hospital_group: {
      hosp_enable: boolean;
      hosp_all: boolean;
      hosp_batch: number;
      hosp_speedup: string;
      hosp_bag: boolean;
      hosp_wait: boolean;
      hosp_timeout: number;
    };
    hero_recruit: {
      hero_free: boolean;
      hero_adv_rec: boolean;
      hero_epic_rec: boolean;
      hero_use_adv: boolean;
      hero_use_epic: boolean;
      hero_auto_frag: boolean;
    };
    research_tech: {
      research_enable: boolean;
      truegold_tech: boolean;
    };
  };
  towers_arena: {
    arena_group: {
      arena_enable: boolean;
      arena_def: string;
      arena_atk: string;
      arena_min_power: number;
      arena_atk_allies: boolean;
      arena_refreshes: number;
      arena_start: string;
    };
    climb_tower: {
      climb_sweep: boolean;
      climb_quick: boolean;
      climb_chest: boolean;
      climb_t1: boolean;
      climb_t2: boolean;
      climb_t3: boolean;
      climb_t4: boolean;
      climb_t5: boolean;
      climb_t6: boolean;
      col_inf: number;
      col_cav: number;
      col_arch: number;
      fol_inf: number;
      fol_cav: number;
      fol_arch: number;
      cc_inf: number;
      cc_cav: number;
      cc_arch: number;
      kn_inf: number;
      kn_cav: number;
      kn_arch: number;
      mf_inf: number;
      mf_cav: number;
      mf_arch: number;
      rs_inf: number;
      rs_cav: number;
      rs_arch: number;
    };
    tower_defence: {
      td_enable: boolean;
      td_sweep: boolean;
      td_claim: boolean;
      td_upgrade: boolean;
      td_lvl: number;
      td_times: number;
    };
  };
  gathering: {
    gather_group: {
      gather_enable: boolean;
      gather_slots: number;
      gather_lvl: number;
      gather_form: string;
      gather_strat: string;
      gather_iron: number;
      gather_tiles: boolean;
      gather_hero: boolean;
      gather_boost: boolean;
    };
  };
  pets: {
    pet_adventure: {
      pet_dispatch: boolean;
      pet_explore: boolean;
      pet_share: boolean;
      pet_alliance: boolean;
      pet_stamina: boolean;
    };
  };
  island: {
    garden_homeland: {
      island_garden_signin: boolean;
      island_homestead_quests: boolean;
    };
    homeland_group: {
      island_upgrade_life_tree: boolean;
      island_upgrade_logging: boolean;
      island_place_decorations: boolean;
      island_synthesize_decorations: boolean;
      island_buy_decorations: boolean;
      island_move_logging: boolean;
      island_like_homelands: boolean;
    };
    expedition_group: {
      island_expedition_enable: boolean;
      island_expedition_dispatch: boolean;
      island_expedition_chests: boolean;
      island_expedition_milestone: boolean;
      island_expedition_daily: boolean;
    };
  };
  expert: {
    exp_travel: {
      exp_travel_mode: string;
      exp_use_pan: boolean;
    };
    exp_skills: {
      exp_learn: boolean;
      exp_send: boolean;
      exp_upg: boolean;
      exp_buy: boolean;
    };
  };
}

export interface CloudSlot {
  id: string;
  name: string;
}

export interface CloudConfigDto {
  config: CloudConfig;
  schema: CloudSchema;
  locked: boolean;
  discord: { username: string; id: string } | null;
  slots: CloudSlot[];
  activeSlotId: string | null;
}

export interface SaveCloudConfigResponse {
  ok: boolean;
  config: CloudConfig;
  activeSlotId: string;
  dispatched: boolean;
  dispatchReason?: string;
}

export interface RenameSlotResponse {
  ok: boolean;
  slot: CloudSlot;
}

/** Renames a bot slot (account) so its config context gets a friendly name. */
export async function renameAccount(slotId: string, name: string): Promise<RenameSlotResponse> {
  return api<RenameSlotResponse>(`/api/dashboard/slots/${encodeURIComponent(slotId)}/name`, {
    method: 'PUT',
    body: { name },
  });
}
