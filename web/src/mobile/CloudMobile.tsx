import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAuth } from '../AuthContext';
import { api, type CloudCategorySchema, type CloudConfig, type CloudConfigDto, type CloudFieldSchema, type SaveCloudConfigResponse } from '../api';
import { Spinner } from '../components/ui';
import { HeroSelect, isHeroFieldKey } from '../components/HeroSelect';

type JsonObject = Record<string, unknown>;

/* ── Frontend IA (mirrors desktop) ──────────────────────────────────────── */
type Area = 'overview' | 'accounts' | 'automation' | 'events' | 'system';
const AREA_MAP: { area: Area; categories: string[] }[] = [
  { area: 'automation', categories: ['connection', 'collection', 'law_edicts', 'vip_bank', 'development', 'gathering', 'pets', 'island'] },
  { area: 'events', categories: ['alliance_systems', 'combat_traps', 'towers_arena', 'protection', 'event_milestones'] },
  { area: 'system', categories: ['expert'] },
];
function categoriesForArea(schema: CloudConfigDto['schema'], area: Area): CloudCategorySchema[] {
  const map = AREA_MAP.find((m) => m.area === area);
  if (!map) return [];
  return schema.categories.filter((c) => map.categories.includes(c.id));
}

const EVENT_GROUP_IMAGES: Record<string, string> = {
  'honor_ranking': '/events/stand-of-arms.webp',
  'strongest_governor': '/events/strongest-governor.webp',
  'alliance_brawl': '/events/alliance-brawl.webp',
  'champions_eve': '/events/flamedragon-tyrant.png',
  'event_goals': '/events/armament-competition.webp',
  'kingdom_of_power': '/events/kingdom-of-power.webp',
};

