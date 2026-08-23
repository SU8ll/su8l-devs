import { z } from 'zod';

/**
 * The MASTER_SCHEMA is the single source of truth for the entire Cloud
 * Configurator. It is a plain, JSON-serializable object that drives:
 *
 *  - the web panel renderer (every category/tab/group/field is derived from it),
 *  - the API validation schema (built from it via `fieldSchema`),
 *  - the default config payload (built from it via `categoryDefault`),
 *  - the Discord DM summary (compiled by walking it).
 *
 * To add a new tunable: add a field (or an entire category/group) here. Nothing
 * else in the stack needs to change — the UI, the validator, defaults and the
 * DM summary all adapt automatically.
 *
 * This is the FINAL AUTHORITATIVE, NON-TRUNCATED, UNMERGED ULTIMATE SCHEMA
 * (11 categories, Connection first). Every key, group and field below must
 * render as its own distinct UI card.
 */

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
  id: string;
  title: string;
  icon?: string;
  description?: string;
  fields?: CloudFieldSchema[];
  /** root only — top-level categories */
  categories?: CloudCategorySchema[];
  groups?: CloudCategorySchema[];
}

/** Ids of groups that are 100%-ratio triplets (Inf/Cav/Arch). */
const RATIO_GROUP_IDS = new Set(['alliance_championship', 'climb_tower']);

/**
 * Describes a single 100%-constrained triple. `ratioGroupFor(path)` maps the
 * innermost path segment back to the owning group for hard-clamping.
 */
export interface RatioGroup {
  name: string;
  categoryId: string;
  groupId: string;
  keys: string[];
}

export const RATIO_GROUPS: RatioGroup[] = [
  { name: 'Championship', categoryId: 'alliance_systems', groupId: 'alliance_championship', keys: ['champ_inf', 'champ_cav', 'champ_rng'] },
  { name: 'Coliseum', categoryId: 'towers_arena', groupId: 'climb_tower', keys: ['col_inf', 'col_cav', 'col_arch'] },
  { name: 'Forest of Life', categoryId: 'towers_arena', groupId: 'climb_tower', keys: ['fol_inf', 'fol_cav', 'fol_arch'] },
  { name: 'Crystal Cave', categoryId: 'towers_arena', groupId: 'climb_tower', keys: ['cc_inf', 'cc_cav', 'cc_arch'] },
  { name: 'Knowledge Nexus', categoryId: 'towers_arena', groupId: 'climb_tower', keys: ['kn_inf', 'kn_cav', 'kn_arch'] },
  { name: 'Molten Fort', categoryId: 'towers_arena', groupId: 'climb_tower', keys: ['mf_inf', 'mf_cav', 'mf_arch'] },
  { name: 'Radiant Spire', categoryId: 'towers_arena', groupId: 'climb_tower', keys: ['rs_inf', 'rs_cav', 'rs_arch'] },
];

export function ratioGroupFor(path: string[]): RatioGroup | undefined {
  if (path.length < 3) return undefined;
  const key = path[path.length - 1] ?? '';
  return RATIO_GROUPS.find((r) => r.categoryId === path[0] && r.keys.includes(key));
}

/** Builds the zod validator for a single field. */
export function fieldSchema(f: CloudFieldSchema): z.ZodType<unknown> {
  switch (f.type) {
    case 'boolean':
      return z.boolean();
    case 'number':
    case 'slider': {
      let s = z.number();
      if (f.min !== undefined) s = s.min(f.min);
      if (f.max !== undefined) s = s.max(f.max);
      return s;
    }
    case 'string': {
      let s = z.string();
      if (f.maxLength !== undefined) s = s.max(f.maxLength);
      if (f.required && !f.preserve_empty) s = s.min(1, `${f.label} is required`);
      return s;
    }
    case 'select':
    case 'radio': {
      const s = z.string();
      return f.options && f.options.length > 0 ? s.refine((v) => f.options!.includes(v)) : s;
    }
  }
}

/** Recursively walks a category, flattening every field (groups included). */
function walk(fields: CloudFieldSchema[], c: CloudCategorySchema, prefix: string[]): void {
  for (const f of c.fields ?? []) fields.push({ ...f, key: [...prefix, f.key].join('.') });
  for (const sub of [...(c.categories ?? []), ...(c.groups ?? [])]) {
    walk(fields, sub, [...prefix, sub.id]);
  }
}

/** Returns a flat `key -> schema` map (group ids joined with `.`). */
export function flattenedSchema(root: CloudCategorySchema): Record<string, CloudFieldSchema> {
  const out: Record<string, CloudFieldSchema> = {};
  const fields: CloudFieldSchema[] = [];
  walk(fields, root, []);
  for (const f of fields) out[f.key] = f;
  return out;
}

