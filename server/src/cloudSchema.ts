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
 */

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

export const MASTER_SCHEMA: CloudSchema = {
  version: 3,
  categories: [
    {
      id: 'law_edicts',
      title: 'Law (Edicts)',
      icon: '📜',
      description: 'Auto-enact laws and manage edict timing.',
      groups: [
        {
          id: 'laws',
          title: 'Auto Enact Laws',
          fields: [
            { key: 'auto_enact_laws', label: 'Enable Auto Enact', type: 'boolean', default: true },
            { key: 'urgent_mobilization', label: 'Urgent Mobilization', type: 'select', default: 'Immediate', options: ['Immediate', 'OnBuildingStart', 'OnResearchStart', 'OnBuildingOrResearch', 'WhenProductivityActive'] },
            { key: 'rush_job', label: 'Rush Job', type: 'select', default: 'Immediate', options: ['Immediate', 'OnBuildingStart', 'OnResearchStart', 'OnBuildingOrResearch', 'WhenProductivityActive'] },
            { key: 'comprehensive_care', label: 'Comprehensive Care', type: 'select', default: 'Immediate', options: ['Immediate', 'OnBuildingStart', 'OnResearchStart', 'OnBuildingOrResearch', 'WhenProductivityActive'] },
            { key: 'productivity_day', label: 'Productivity Day', type: 'select', default: 'Immediate', options: ['Immediate', 'OnBuildingStart', 'OnResearchStart', 'OnBuildingOrResearch', 'WhenProductivityActive'] },
            { key: 'double_time', label: 'Double Time', type: 'select', default: 'Immediate', options: ['Immediate', 'OnBuildingStart', 'OnResearchStart', 'OnBuildingOrResearch', 'WhenProductivityActive'] },
            { key: 'festivities', label: 'Festivities', type: 'select', default: 'Immediate', options: ['Immediate', 'OnBuildingStart', 'OnResearchStart', 'OnBuildingOrResearch', 'WhenProductivityActive'] },
          ],
        },
      ],
    },
    {
      id: 'vip_bank',
      title: 'VIP & Bank',
      icon: '👑',
      description: 'VIP progression and bank thresholds.',
      groups: [
        {
          id: 'vip_config',
          title: 'VIP Configuration',
          fields: [
            { key: 'auto_use_vip_time', label: 'Auto-use VIP time items', type: 'boolean', default: true },
            { key: 'auto_buy_vip_30d', label: 'Auto-buy VIP 30d', type: 'boolean', default: false },
            { key: 'min_gems_balance', label: 'Min gems balance', type: 'number', default: 12000 },
            { key: 'renew_days_left', label: 'Renew when <= N days left', type: 'number', default: 3 },
            { key: 'auto_use_vip_xp', label: 'Auto-use VIP XP items', type: 'boolean', default: true },
            { key: 'max_vip_target', label: 'Max VIP level target', type: 'number', default: 12, min: 1, max: 12 },
            { key: 'buy_xp_diamonds', label: 'Buy XP with Diamonds (0=off)', type: 'number', default: 0 },
          ],
        },
        {
          id: 'bank_config',
          title: 'Bank Configuration',
          fields: [
            { key: 'auto_withdraw_bank', label: 'Auto-withdraw deposit', type: 'boolean', default: true },
            { key: 'auto_deposit_gems', label: 'Auto-deposit gems', type: 'boolean', default: true },
            { key: 'bank_locker', label: 'Locker', type: 'select', default: 'Auto (first available)', options: ['Auto (first available)', 'Locker 1', 'Locker 2', 'Locker 3', 'Locker 4'] },
            { key: 'bank_use_max_gems', label: 'Use maximum gems', type: 'boolean', default: true },
            { key: 'bank_amount', label: 'Amount (Max 6,500)', type: 'number', default: 0 },
          ],
        },
      ],
    },
    {
      id: 'alliance_systems',
      title: 'Alliance Systems',
      icon: '🤝',
      description: 'Help, shop, rally and championship.',
      groups: [
        {
          id: 'alliance_basics',
          title: 'Alliance & Development',
          fields: [
            { key: 'alliance_auto_help', label: 'Auto Help', type: 'boolean', default: true },
            { key: 'collect_alliance_chest', label: 'Collect Alliance Chest', type: 'boolean', default: true },
            { key: 'alliance_auto_donate', label: 'Auto Donate', type: 'boolean', default: true },
            { key: 'alliance_donate_use_bag', label: 'Use bag resources for donation', type: 'boolean', default: false },
            { key: 'claim_alliance_dev_daily', label: 'Claim Dev Daily', type: 'boolean', default: true },
            { key: 'claim_alliance_dev_weekly', label: 'Claim Dev Weekly', type: 'boolean', default: true },
          ],
        },
        {
          id: 'alliance_shop',
          title: 'Alliance Shop',
          fields: [
            { key: 'shop_enable_auto_buy', label: 'Enable Auto-Buy', type: 'boolean', default: true },
            { key: 'shop_daily_min_discount', label: 'Daily: Min discount %', type: 'number', default: 0 },
            { key: 'shop_daily_max_spend', label: 'Daily: Max spend', type: 'number', default: 0 },
            { key: 'shop_weekly_min_discount', label: 'Weekly: Min discount %', type: 'number', default: 0 },
            { key: 'shop_weekly_max_spend', label: 'Weekly: Max spend', type: 'number', default: 0 },
          ],
        },
        {
          id: 'alliance_auto_join',
          title: 'Alliance Auto-Join',
          fields: [
            { key: 'autojoin_enable', label: 'Enable Auto-Join Rally', type: 'boolean', default: true },
            { key: 'autojoin_join_faster', label: 'Join Faster', type: 'boolean', default: true },
            { key: 'autojoin_skip_unreachable', label: 'Skip unreachable rallies', type: 'boolean', default: true },
            { key: 'autojoin_troops', label: 'Troops', type: 'radio', default: 'Full Formation', options: ['1 Soldier', 'Full Formation'] },
            { key: 'autojoin_reactivate', label: 'Reactivate before expiry (s)', type: 'number', default: 600 },
          ],
        },
        {
          id: 'alliance_championship',
          title: 'Alliance Championship',
          fields: [
            { key: 'champ_auto_enroll', label: 'Auto-enroll', type: 'boolean', default: true },
            { key: 'champ_lane', label: 'Lane', type: 'select', default: 'Center', options: ['Left', 'Center', 'Right'] },
            { key: 'champ_infantry', label: 'Infantry %', type: 'number', default: 50, slider: true },
            { key: 'champ_cavalry', label: 'Cavalry %', type: 'number', default: 20, slider: true },
            { key: 'champ_ranged', label: 'Ranged %', type: 'number', default: 30, slider: true },
          ],
        },
      ],
    },
    {
      id: 'combat_events',
      title: 'Combat & Traps',
      icon: '⚔️',
      description: 'Bear trap, beast hunting and terror rallies.',
      groups: [
        {
          id: 'bear_trap',
          title: 'Bear Trap',
          fields: [
            { key: 'bear_enable_autojoin', label: 'Enable Bear Trap Auto-Join', type: 'boolean', default: true },
            { key: 'bear_join_trap_1', label: 'Join Trap 1', type: 'boolean', default: true },
            { key: 'bear_join_open_rallies', label: 'Join all open rallies', type: 'boolean', default: true },
            { key: 'bear_auto_launch_own', label: 'Auto-launch own rally', type: 'boolean', default: true },
            { key: 'bear_max_marches', label: 'Max marches per trap', type: 'number', default: 150000 },
            { key: 'bear_fill_capacity', label: 'Fill march to capacity', type: 'boolean', default: true },
            { key: 'bear_max_troops', label: 'Max troops per march', type: 'number', default: 150000 },
            { key: 'bear_auto_donate_arrows', label: 'Auto-donate Hunting Arrows', type: 'boolean', default: true },
          ],
        },
        {
          id: 'beast',
          title: 'Beast',
          fields: [
            { key: 'beast_enable', label: 'Enable Beast Auto-Attack', type: 'boolean', default: false },
            { key: 'beast_lvl_min', label: 'Level range (min)', type: 'number', default: 30 },
            { key: 'beast_lvl_max', label: 'Level range (max)', type: 'number', default: 30 },
            { key: 'beast_retry', label: 'Retry interval (s)', type: 'number', default: 60 },
            { key: 'beast_best_heroes', label: 'Always use best heroes', type: 'boolean', default: true },
            { key: 'beast_prefer_diana', label: 'Prefer Diana', type: 'boolean', default: true },
            { key: 'beast_prefer_fahd', label: 'Prefer Fahd', type: 'boolean', default: true },
            { key: 'beast_use_stamina_packs', label: 'Auto-use stamina packs', type: 'boolean', default: true },
          ],
        },
        {
          id: 'terror_rally',
          title: 'Terror (Rally)',
          fields: [
            { key: 'terror_enable', label: 'Enable Terror Rally Auto-Launch', type: 'boolean', default: true },
            { key: 'terror_lvl_min', label: 'Level min', type: 'number', default: 8, min: 1, max: 50 },
            { key: 'terror_lvl_max', label: 'Level max', type: 'number', default: 8, min: 1, max: 50 },
            { key: 'terror_max_rallies', label: 'Max rallies per day', type: 'number', default: 10 },
            { key: 'terror_prepare_time', label: 'Prepare time', type: 'select', default: '5 min (300s)', options: ['5 min (300s)', '15 min (900s)', '30 min (1800s)', '1 h (3600s)'] },
          ],
        },
      ],
    },
    {
      id: 'development',
      title: 'Development',
      icon: '🏗️',
      description: 'Training queues and hospital healing.',
      groups: [
        {
          id: 'training',
          title: 'Training',
          fields: [
            { key: 'train_enable', label: 'Enable Training', type: 'boolean', default: true },
            { key: 'train_mode', label: 'Mode', type: 'radio', default: 'Train new', options: ['Train new', 'Promote', 'Promote, then Train'] },
            { key: 'train_tier', label: 'Preferred Tier', type: 'number', default: 9, min: 1, max: 11 },
            { key: 'train_speedup', label: 'Speed-up', type: 'select', default: 'Disabled', options: ['Disabled', 'TypeOnly', 'TypeAndGeneral'] },
          ],
        },
        {
          id: 'hospital',
          title: 'Hospital',
          fields: [
            { key: 'hosp_auto_heal', label: 'Auto Heal Wounded Troops', type: 'boolean', default: true },
            { key: 'hosp_batch_size', label: 'Heal Batch Size', type: 'number', default: 100 },
            { key: 'hosp_speedup', label: 'Speed-up', type: 'select', default: 'Disabled', options: ['Disabled', 'TypeOnly', 'TypeAndGeneral'] },
            { key: 'hosp_wait_help', label: 'Help wait timeout (s)', type: 'number', default: 30 },
          ],
        },
      ],
    },
    {
      id: 'gathering_island',
      title: 'Gathering & Island',
      icon: '🌾',
      description: 'Resource gathering and homeland upgrades.',
      groups: [
        {
          id: 'gathering',
          title: 'Gathering',
          fields: [
            { key: 'gather_enable', label: 'Enable Gather Resources', type: 'boolean', default: true },
            { key: 'gather_march_slots', label: 'March Slots', type: 'number', default: 3, min: 1, max: 5 },
            { key: 'gather_tile_min', label: 'Tile Level Min', type: 'number', default: 8, min: 1, max: 8 },
            { key: 'gather_formation', label: 'Formation', type: 'select', default: 'Balanced', options: ['Default', 'InfantryFocus', 'CavalryFocus', 'ArcherFocus', 'Balanced'] },
            { key: 'gather_strategy', label: 'Strategy', type: 'select', default: 'DeficitWeighted', options: ['DeficitWeighted', 'RoundRobin'] },
            { key: 'gather_iron_priority', label: 'Iron priority %', type: 'number', default: 100, slider: true },
            { key: 'gather_boost', label: 'Activate boost item before gather', type: 'boolean', default: false },
          ],
        },
        {
          id: 'island',
          title: 'Homeland (Island)',
          fields: [
            { key: 'island_life_tree', label: 'Auto-upgrade Life Tree', type: 'boolean', default: true },
            { key: 'island_logging_camps', label: 'Auto-upgrade Logging Camps', type: 'boolean', default: true },
            { key: 'island_auto_like', label: 'Auto-like alliance homelands', type: 'boolean', default: true },
          ],
        },
      ],
    },
    {
      id: 'daily_collection',
      title: 'Collection & Pets',
      icon: '🎁',
      description: 'Reward collection and pet adventures.',
      groups: [
        {
          id: 'collection',
          title: 'Collection',
          fields: [
            { key: 'col_mails', label: 'Collect Mails', type: 'boolean', default: true },
            { key: 'col_quests', label: 'Collect Quests', type: 'boolean', default: true },
            { key: 'col_rewards', label: 'Collect Rewards (Sign-in/Daily)', type: 'boolean', default: true },
            { key: 'col_achievements', label: 'Collect Achievements', type: 'boolean', default: true },
            { key: 'col_gifts', label: 'Collect Gifts', type: 'boolean', default: true },
            { key: 'col_alliance_red_packets', label: 'Auto-claim Red Packets', type: 'boolean', default: true },
          ],
        },
        {
          id: 'pet_adventure',
          title: 'Pet Adventure',
          fields: [
            { key: 'pet_dispatch', label: 'Auto Dispatch (4x/day)', type: 'boolean', default: true },
            { key: 'pet_claim_explore', label: 'Auto Claim Explore Rewards', type: 'boolean', default: true },
            { key: 'pet_claim_alliance', label: 'Auto Claim Alliance Rewards', type: 'boolean', default: true },
          ],
        },
      ],
    },
  ],
};