interface RatioGroupDef { name: string; categoryId: string; groupId: string; keys: string[]; enable?: string; }
const RATIO_GROUPS: RatioGroupDef[] = [
  { name: 'Championship', categoryId: 'alliance_systems', groupId: 'alliance_championship', keys: ['champ_inf', 'champ_cav', 'champ_rng'] },
  { name: 'Coliseum', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t1', keys: ['col_inf', 'col_cav', 'col_arch'] },
  { name: 'Forest of Life', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t2', keys: ['fol_inf', 'fol_cav', 'fol_arch'] },
  { name: 'Crystal Cave', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t3', keys: ['cc_inf', 'cc_cav', 'cc_arch'] },
  { name: 'Knowledge Nexus', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t4', keys: ['kn_inf', 'kn_cav', 'kn_arch'] },
  { name: 'Molten Fort', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t5', keys: ['mf_inf', 'mf_cav', 'mf_arch'] },
  { name: 'Radiant Spire', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t6', keys: ['rs_inf', 'rs_cav', 'rs_arch'] },
  { name: 'Alliance Defense', categoryId: 'combat_traps', groupId: 'alliance_defense', enable: 'alliance_defense_enable', keys: ['alliance_defense_inf', 'alliance_defense_cav', 'alliance_defense_arch'] },
  { name: 'Bear Trap (Joining)', categoryId: 'combat_traps', groupId: 'bear_group', enable: 'bear_enable', keys: ['bear_joining_inf', 'bear_joining_cav', 'bear_joining_arch'] },
  { name: 'Bear Trap (Master)', categoryId: 'combat_traps', groupId: 'bear_group', enable: 'bear_enable', keys: ['bear_master_inf', 'bear_master_cav', 'bear_master_arch'] },
  { name: 'Viking Vengeance', categoryId: 'combat_traps', groupId: 'viking_vengeance', enable: 'viking_enable', keys: ['viking_inf', 'viking_cav', 'viking_arch'] },
];
function ratioGroupFor(path: string[]): RatioGroupDef | null {
  if (path.length !== 3) return null;
  return RATIO_GROUPS.find((r) => r.categoryId === path[0] && r.groupId === path[1] && r.keys.includes(path[2])) ?? null;
}
function ratioGroupsIn(path: string[]): RatioGroupDef[] {
  if (path.length !== 2) return [];
  return RATIO_GROUPS.filter((r) => r.categoryId === path[0] && r.groupId === path[1]);
}

function getValue(root: unknown, path: string[]): unknown {
  let cur: unknown = root;
  for (const k of path) {
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) cur = (cur as JsonObject)[k];
    else return undefined;
  }
  return cur;
}
function setValue(root: CloudConfig, path: string[], value: unknown): CloudConfig {
  const clone = JSON.parse(JSON.stringify(root)) as JsonObject;
  let cur: JsonObject = clone;
  for (let i = 0; i < path.length - 1; i++) {
    const n = cur[path[i]];
    if (n && typeof n === 'object' && !Array.isArray(n)) cur = n as JsonObject;
    else cur = (cur[path[i]] = {}) as JsonObject;
  }
  cur[path[path.length - 1]] = value;
  return clone as unknown as CloudConfig;
}

function enabledCount(cfg: CloudConfig) {
  return (cat: CloudCategorySchema): boolean => walkEnabled(cfg, [cat.id], cat);
}
function walkEnabled(cfg: CloudConfig, path: string[], cat: CloudCategorySchema): boolean {
  for (const f of cat.fields ?? []) if (f.type === 'boolean' && getValue(cfg, [...path, f.key]) === true) return true;
  for (const g of cat.groups ?? []) if (walkEnabled(cfg, [...path, g.id], g)) return true;
  return false;
}

const AREAS: { id: Area; label: string }[] = [
  { id: 'overview', label: 'Home' },
  { id: 'automation', label: 'Automation' },
  { id: 'events', label: 'Events' },
  { id: 'system', label: 'More' },
];

export default function CloudMobile() {
  const { t } = useI18n();
  const { user } = useAuth();
  const isPreview =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/preview') ||
      (window.location.hostname.includes('vercel.app') && window.location.hostname.includes('su8l-devs-')));
  const [data, setData] = useState<CloudConfigDto | null>(null);
  const [cfg, setCfg] = useState<CloudConfig | null>(null);
  const [snapshot, setSnapshot] = useState('');
  const [area, setArea] = useState<Area>('overview');
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [activeSlotId, setActiveSlotId] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dirty = cfg !== null && JSON.stringify(cfg) !== snapshot;

  const loadConfig = async (slotId?: string) => {
    setError('');
    try {
      const q = slotId ? `?slotId=${encodeURIComponent(slotId)}` : '';
      const d = await api<CloudConfigDto>(`/api/dashboard/cloud-config${q}`);
      setData(d); setCfg(d.config); setSnapshot(JSON.stringify(d.config));
      setActiveSlotId(d.activeSlotId ?? slotId ?? ''); setEditing(false);
    } catch { setError('Failed to load'); }
  };
  useEffect(() => {
    if (isPreview) {
      loadConfig().catch(async () => {
        try {
          const pub = await api<{ schema: CloudConfigDto['schema']; version: number }>('/api/dashboard/public-schema');
          const mockSlots: CloudSlot[] = [
            { id: 'preview-1', name: 'Preview Account — Elite' },
            { id: 'preview-2', name: 'Preview Slot 2' },
          ];
          const mockCfg = {} as unknown as CloudConfig;
          pub.schema.categories.forEach((c: CloudCategorySchema) => {
            (mockCfg as unknown as Record<string, unknown>)[c.id] = {};
          });
          setData({
            config: mockCfg,
            schema: pub.schema,
            locked: false,
            slots: mockSlots,
            activeSlotId: mockSlots[0]!.id,
            discord: null,
          } as unknown as CloudConfigDto);
          setCfg(mockCfg);
          setSnapshot(JSON.stringify(mockCfg));
          setActiveSlotId(mockSlots[0]!.id);
        } catch {
          setError('');
        }
      });
      return;
    }
    loadConfig();
  }, [isPreview]);

  const update = (path: string[], value: unknown) => {
    if (!editing || !cfg) return;
    setCfg((prev) => {
      if (!prev) return prev;
      const rg = ratioGroupFor(path);
      if (rg && typeof value === 'number' && Number.isFinite(value)) {
        const othersSum = rg.keys.filter((k) => k !== path[2]).reduce((acc, k) => acc + (Number(getValue(prev, path.slice(0, 2).concat(k))) || 0), 0);
        value = Math.min(value, Math.max(0, 100 - othersSum));
      }
      return setValue(prev, path, value);
    });
  };
  const save = async () => {
    if (!cfg) return;
    if (isPreview) {
      setSnapshot(JSON.stringify(cfg));
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const res = await api<SaveCloudConfigResponse>('/api/dashboard/cloud-config', { method: 'PUT', body: { config: cfg, slotId: activeSlotId || undefined } });
      setSnapshot(JSON.stringify(res.config)); setCfg(res.config); setActiveSlotId(res.activeSlotId); setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); } finally { setSaving(false); }
  };
  const exitEdit = () => { setEditing(false); if (cfg && snapshot) try { setCfg(JSON.parse(snapshot) as CloudConfig); } catch { /* ignore */ } };

  if (error) return <div style={{ color: '#F05D68', padding: 16 }}>{error}</div>;
  if (!data || !cfg) return <div className="flex justify-center py-20"><Spinner size={28} /></div>;
  if (data.locked && !isPreview) {
    return (
      <div className="bs-root" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="m-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
          <span style={{ fontSize: 28 }}>🔒</span>
          <div style={{ marginTop: 10, fontWeight: 700, fontSize: 15 }}>{t('cloud.lockedPlan')}</div>
          <Link to="/pricing" className="bs-btn bs-btn-primary" style={{ width: '100%', marginTop: 14 }}>{t('dash.upgrade')}</Link>
        </div>
      </div>
    );
  }

  const activeSlot = data.slots.find((s) => s.id === activeSlotId) ?? data.slots[0];
  const activeCat = data.schema.categories.find((c) => c.id === activeCatId) ?? null;

  return (
    <div className="bs-root" style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: editing ? 92 : 0 }}>
      {/* Account context row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="bs-badge online"><span className="dot" />{t('botpanel.online')}</span>
        <span style={{ fontSize: 12, color: 'var(--bs-text-2)', fontWeight: 600, marginInlineStart: 'auto' }}>{activeSlot?.name}</span>
      </div>

      <MobileSlotBanner t={t} user={user} />

      {/* Area segmented nav (compact, no horizontal scroll of categories) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4, background: 'var(--bs-surface-1)', border: '1px solid var(--bs-border)', borderRadius: 12, padding: 4 }}>
        {AREAS.map((a) => (
          <button key={a.id} type="button" onClick={() => { setArea(a.id); setActiveCatId(null); }}
            style={{ padding: '9px 2px', borderRadius: 9, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: area === a.id ? 'var(--bs-surface-3)' : 'transparent', color: area === a.id ? 'var(--bs-gold-bright)' : 'var(--bs-text-3)', boxShadow: area === a.id ? 'inset 0 0 0 1px var(--bs-border)' : 'none' }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Edit / save state */}
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="bs-badge warn"><span className="dot" />{t('cloud.editing')}</span>
          {dirty && <span className="bs-unsaved"><span className="dot" />{t('cloud.unsaved')}</span>}
        </div>
      ) : (
        <button type="button" className="bs-btn bs-btn-purple" style={{ width: '100%' }} onClick={() => setEditing(true)}>⚙ {t('cloud.edit')}</button>
      )}

      {/* Content */}
      {area === 'overview' && (
        <MobileOverview cfg={cfg} schema={data.schema} onOpen={(id) => {
          setActiveCatId(id);
          for (const m of AREA_MAP) if (m.categories.includes(id)) { setArea(m.area); return; }
        }} />
      )}
      {(area === 'automation' || area === 'events' || area === 'system') && !activeCat && (
        <MobileLanding cfg={cfg} categories={categoriesForArea(data.schema, area)} onOpen={(id) => setActiveCatId(id)} />
      )}
      {(area === 'automation' || area === 'events' || area === 'system') && activeCat && (
        <div>
          <button type="button" onClick={() => setActiveCatId(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--bs-text-2)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 8 }}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 22 }}>{activeCat.icon ?? '⚙️'}</span>
            <div><div style={{ fontSize: 16, fontWeight: 800 }}>{activeCat.title}</div></div>
          </div>
          <div className="bs-panel" style={{ opacity: editing ? 1 : 0.75 }}>
            <MobileCategoryPanel category={activeCat} path={[activeCat.id]} cfg={cfg} disabled={!editing} onChange={update} />
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      {editing && (
        <div style={{ position: 'fixed', left: 16, right: 16, bottom: 'calc(76px + env(safe-area-inset-bottom))', zIndex: 40 }}>
          <div style={{ display: 'flex', gap: 8, padding: 10, background: 'var(--bs-surface-1)', border: '1px solid var(--bs-border-strong)', borderRadius: 14 }}>
            <button type="button" className="bs-btn bs-btn-ghost" style={{ flex: 1 }} onClick={exitEdit}>{t('cloud.cancel')}</button>
            <button type="button" className="bs-btn bs-btn-primary" style={{ flex: 2 }} onClick={save} disabled={saving || !dirty}>{saving ? t('cloud.saving') : `✓ ${t('cloud.save')}`}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileOverview({ cfg, schema, onOpen }: { cfg: CloudConfig; schema: CloudConfigDto['schema']; onOpen: (id: string) => void }) {
  const automation = categoriesForArea(schema, 'automation');
  const events = categoriesForArea(schema, 'events');
  const all = [...automation, ...events];
  const active = all.filter(enabledCount(cfg)).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
        <div className="bs-stat"><div className="bs-stat-num">{all.length}</div><div className="bs-stat-label">Features</div></div>
        <div className="bs-stat"><div className="bs-stat-num">{active}</div><div className="bs-stat-label">Active</div></div>
      </div>
      <div className="m-section-title" style={{ color: 'var(--bs-text-3)' }}>Quick access</div>
      {all.map((c) => (
        <div key={c.id} className="bs-feature-card" onClick={() => onOpen(c.id)} role="button">
          <div className="bs-feature-head">
            <span className="bs-feature-ic">{c.icon ?? '⚙️'}</span>
            <div className="min-w-0"><div className="bs-feature-title">{c.title}</div>
              <div className={`bs-state-badge ${enabledCount(cfg)(c) ? 'active' : 'paused'}`}>{enabledCount(cfg)(c) ? '● ACTIVE' : '○ PAUSED'}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MobileLanding({ cfg, categories, onOpen }: { cfg: CloudConfig; categories: CloudCategorySchema[]; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {categories.map((c) => (
        <div key={c.id} className="bs-feature-card" onClick={() => onOpen(c.id)} role="button">
          <div className="bs-feature-head">
            <span className="bs-feature-ic">{c.icon ?? '⚙️'}</span>
            <div className="min-w-0"><div className="bs-feature-title">{c.title}</div>
              <div className={`bs-state-badge ${enabledCount(cfg)(c) ? 'active' : 'paused'}`}>{enabledCount(cfg)(c) ? '● ACTIVE' : '○ PAUSED'}</div>
            </div>
            <span style={{ marginInlineStart: 'auto', color: 'var(--bs-text-3)' }}>›</span>
          </div>
        </div>
      ))}
      {categories.length === 0 && <div className="bs-empty">No features available.</div>}
    </div>
  );
}

function MobileSlotBanner({ t, user }: {
  t: (k: string) => string;
  user: { slots?: { active?: boolean; total?: number }; extraSlots?: number } | null;
}) {
  if (!user) return null;
  const active = user.slots?.active;
  const owned = (user.extraSlots ?? 0) > 0;
  const total = 1 + (user.extraSlots ?? 0);
  if (!active) return null;
  return (
    <div className="bs-slot-banner">
      <div className="bs-slot-banner-icon">🚀</div>
      <div className="bs-slot-banner-body">
        <div className="bs-slot-banner-title">{t('dash.extraSlotTitle')}</div>
        <div className="bs-slot-banner-sub">{t('cloud.slotTotal').replace('{n}', String(total))}</div>
        <div className="bs-slot-banner-desc">{t('dash.extraSlotDesc')} {owned && <span className="bs-slot-banner-owned">✓ {t('dash.extraSlotOwned')}</span>}</div>
      </div>
      <Link to="/checkout?extra=1" className="bs-btn bs-btn-primary bs-slot-banner-cta">$15 · {t('dash.extraSlotCta')}</Link>
    </div>
  );
}

function MobileCategoryPanel({ category, path, cfg, disabled, onChange }: {
  category: CloudCategorySchema; path: string[]; cfg: CloudConfig; disabled: boolean; onChange: (p: string[], v: unknown) => void;
}) {
  const localRatioGroups = ratioGroupsIn(path);
  const gridRatioKeys = new Set(localRatioGroups.flatMap((r) => r.keys));
  const gridEnableKeys = new Set(localRatioGroups.flatMap((r) => (r.enable ? [r.enable] : [])));
  const booleans = (category.fields ?? []).filter((f) => f.type === 'boolean' && !gridEnableKeys.has(f.key));
  const othersRaw = (category.fields ?? []).filter((f) => f.type !== 'boolean' && !gridRatioKeys.has(f.key));
  const isBearGroup = path[path.length - 1] === 'bear_group' || category.id === 'bear_group';
  const separateCapEnabled = isBearGroup ? Boolean(getValue(cfg, [...path, 'bear_separate_cap'])) : false;
  const bearMaxLeading = isBearGroup ? othersRaw.find((f) => f.key === 'bear_max_leading') ?? null : null;
  const others = isBearGroup ? othersRaw.filter((f) => f.key !== 'bear_max_leading') : othersRaw;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {booleans.map((f) => (
        <div key={f.key}>
          <div className="bs-row">
            <div><div className="bs-row-label">{f.label}</div>{f.description && <div className="bs-row-desc">{f.description}</div>}</div>
            <Toggle checked={Boolean(getValue(cfg, [...path, f.key]))} disabled={disabled} onChange={(v) => onChange([...path, f.key], v)} />
          </div>
          {isBearGroup && f.key === 'bear_separate_cap' && separateCapEnabled && bearMaxLeading && (
            <div style={{ padding: '8px 18px 10px 36px', borderLeft: '2px solid var(--bs-border)', marginLeft: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--bs-text)' }}>{bearMaxLeading.label}</label>
              {bearMaxLeading.description && <div style={{ fontSize: 11.5, color: 'var(--bs-text-3)', margin: '2px 0 6px' }}>{bearMaxLeading.description}</div>}
              <FieldControl field={bearMaxLeading} value={getValue(cfg, [...path, bearMaxLeading.key])} disabled={disabled} onChange={(v) => onChange([...path, bearMaxLeading.key], v)} />
            </div>
          )}
        </div>
      ))}

      {others.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 18px' }}>
          {others.map((f) => (
            <div key={f.key}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--bs-text)' }}>{f.label}</label>
              {f.description && <div style={{ fontSize: 11.5, color: 'var(--bs-text-3)', margin: '2px 0 6px' }}>{f.description}</div>}
              <FieldControl field={f} value={getValue(cfg, [...path, f.key])} disabled={disabled} onChange={(v) => onChange([...path, f.key], v)} />
            </div>
          ))}
        </div>
      )}

      {localRatioGroups.length > 0 && (
        <div style={{ padding: '6px 18px 14px' }}>
          <MobileRatio groups={localRatioGroups} path={path} cfg={cfg} disabled={disabled} onChange={onChange} />
        </div>
      )}

      {category.groups?.map((g) => (
        <GroupCard key={g.id} group={g} path={[...path, g.id]} cfg={cfg} disabled={disabled} onChange={onChange} />
      ))}
    </div>
  );
}

function GroupCard({ group, path, cfg, disabled, onChange }: {
  group: CloudCategorySchema; path: string[]; cfg: CloudConfig; disabled: boolean; onChange: (p: string[], v: unknown) => void;
}) {
  const [open, setOpen] = useState((group.fields?.length ?? 0) <= 6);
  const enabled = (() => {
    for (const f of group.fields ?? []) if (f.type === 'boolean' && getValue(cfg, [...path, f.key]) === true) return true;
    return false;
  })();
  const eventImg = EVENT_GROUP_IMAGES[group.id];
  return (
    <div className="bs-group" style={{ marginTop: 0, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderBottom: 'none', background: 'transparent' }}>
      <div className="bs-group-head" onClick={() => setOpen((o) => !o)}>
        {eventImg ? <img src={eventImg} alt={group.title} style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--bs-border)', flexShrink: 0 }} onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} /> : group.icon ? <span>{group.icon}</span> : null}
        <span className="bs-group-title">{group.title}</span>
        <span className="bs-group-state">{enabled ? <span className="bs-state-badge active">● ON</span> : <span className="bs-state-badge off">○ OFF</span>}</span>
        <span style={{ marginInlineStart: 'auto', color: 'var(--bs-text-3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }}>›</span>
      </div>
      {open && <MobileCategoryPanel category={group} path={path} cfg={cfg} disabled={disabled} onChange={onChange} />}
    </div>
  );
}

/* Mobile ratio — stacked rows, no horizontal scroll */
function MobileRatio({ groups, path, cfg, disabled, onChange }: {
  groups: RatioGroupDef[]; path: string[]; cfg: CloudConfig; disabled: boolean; onChange: (p: string[], v: unknown) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groups.map((rg) => {
        const vals = rg.keys.map((k) => Number(getValue(cfg, [...path, k])) || 0);
        const sum = vals.reduce((a, b) => a + b, 0);
        const ok = sum === 100;
        const enabled = rg.enable ? Boolean(getValue(cfg, [...path, rg.enable])) : true;
        const labels = [rg.keys[2]?.endsWith('_rng') ? 'Ranged' : 'Archer', 'Cavalry', 'Infantry'];
        return (
          <div key={rg.name} style={{ border: '1px solid var(--bs-border)', borderRadius: 12, padding: 12, background: 'var(--bs-surface-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: enabled ? 'var(--bs-text)' : 'var(--bs-text-3)' }}>{rg.name}</span>
              <span style={{ marginInlineStart: 'auto', fontSize: 12, fontWeight: 800, color: ok ? 'var(--bs-success)' : 'var(--bs-warning)' }}>{ok ? '100% ✓' : `${sum}%`}</span>
              {rg.enable && <Toggle checked={enabled} disabled={disabled} onChange={(v) => onChange([...path, rg.enable!], v)} />}
            </div>
            {rg.keys.map((k, i) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 90, fontSize: 12.5, fontWeight: 600, color: 'var(--bs-text-2)' }}>{rg.keys.length === 3 ? labels[i] : k}</span>
                <RatioInput value={vals[i]} disabled={disabled} onChange={(v) => onChange([...path, k], v)} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function RatioInput({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (v: number) => void }) {
  return <input type="number" className="bs-ratio" style={{ width: '100%' }} min={0} max={100} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />;
}

function FieldControl({ field, value, disabled, onChange }: { field: CloudFieldSchema; value: unknown; disabled: boolean; onChange: (v: unknown) => void }) {
  switch (field.type) {
    case 'number':
      return (
        <div className="bs-numwrap">
          <input className="bs-input" style={{ flex: 1 }} type="number" min={field.min} max={field.max} step={field.step ?? 1} value={String(value ?? 0)} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
          {field.unit && <span className="bs-unit">{field.unit}</span>}
        </div>
      );
    case 'slider':
      return (
        <div className="bs-slider-row">
          <input type="range" className="bs-range" min={field.min ?? 0} max={field.max ?? 100} step={field.step ?? 1} value={Number(value ?? 0)} disabled={disabled} style={{ flex: 1 }} onChange={(e) => onChange(Number(e.target.value))} />
          <input className="bs-input" style={{ width: 64, textAlign: 'center' }} type="number" min={field.min} max={field.max} value={String(value ?? 0)} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
        </div>
      );
    case 'string': return <input className="bs-input" value={String(value ?? '')} maxLength={field.maxLength} placeholder={field.placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
    case 'select': {
      if (isHeroFieldKey(field.key)) return <HeroSelect fieldKey={field.key} value={String(value ?? '')} disabled={disabled} onChange={(v) => onChange(v)} />;
      return <select className="bs-select" value={String(value ?? '')} disabled={disabled} onChange={(e) => onChange(e.target.value)}>{(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}</select>;
    }
    case 'radio': return <div className="bs-radio-group">{(field.options ?? []).map((o) => <button key={o} type="button" aria-pressed={value === o} className="bs-radio" disabled={disabled} onClick={() => onChange(o)}>{o}</button>)}</div>;
    default: return null;
  }
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} disabled={disabled} className="bs-toggle" onClick={() => onChange(!checked)}><span className="knob" /></button>;
}