function schemaForCategory(c: CloudCategorySchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of c.fields ?? []) shape[f.key] = fieldSchema(f);
  for (const g of c.groups ?? []) shape[g.id] = schemaForCategory(g);
  return z.object(shape).passthrough();
}

/** Full zod validator for a whole config payload (for `POST /api/cloud/config`). */
export function configSchema(root: CloudCategorySchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const sub of [...(root.categories ?? []), ...(root.groups ?? [])]) {
    shape[sub.id] = schemaForCategory(sub);
  }
  return z.object(shape).passthrough();
}

function bool(def: boolean): CloudFieldSchema {
  return { key: '', label: '', type: 'boolean', default: def };
}

function num(label: string, def: number, min?: number, max?: number, step?: number, unit?: string): CloudFieldSchema {
  return { key: '', label, type: 'number', default: def, min, max, step, unit };
}

function slider(label: string, def: number, min: number, max: number, step?: number, unit?: string): CloudFieldSchema {
  return { key: '', label, type: 'slider', default: def, min, max, step, unit };
}

function str(label: string, def: string, opts?: { placeholder?: string; maxLength?: number; required?: boolean }): CloudFieldSchema {
  return { key: '', label, type: 'string', default: def, ...opts };
}

function sel(label: string, def: string, options: string[]): CloudFieldSchema {
  return { key: '', label, type: 'select', default: def, options };
}

function radio(label: string, def: string, options: string[]): CloudFieldSchema {
  return { key: '', label, type: 'radio', default: def, options };
}

export const EDICT_OPTIONS = [
  'Immediate',
  'OnBuildingStart',
  'OnResearchStart',
  'OnBuildingOrResearch',
  'WhenProductivityActive',
];

export const SPEEDUP_OPTIONS = ['5 min (300s)', '15 min (900s)', '30 min (1800s)', '1 h (3600s)'];

const SPEEDUP_MODES = ['Disabled', 'TypeOnly', 'TypeAndGeneral'];

const CONNECTION_CATEGORY: CloudCategorySchema = {
  id: 'connection',
  title: 'Connection',
  icon: '🔌',
  groups: [
    {
      id: 'conn_group',
      title: 'Connection',
      icon: '🔌',
      fields: [
        { ...bool(true), key: 'conn_auto_recon', label: 'Auto Reconnect on disconnect' },
        { ...num('Reconnect Delay (s)', 30), key: 'conn_recon_delay' },
        { ...num('Reconnect Delay after other-device login (s)', 600), key: 'conn_other_login' },
        { ...num('Action delay (ms)', 2000), key: 'conn_action_delay' },
      ],
    },
  ],
};

const COLLECTION_CATEGORY: CloudCategorySchema = {
  id: 'collection',
  title: 'Collection & Rewards',
  icon: '🎁',
  groups: [
    {
      id: 'col_main',
      title: 'Collection',
      icon: '🎁',
      fields: [
        { ...bool(true), key: 'collect_mails', label: 'Collect Mails' },
        { ...bool(true), key: 'collect_quests', label: 'Collect Quests' },
        { ...bool(true), key: 'collect_rewards', label: 'Collect Rewards' },
        { ...bool(true), key: 'sign_in_7d', label: '7-Day Sign-in' },
        { ...bool(true), key: 'sign_in_14d', label: '14-Day Sign-in' },
        { ...bool(true), key: 'home_sign_in', label: 'Home Sign-in' },
        { ...bool(true), key: 'sign_in_draw', label: 'Sign-in Draw' },
        { ...bool(true), key: 'month_card', label: 'Month Card' },
        { ...bool(true), key: 'super_vip_daily', label: 'Super VIP Daily' },
        { ...bool(true), key: 'vip_daily_gift', label: 'VIP Daily Gift' },
        { ...bool(true), key: 'vip_daily_exp', label: 'VIP Daily EXP' },
        { ...bool(true), key: 'online_reward', label: 'Online Reward' },
        { ...bool(true), key: 'recharge_reward', label: 'Recharge Reward' },
        { ...bool(true), key: 'daily_task_rewards', label: 'Daily Task Rewards' },
        { ...bool(true), key: 'homeland_life_tree', label: 'Homeland Life Tree' },
        { ...bool(true), key: 'common_7d_sign_in', label: 'Common 7-Day Sign-in' },
        { ...bool(true), key: 'festival_7d_quests', label: 'Festival 7-Day Quests' },
        { ...bool(true), key: 'collect_achievements', label: 'Collect Achievements' },
        { ...bool(true), key: 'collect_gifts', label: 'Collect Gifts' },
        { ...bool(true), key: 'free_customize_box', label: 'Free Customize Box' },
        { ...bool(true), key: 'free_choice_pack', label: 'Free Multiple Choice Pack' },
        { ...bool(true), key: 'auto_claim_snow_fund', label: 'Auto-claim Snow Fund rewards' },
        { ...bool(false), key: 'snow_fund_free_only', label: 'Free tier only (skip paid)' },
        { ...bool(true), key: 'auto_claim_red_packets', label: 'Auto-claim Red Packets (Alliance)' },
        { ...bool(true), key: 'server_sprint', label: 'Auto-claim New Server Sprint Rewards' },
        { ...bool(false), key: 'auto_upgrade_lords', label: 'Auto-upgrade Lords Equipment' },
        { ...bool(true), key: 'back_festival_quest', label: 'Back Festival: Quest Rewards' },
        { ...bool(true), key: 'back_festival_boxes', label: 'Back Festival: Integral Boxes' },
        { ...bool(false), key: 'delete_mails', label: 'Delete Mails after collecting' },
      ],
    },
  ],
};

