import {
  MASTER_SCHEMA,
  DEFAULT_CLOUD_CONFIG,
  cloudConfigSchema,
  type CloudCategorySchema,
  type CloudConfig,
  type CloudFieldSchema,
} from './cloudSchema.js';

/**
 * Cloud Configurator — behaviour layer over the MASTER_SCHEMA.
 *
 * The schema (cloudSchema.ts) is the canonical source of truth: the web panel
 * renders it, the zod schema below is *derived* from it, the Discord dispatch
 * DM is *compiled* by walking it, and stored configs are normalized against it.
 * There is no per-field logic left in this file.
 */

export { MASTER_SCHEMA, DEFAULT_CLOUD_CONFIG, cloudConfigSchema };
export type { CloudConfig, CloudCategorySchema, CloudFieldSchema };

/** Cross-field rules the per-field zod schema cannot express. */
export function cloudConfigIssues(cfg: CloudConfig): string[] {
  const issues: string[] = [];
  const checkPair = (a: string, b: string, minVal: number, maxVal: number, label: string) => {
    if (minVal > maxVal) issues.push(`${a} must not exceed ${b} (${label})`);
  };
  const walk = (c: CloudCategorySchema, values: Record<string, unknown>) => {
    for (const f of c.fields ?? []) {
      if (f.type !== 'number') continue;
      const m = /^(.*)_min$/.exec(f.key);
      if (!m) continue;
      const maxField = (c.fields ?? []).find((x) => x.key === `${m[1]}_max` && x.type === 'number');
      if (!maxField) continue;
      const minVal = values[f.key];
      const maxVal = values[maxField.key];
      if (typeof minVal === 'number' && typeof maxVal === 'number') {
        checkPair(f.key, maxField.key, minVal, maxVal, `${m[1]}`);
      }
    }
    for (const g of c.groups ?? []) walk(g, (values[g.id] ?? {}) as Record<string, unknown>);
  };
  for (const c of MASTER_SCHEMA.categories) {
    walk(c, (cfg as unknown as Record<string, unknown>)[c.id] as Record<string, unknown>);
  }
  return issues;
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function asNum(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function asStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

function mergeField(f: CloudFieldSchema, value: unknown): unknown {
  switch (f.type) {
    case 'boolean':
      return asBool(value, f.default as boolean);
    case 'number':
      return asNum(value, f.default as number);
    case 'string':
      return asStr(value, f.default as string);
    case 'select':
    case 'radio': {
      const opts = f.options ?? [];
      return typeof value === 'string' && opts.includes(value) ? value : f.default;
    }
  }
}

function mergeCategory(c: CloudCategorySchema, src: Record<string, unknown> | undefined): Record<string, unknown> {
  const s = src ?? {};
  const out: Record<string, unknown> = {};
  for (const f of c.fields ?? []) out[f.key] = mergeField(f, s[f.key]);
  for (const g of c.groups ?? []) out[g.id] = mergeCategory(g, s[g.id] as Record<string, unknown> | undefined);
  return out;
}

/**
 * Normalizes whatever is stored in `user_settings.bot_config` against the
 * MASTER_SCHEMA: unknown keys are dropped, missing keys fall back to defaults,
 * and values are coerced to their declared type.
 */
export function normalizeCloudConfig(stored: unknown): CloudConfig {
  const src =
    (typeof stored === 'object' && stored !== null ? stored : {}) as Record<string, unknown>;
  const candidate = Object.fromEntries(
    MASTER_SCHEMA.categories.map((c) => [c.id, mergeCategory(c, src[c.id] as Record<string, unknown> | undefined)])
  );
  const parsed = cloudConfigSchema.safeParse(candidate);
  return parsed.success ? parsed.data : DEFAULT_CLOUD_CONFIG;
}

const yesNo = (b: boolean) => (b ? 'Yes' : 'No');

function formatValue(f: CloudFieldSchema, value: unknown): string {
  switch (f.type) {
    case 'boolean':
      return yesNo(Boolean(value));
    case 'number':
      return `${value}${f.unit ? ` ${f.unit}` : ''}`;
    case 'string':
      return String(value || '—');
    case 'select':
    case 'radio':
      return String(value);
  }
}

function compileCategory(
  c: CloudCategorySchema,
  values: Record<string, unknown>,
  lines: string[],
  depth = 0
): void {
  const pad = '  '.repeat(depth);
  lines.push(`${pad}\`▸ ${c.title.toUpperCase()}\``);
  for (const f of c.fields ?? []) {
    lines.push(`${pad}• ${f.label}: **${formatValue(f, values[f.key])}**`);
  }
  for (const g of c.groups ?? []) {
    lines.push('');
    compileCategory(g, (values[g.id] ?? {}) as Record<string, unknown>, lines, depth + 1);
  }
}

/**
 * Compiles the full config into a clean, readable summary dispatched to the
 * owner's Discord DM. Walks the MASTER_SCHEMA, so new fields show up here
 * automatically. Always leads with the buyer's Discord name + ID.
 */
export function compileCloudConfig(
  cfg: CloudConfig,
  identity: { discordUsername: string; discordId: string }
): string {
  const lines = [
    '`🔧 SU8L Cloud Configurator — New Settings Received`',
    '',
    `**Discord Name:** ${identity.discordUsername}`,
    `**Discord ID:** ${identity.discordId}`,
    '',
  ];
  for (const c of MASTER_SCHEMA.categories) {
    compileCategory(c, (cfg as unknown as Record<string, unknown>)[c.id] as Record<string, unknown>, lines);
    lines.push('');
  }
  lines.push('`⏱ Modifications apply at the next daily in-game reset.`');
  return lines.join('\n');
}