const fieldSchema = (f: CloudFieldSchema): z.ZodTypeAny => {
  switch (f.type) {
    case 'boolean':
      return z.boolean();
    case 'number':
      return z
        .number()
        .int()
        .min(f.min ?? Number.MIN_SAFE_INTEGER)
        .max(f.max ?? Number.MAX_SAFE_INTEGER);
    case 'string': {
      let s = z.string().trim().max(f.maxLength ?? 200);
      if (f.required) s = s.min(1, 'required');
      return s;
    }
    case 'select':
    case 'radio': {
      const opts = f.options ?? [];
      return opts.length > 0 ? z.enum(opts as [string, ...string[]]) : z.string();
    }
  }
};

const categorySchema = (c: CloudCategorySchema): z.ZodTypeAny => {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of c.fields ?? []) shape[f.key] = fieldSchema(f);
  for (const g of c.groups ?? []) shape[g.id] = categorySchema(g);
  return z.object(shape);
};

export const cloudConfigSchema = z.object(
  Object.fromEntries(MASTER_SCHEMA.categories.map((c) => [c.id, categorySchema(c)]))
);

export type CloudConfig = z.infer<typeof cloudConfigSchema>;

export const categoryDefault = (c: CloudCategorySchema): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const f of c.fields ?? []) out[f.key] = f.default;
  for (const g of c.groups ?? []) out[g.id] = categoryDefault(g);
  return out;
};

export const DEFAULT_CLOUD_CONFIG: CloudConfig = Object.fromEntries(
  MASTER_SCHEMA.categories.map((c) => [c.id, categoryDefault(c)])
) as CloudConfig;