const LAW_EDICTS_CATEGORY: CloudCategorySchema = {
  id: 'law_edicts',
  title: 'Law (Edicts)',
  icon: '📜',
  groups: [
    {
      id: 'laws',
      title: 'Auto Enact Laws',
      icon: '📜',
      fields: [
        { ...bool(true), key: 'auto_enact', label: 'Auto Enact Laws' },
        { ...sel('Urgent Mobilization', 'Immediate', EDICT_OPTIONS), key: 'urgent_mob' },
        { ...sel('Rush Job', 'Immediate', EDICT_OPTIONS), key: 'rush_job' },
        { ...sel('Comprehensive Care', 'Immediate', EDICT_OPTIONS), key: 'comp_care' },
        { ...sel('Productivity Day', 'Immediate', EDICT_OPTIONS), key: 'prod_day' },
        { ...sel('Double Time', 'Immediate', EDICT_OPTIONS), key: 'double_time' },
        { ...sel('Festivities', 'Immediate', EDICT_OPTIONS), key: 'festivities' },
      ],
    },
  ],
};

const VIP_BANK_CATEGORY: CloudCategorySchema = {
  id: 'vip_bank',
  title: 'VIP & Bank',
  icon: '💎',
  groups: [
    {
      id: 'vip',
      title: 'VIP',
      icon: '💎',
      fields: [
        { ...bool(true), key: 'vip_auto_time', label: 'Auto-use VIP time items' },
        { ...bool(false), key: 'vip_auto_buy_30d', label: 'Auto-buy VIP 30d' },
        { ...num('Min gems balance', 12000), key: 'vip_min_gems' },
        { ...num('Renew when <= N days left', 3), key: 'vip_renew_days' },
        { ...bool(true), key: 'vip_auto_xp', label: 'Auto-use VIP XP items' },
        { ...num('Max VIP level target', 12, 1, 12), key: 'vip_max_lvl' },
        { ...num('Buy XP with Diamonds (0=off)', 0), key: 'vip_buy_xp' },
      ],
    },
    {
      id: 'bank',
      title: 'Bank',
      icon: '🏦',
      fields: [
        { ...bool(true), key: 'bank_withdraw', label: 'Auto-withdraw bank deposit' },
        { ...bool(true), key: 'bank_deposit', label: 'Auto-deposit gems' },
        {
          ...sel('Locker', 'Auto (first available)', [
            'Auto (first available)',
            'Locker 1',
            'Locker 2',
            'Locker 3',
            'Locker 4',
          ]),
          key: 'bank_locker',
        },
        { ...bool(true), key: 'bank_use_max', label: 'Use maximum gems' },
        { ...num('Amount (Max 6,500)', 0), key: 'bank_amount' },
      ],
    },
  ],
};

const ALLIANCE_SYSTEMS_CATEGORY: CloudCategorySchema = {
  id: 'alliance_systems',
  title: 'Alliance Systems',
  icon: '🤝',
  groups: [
    {
      id: 'alliance_base',
      title: 'Alliance',
      icon: '🤝',
      fields: [
        { ...bool(true), key: 'alliance_help', label: 'Auto Help' },
        { ...bool(true), key: 'alliance_chest', label: 'Collect Alliance Chest' },
        { ...bool(true), key: 'alliance_donate', label: 'Auto Donate' },
        { ...bool(false), key: 'alliance_donate_bag', label: 'Use bag resources' },
        { ...bool(false), key: 'alliance_build', label: 'Auto Send Troops to Build' },
      ],
    },
    {
      id: 'alliance_development',
      title: 'Alliance Development',
      icon: '📊',
      fields: [
        { ...bool(true), key: 'dev_daily', label: 'Claim Alliance Dev Daily' },
        { ...bool(true), key: 'dev_weekly', label: 'Claim Alliance Dev Weekly' },
      ],
    },
    {
      id: 'alliance_shop',
      title: 'Alliance Shop',
      icon: '🛒',
      fields: [
        { ...bool(true), key: 'shop_auto', label: 'Enable Auto-Buy' },
        { ...bool(true), key: 'shop_daily', label: 'Daily Shop' },
        { ...num('Min discount %', 0), key: 'shop_daily_disc' },
        { ...num('Max spend', 0), key: 'shop_daily_spend' },
        { ...bool(true), key: 'shop_weekly', label: 'Weekly Shop' },
        { ...num('Min discount %', 0), key: 'shop_weekly_disc' },
        { ...num('Max spend', 0), key: 'shop_weekly_spend' },
        { ...bool(true), key: 'filter_5m_const', label: '5m Construction' },
        { ...bool(true), key: 'filter_1h_const', label: '1h Construction' },
        { ...bool(true), key: 'filter_5m_train', label: '5m Training' },
        { ...bool(true), key: 'filter_1h_train', label: '1h Training' },
        { ...bool(true), key: 'filter_5m_res', label: '5m Research' },
        { ...bool(true), key: 'filter_1h_res', label: '1h Research' },
        { ...bool(false), key: 'filter_5m_heal', label: '5m Healing' },
        { ...bool(false), key: 'filter_1h_heal', label: '1h Healing' },
        { ...bool(true), key: 'filter_10xp', label: '10 VIP XP' },
        { ...bool(true), key: 'filter_100xp', label: '100 VIP XP' },
        { ...bool(false), key: 'filter_rename', label: 'Gov Rename Card' },
        { ...bool(false), key: 'filter_tp_random', label: 'Random Teleporter' },
        { ...bool(false), key: 'filter_tp_alliance', label: 'Alliance Teleporter' },
        { ...bool(false), key: 'filter_tp_terr', label: 'Territory Teleporter' },
        { ...bool(false), key: 'filter_tp_adv', label: 'Advanced Teleporter' },
        { ...bool(false), key: 'filter_exp', label: 'Expedition' },
        { ...bool(false), key: 'filter_2h_shield', label: '2h Shield' },
        { ...bool(false), key: 'filter_8h_shield', label: '8h Shield' },
        { ...bool(false), key: 'filter_quinn', label: 'Quinn Shard' },
      ],
    },
    {
      id: 'alliance_autojoin',
      title: 'Alliance Auto-Join',
      icon: '🚀',
      fields: [
        { ...bool(true), key: 'aj_enable', label: 'Enable Auto-Join' },
        { ...bool(true), key: 'aj_faster', label: 'Join Faster' },
        { ...bool(true), key: 'aj_skip', label: 'Skip unreachable rallies' },
        { ...radio('Troops', 'Full Formation', ['1 Soldier', 'Full Formation']), key: 'aj_troops' },
        { ...num('Reactivate before expiry (s)', 600), key: 'aj_reactivate' },
      ],
    },
    {
      id: 'alliance_championship',
      title: 'Alliance Championship',
      icon: '🏆',
      fields: [
        { ...bool(true), key: 'champ_enable', label: 'Auto-enroll in Championship' },
        { ...sel('Lane', 'Center', ['Left', 'Center', 'Right']), key: 'champ_lane' },
        { ...slider('Infantry %', 50, 0, 100), key: 'champ_inf' },
        { ...slider('Cavalry %', 20, 0, 100), key: 'champ_cav' },
        { ...slider('Ranged %', 30, 0, 100), key: 'champ_rng' },
      ],
    },
  ],
};

const COMBAT_TRAPS_CATEGORY: CloudCategorySchema = {
  id: 'combat_traps',
  title: 'Combat & Traps',
  icon: '⚔️',
  groups: [
    {
      id: 'alliance_trap',
      title: 'Alliance Trap',
      icon: '🕳️',
      fields: [
        { ...bool(true), key: 'trap_rewards', label: 'Alliance Trap Rewards' },
        { ...bool(true), key: 'trap_claim', label: 'Claim Trap Score Rewards' },
        { ...bool(true), key: 'trap_reserve', label: 'Auto-Reserve Trap' },
      ],
    },
    {
      id: 'mine_war',
      title: 'Mine War',
      icon: '⛏️',
      fields: [
        { ...bool(true), key: 'minewar_enable', label: 'Enable Mine War Module' },
        { ...bool(true), key: 'minewar_apply', label: 'Auto Apply / Sign Up' },
        { ...bool(true), key: 'minewar_claim', label: 'Auto Claim Gather Rewards' },
        { ...bool(true), key: 'minewar_battle', label: 'Auto Battle' },
      ],
    },
    {
      id: 'viking_vengeance',
      title: 'Viking Vengeance',
      icon: '🛡️',
      fields: [
        { ...bool(true), key: 'viking_enable', label: 'Enable Viking defense (auto-reinforce)' },
        { ...num('Heroes kept in city', 3), key: 'viking_heroes' },
        { ...num('Recall buffer (seconds)', 5), key: 'viking_buffer' },
        { ...num('Max recall lead (seconds)', 1800), key: 'viking_lead' },
        { ...bool(true), key: 'viking_announce', label: 'Announce reinforcement in alliance chat' },
      ],
    },
    {
      id: 'bear_group',
      title: 'Bear Trap',
      icon: '🐻',
      fields: [
        { ...bool(true), key: 'bear_enable', label: 'Enable Bear Trap Auto-Join' },
        { ...bool(true), key: 'bear_t1', label: 'Join Trap 1' },
        { ...bool(false), key: 'bear_t2', label: 'Join Trap 2' },
        { ...bool(true), key: 'bear_open', label: 'Join all open rallies' },
        { ...bool(true), key: 'bear_launch', label: 'Auto-launch own rally' },
        { ...num('Wait after rally created (s)', 0), key: 'bear_wait' },
        { ...num('Max marches per trap', 150000), key: 'bear_max_marches' },
        { ...bool(true), key: 'bear_fill', label: 'Fill march to capacity' },
        { ...num('Max troops per march', 150000), key: 'bear_max_troops' },
        { ...bool(true), key: 'bear_donate', label: 'Auto-donate Hunting Arrows' },
        { ...num('Arrows per donation', 100), key: 'bear_arr_donate' },
        { ...num('Keep arrows in reserve', 0), key: 'bear_arr_reserve' },
        { ...bool(false), key: 'bear_arr_maxed', label: 'Keep donating when trap maxed' },
      ],
    },
    {
      id: 'beast_group',
      title: 'Beast',
      icon: '🐉',
      fields: [
        { ...bool(false), key: 'beast_enable', label: 'Enable Beast Auto-Attack' },
        { ...num('Level range (min)', 30, 1, 50), key: 'beast_min' },
        { ...num('Level range (max)', 30, 1, 50), key: 'beast_max' },
        { ...num('Retry interval (s)', 60), key: 'beast_retry' },
        { ...bool(true), key: 'beast_best', label: 'Always use best heroes' },
        { ...bool(true), key: 'beast_diana', label: 'Prefer Diana' },
        { ...bool(true), key: 'beast_fahd', label: 'Prefer Fahd' },
        { ...num('Minimum stamina', 20), key: 'beast_min_stam' },
        { ...bool(true), key: 'beast_stam_packs', label: 'Auto-use stamina packs' },
        { ...num('Min packs reserve', 20), key: 'beast_pack_res' },
        { ...bool(false), key: 'beast_yield', label: 'Yield stamina to priority events' },
      ],
    },
    {
      id: 'terror_group',
      title: 'Terror (Rally)',
      icon: '💀',
      fields: [
        { ...bool(true), key: 'terror_enable', label: 'Enable Terror Rally Auto-Launch' },
        { ...num('Level range (min)', 8, 1, 50), key: 'terror_min' },
        { ...num('Level range (max)', 8, 1, 50), key: 'terror_max' },
        { ...num('Max rallies per day', 10), key: 'terror_rallies' },
        { ...sel('Prepare time', '5 min (300s)', SPEEDUP_OPTIONS), key: 'terror_prep' },
        { ...num('Retry interval (s)', 0), key: 'terror_retry' },
        { ...bool(false), key: 'terror_stam_packs', label: 'Auto-use stamina packs' },
        { ...num('Min packs reserve', 20), key: 'terror_pack_res' },
        { ...bool(true), key: 'terror_diana', label: 'Prefer Diana' },
        { ...bool(true), key: 'terror_fahd', label: 'Prefer Fahd' },
      ],
    },
  ],
};

const PROTECTION_CATEGORY: CloudCategorySchema = {
  id: 'protection',
  title: 'Protection',
  icon: '🛡️',
  groups: [
    {
      id: 'shield_group',
      title: 'Shield (City Attack)',
      icon: '🛡️',
      fields: [
        { ...bool(false), key: 'shield_auto_target', label: 'Auto-activate shield when city is targeted' },
        { ...bool(true), key: 'shield_buy_gems', label: 'Buy shield with gems if no free shield available' },
        { ...sel('Buy duration', 'H8', ['H2', 'H8', 'H24', 'H72']), key: 'shield_duration' },
        { ...bool(true), key: 'shield_recall_march', label: 'Recall outgoing attack marches to shield' },
      ],
    },
    {
      id: 'recall_attack_group',
      title: 'Recall on Attack',
      icon: '↩️',
      fields: [
        { ...bool(false), key: 'recall_gathering_attack', label: 'Auto-recall gathering marches when their tile is attacked' },
        { ...num('Seconds before impact', 2), key: 'recall_seconds_before' },
      ],
    },
  ],
};

const DEVELOPMENT_CATEGORY: CloudCategorySchema = {
  id: 'development',
  title: 'Development',
  icon: '📈',
  groups: [
    {
      id: 'training_group',
      title: 'Training',
      icon: '🏋️',
      fields: [
        { ...bool(true), key: 'train_enable', label: 'Enable Training' },
        { ...radio('Mode', 'Train new', ['Train new', 'Promote', 'Promote, then Train']), key: 'train_mode' },
        { ...num('Preferred Tier', 9, 1, 11), key: 'train_tier' },
        { ...bool(true), key: 'train_inf', label: 'Infantry' },
        { ...bool(true), key: 'train_cav', label: 'Cavalry' },
        { ...bool(true), key: 'train_arch', label: 'Archers' },
        { ...sel('Speed-up', 'Disabled', SPEEDUP_MODES), key: 'train_speedup' },
        { ...bool(false), key: 'train_bag', label: 'Use Resource Bag' },
        { ...bool(false), key: 'train_max', label: 'Fill to Max' },
      ],
    },
    {
      id: 'hospital_group',
      title: 'Hospital',
      icon: '🏥',
      fields: [
        { ...bool(true), key: 'hosp_enable', label: 'Auto Heal' },
        { ...bool(false), key: 'hosp_all', label: 'Heal All' },
        { ...num('Heal Batch Size', 100), key: 'hosp_batch' },
        { ...sel('Speed-up', 'Disabled', SPEEDUP_MODES), key: 'hosp_speedup' },
        { ...bool(false), key: 'hosp_bag', label: 'Use Resource Bag' },
        { ...bool(false), key: 'hosp_wait', label: 'Wait for alliance helps' },
        { ...num('Help wait timeout (s)', 30), key: 'hosp_timeout' },
      ],
    },
    {
      id: 'hero_recruit',
      title: 'Hero Recruit',
      icon: '🦸',
      fields: [
        { ...bool(true), key: 'hero_free', label: 'Auto free recruit' },
        { ...bool(true), key: 'hero_adv_rec', label: 'Advanced recruit' },
        { ...bool(true), key: 'hero_epic_rec', label: 'Epic recruit' },
        { ...bool(false), key: 'hero_use_adv', label: 'Use Advanced Key (Gold Key)' },
        { ...bool(false), key: 'hero_use_epic', label: 'Use Epic Key' },
        { ...bool(false), key: 'hero_auto_frag', label: 'Auto-recruit from fragments' },
      ],
    },
    {
      id: 'research_tech',
      title: 'Research & Truegold Tech',
      icon: '🔬',
      fields: [
        { ...bool(true), key: 'research_enable', label: 'Auto Research' },
        { ...bool(true), key: 'truegold_tech', label: 'Truegold Tech & War Academy' },
      ],
    },
  ],
};

const TOWERS_ARENA_CATEGORY: CloudCategorySchema = {
  id: 'towers_arena',
  title: 'Towers & Arena',
  icon: '🏰',
  groups: [
    {
      id: 'arena_group',
      title: 'Arena',
      icon: '⚔️',
      fields: [
        { ...bool(true), key: 'arena_enable', label: 'Auto-challenge (daily free)' },
        { ...radio('Defense team', 'Auto (best by power)', ['Auto (best by power)', 'Manual']), key: 'arena_def' },
        { ...radio('Attack team', 'Auto (best by power)', ['Auto (best by power)', 'Manual']), key: 'arena_atk' },
        { ...num('Min power advantage', 1), key: 'arena_min_power' },
        { ...bool(false), key: 'arena_atk_allies', label: 'Attack alliance members' },
        { ...num('Gem refreshes / day', 5), key: 'arena_refreshes' },
        { ...str('Start time (HH:mm)', '23:59'), key: 'arena_start' },
      ],
    },
    {
      id: 'climb_tower',
      title: 'Climb Tower',
      icon: '🧗',
      fields: [
        { ...bool(true), key: 'climb_sweep', label: 'Enable Sweep' },
        { ...bool(true), key: 'climb_quick', label: 'Enable Quick Challenge' },
        { ...bool(true), key: 'climb_chest', label: 'Claim Chest Rewards' },
        { ...bool(true), key: 'climb_t1', label: 'Tower 1' },
        { ...bool(true), key: 'climb_t2', label: 'Tower 2' },
        { ...bool(true), key: 'climb_t3', label: 'Tower 3' },
        { ...bool(true), key: 'climb_t4', label: 'Tower 4' },
        { ...bool(true), key: 'climb_t5', label: 'Tower 5' },
        { ...bool(true), key: 'climb_t6', label: 'Tower 6' },
        { ...num('Coliseum: Inf %', 50, 0, 100), key: 'col_inf' },
        { ...num('Coliseum: Cav %', 10, 0, 100), key: 'col_cav' },
        { ...num('Coliseum: Arch %', 40, 0, 100), key: 'col_arch' },
        { ...num('Forest of Life: Inf %', 50, 0, 100), key: 'fol_inf' },
        { ...num('Forest of Life: Cav %', 15, 0, 100), key: 'fol_cav' },
        { ...num('Forest of Life: Arch %', 35, 0, 100), key: 'fol_arch' },
        { ...num('Crystal Cave: Inf %', 60, 0, 100), key: 'cc_inf' },
        { ...num('Crystal Cave: Cav %', 20, 0, 100), key: 'cc_cav' },
        { ...num('Crystal Cave: Arch %', 20, 0, 100), key: 'cc_arch' },
        { ...num('Knowledge Nexus: Inf %', 50, 0, 100), key: 'kn_inf' },
        { ...num('Knowledge Nexus: Cav %', 20, 0, 100), key: 'kn_cav' },
        { ...num('Knowledge Nexus: Arch %', 30, 0, 100), key: 'kn_arch' },
        { ...num('Molten Fort: Inf %', 60, 0, 100), key: 'mf_inf' },
        { ...num('Molten Fort: Cav %', 15, 0, 100), key: 'mf_cav' },
        { ...num('Molten Fort: Arch %', 25, 0, 100), key: 'mf_arch' },
        { ...num('Radiant Spire: Inf %', 50, 0, 100), key: 'rs_inf' },
        { ...num('Radiant Spire: Cav %', 15, 0, 100), key: 'rs_cav' },
        { ...num('Radiant Spire: Arch %', 35, 0, 100), key: 'rs_arch' },
      ],
    },
    {
      id: 'tower_defence',
      title: 'Tower Defence',
      icon: '🛡️',
      fields: [
        { ...bool(true), key: 'td_enable', label: 'Enable Tower Defence Automation' },
        { ...bool(true), key: 'td_sweep', label: 'Enable Sweep' },
        { ...bool(true), key: 'td_claim', label: 'Auto Claim Rewards' },
        { ...bool(false), key: 'td_upgrade', label: 'Auto Upgrade Equipment' },
        { ...num('Sweep Level', 0), key: 'td_lvl' },
        { ...num('Sweep Times', 0), key: 'td_times' },
      ],
    },
  ],
};

const GATHERING_CATEGORY: CloudCategorySchema = {
  id: 'gathering',
  title: 'Gathering',
  icon: '⛏️',
  groups: [
    {
      id: 'gather_group',
      title: 'Gathering',
      icon: '⛏️',
      fields: [
        { ...bool(true), key: 'gather_enable', label: 'Enable Gather Resources' },
        { ...num('March Slots', 3, 1, 5), key: 'gather_slots' },
        { ...num('Tile Level Min', 8, 1, 8), key: 'gather_lvl' },
        {
          ...sel('Formation', 'Balanced', ['Default', 'InfantryFocus', 'CavalryFocus', 'ArcherFocus', 'Balanced']),
          key: 'gather_form',
        },
        { ...sel('Strategy', 'DeficitWeighted', ['DeficitWeighted', 'RoundRobin']), key: 'gather_strat' },
        { ...slider('Iron priority %', 100, 0, 100), key: 'gather_iron' },
        { ...bool(false), key: 'gather_tiles', label: 'Include alliance resource tiles' },
        { ...bool(false), key: 'gather_hero', label: 'Gather without enhancement hero' },
        { ...bool(false), key: 'gather_boost', label: 'Activate boost item before gather' },
      ],
    },
  ],
};

const PETS_CATEGORY: CloudCategorySchema = {
  id: 'pets',
  title: 'Pets',
  icon: '🐾',
  groups: [
    {
      id: 'pet_adventure',
      title: 'Pet Adventure',
      icon: '🐾',
      fields: [
        { ...bool(true), key: 'pet_dispatch', label: 'Auto Dispatch (4x/day)' },
        { ...bool(true), key: 'pet_explore', label: 'Auto Claim Explore Rewards' },
        { ...bool(true), key: 'pet_share', label: 'Share alliance rewards' },
        { ...bool(true), key: 'pet_alliance', label: 'Auto Claim Alliance Rewards' },
        { ...bool(false), key: 'pet_stamina', label: 'Use stamina items' },
      ],
    },
  ],
};

const EXPERT_CATEGORY: CloudCategorySchema = {
  id: 'expert',
  title: 'Expert',
  icon: '🧠',
  groups: [
    {
      id: 'exp_travel',
      title: 'Travel',
      icon: '🧭',
      fields: [
        {
          ...sel('Travel mode', 'Normal optimized (manual)', [
            'Off',
            'AFK (auto on-hook)',
            'Normal optimized (manual)',
          ]),
          key: 'exp_travel_mode',
        },
        { ...bool(true), key: 'exp_use_pan', label: 'Use expert skill for extra missions (Pan)' },
      ],
    },
    {
      id: 'exp_skills',
      title: 'Skill automation',
      icon: '✨',
      fields: [
        { ...bool(false), key: 'exp_learn', label: 'Learn skills' },
        { ...bool(true), key: 'exp_send', label: 'Send gifts' },
        { ...bool(false), key: 'exp_upg', label: 'Upgrade skills' },
        { ...bool(true), key: 'exp_buy', label: 'Buy energy daily packs (gems)' },
      ],
    },
  ],
};

const ISLAND_CATEGORY: CloudCategorySchema = {
  id: 'island',
  title: 'Island',
  icon: '🏝️',
  groups: [
    {
      id: 'garden_homeland',
      title: 'Garden / Homeland',
      icon: '🌿',
      fields: [
        { ...bool(true), key: 'island_garden_signin', label: 'Auto Claim Garden Sign-In' },
        { ...bool(true), key: 'island_homestead_quests', label: 'Auto Claim Homestead Quests' },
      ],
    },
    {
      id: 'homeland_group',
      title: 'Homeland',
      icon: '🏡',
      fields: [
        { ...bool(true), key: 'island_upgrade_life_tree', label: 'Auto-upgrade Life Tree' },
        { ...bool(true), key: 'island_upgrade_logging', label: 'Auto-upgrade Logging Camps' },
        { ...bool(false), key: 'island_place_decorations', label: 'Auto-place decorations (prosper)' },
        { ...bool(false), key: 'island_synthesize_decorations', label: 'Auto-synthesize decoration duplicates' },
        { ...bool(false), key: 'island_buy_decorations', label: 'Auto-buy decorations with coins' },
        { ...bool(false), key: 'island_move_logging', label: 'Auto-move Logging Camps closer to wood' },
        { ...bool(true), key: 'island_like_homelands', label: "Auto-like alliance members' homelands" },
      ],
    },
    {
      id: 'expedition_group',
      title: 'Expedition',
      icon: '🗺️',
      fields: [
        { ...bool(true), key: 'island_expedition_enable', label: 'Enable Expedition Automation' },
        { ...bool(true), key: 'island_expedition_dispatch', label: 'Auto Dispatch Teams' },
        { ...bool(true), key: 'island_expedition_chests', label: 'Auto Collect Chests' },
        { ...bool(true), key: 'island_expedition_milestone', label: 'Claim Milestone Rewards' },
        { ...bool(true), key: 'island_expedition_daily', label: 'Claim Daily Reward' },
      ],
    },
  ],
};

const CATEGORIES: CloudCategorySchema[] = [
  CONNECTION_CATEGORY,
  COLLECTION_CATEGORY,
  LAW_EDICTS_CATEGORY,
  VIP_BANK_CATEGORY,
  ALLIANCE_SYSTEMS_CATEGORY,
  COMBAT_TRAPS_CATEGORY,
  PROTECTION_CATEGORY,
  DEVELOPMENT_CATEGORY,
  TOWERS_ARENA_CATEGORY,
  GATHERING_CATEGORY,
  PETS_CATEGORY,
  ISLAND_CATEGORY,
  EXPERT_CATEGORY,
];

export const MASTER_SCHEMA = {
  id: 'root',
  title: 'Cloud Config',
  categories: CATEGORIES,
} satisfies CloudCategorySchema;

/** Neutral "off / empty" value for a field (used so fresh configs start disabled). */
export function emptyValue(f: CloudFieldSchema): boolean | number | string {
  switch (f.type) {
    case 'boolean':
      return false;
    case 'number':
    case 'slider':
      return 0;
    case 'string':
      return '';
    case 'select':
    case 'radio': {
      const opts = f.options ?? [];
      return opts.length > 0 ? opts[0]! : '';
    }
  }
}

/** Bumped whenever the schema shape changes so the panel refreshes its defaults. */
export const SCHEMA_VERSION = 16;

export const FLAT_SCHEMA = flattenedSchema(MASTER_SCHEMA);

/** Category ids that hold 100%-ratio groups (used to render a compact grid). */
export function categoryHasRatioGroups(id: string): boolean {
  return RATIO_GROUP_IDS.has(id);
}

export type CloudConfig = Record<string, Record<string, unknown>>;

function categoryDefault(c: CloudCategorySchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of c.fields ?? []) out[f.key] = emptyValue(f);
  for (const sub of [...(c.categories ?? []), ...(c.groups ?? [])]) {
    out[sub.id] = categoryDefault(sub);
  }
  return out;
}

/** Fresh config where every field starts disabled / empty. */
export const DEFAULT_CLOUD_CONFIG: CloudConfig = Object.fromEntries(
  (MASTER_SCHEMA.categories ?? []).map((c) => [c.id, categoryDefault(c)])
);

/** Full zod validator for a whole config payload (for `POST /api/cloud/config`). */
export const cloudConfigSchema = configSchema(MASTER_SCHEMA);
