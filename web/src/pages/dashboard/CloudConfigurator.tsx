import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAuth } from '../../AuthContext';
import {
  api,
  renameAccount,
  type CloudCategorySchema,
  type CloudConfig,
  type CloudConfigDto,
  type CloudFieldSchema,
  type CloudSlot,
  type SaveCloudConfigResponse,
} from '../../api';
import { Spinner } from '../../components/ui';

type JsonObject = Record<string, unknown>;

/* ─────────────────────────────────────────────────────────────────────────
   FRONTEND INFORMATION ARCHITECTURE
   We group the server-driven flat categories into 5 primary AREAS purely for
   presentation. No config keys, schema or payload change.
   ───────────────────────────────────────────────────────────────────────── */

type Area = 'overview' | 'accounts' | 'automation' | 'events' | 'system';

const AREA_MAP: { area: Area; categories: string[] }[] = [
  { area: 'automation', categories: ['connection', 'collection', 'law_edicts', 'vip_bank', 'development', 'gathering', 'pets', 'island'] },
  { area: 'events', categories: ['alliance_systems', 'combat_traps', 'towers_arena', 'protection'] },
  { area: 'system', categories: ['expert'] },
];

function categoriesForArea(schema: CloudConfigDto['schema'], area: Area): CloudCategorySchema[] {
  if (area === 'overview' || area === 'accounts') return [];
  const map = AREA_MAP.find((m) => m.area === area);
  if (!map) return [];
  return schema.categories.filter((c) => map.categories.includes(c.id));
}

/* ─────────────────────────────────────────────────────────────────────────
   Ratios (100%-constrained Inf/Cav/Arch triplets)
   ───────────────────────────────────────────────────────────────────────── */

interface RatioGroupDef {
  name: string;
  categoryId: string;
  groupId: string;
  keys: string[];
  enable?: string;
}

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

/* ── helpers ────────────────────────────────────────────────────────────── */
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
    const next = cur[path[i]];
    if (next && typeof next === 'object' && !Array.isArray(next)) cur = next as JsonObject;
    else cur = (cur[path[i]] = {}) as JsonObject;
  }
  cur[path[path.length - 1]] = value;
  return clone as unknown as CloudConfig;
}

/* Tiny inline SVG icons (single consistent set) */
const I = {
  overview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  accounts: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>,
  automation: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>,
  events: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4M16 2v4M3 9h18"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M12 13l2 3h-4z"/></svg>,
  system: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="6" height="6" rx="1.5"/><rect x="15" y="4" width="6" height="6" rx="1.5"/><rect x="3" y="14" width="6" height="6" rx="1.5"/><rect x="15" y="14" width="6" height="6" rx="1.5"/></svg>,
  configure: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  chevron: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18"/></svg>,
  down: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
};

export default function CloudConfigurator() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [data, setData] = useState<CloudConfigDto | null>(null);
  const [cfg, setCfg] = useState<CloudConfig | null>(null);
  const [snapshot, setSnapshot] = useState('');
  const [area, setArea] = useState<Area>('overview');
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const dirty = cfg !== null && JSON.stringify(cfg) !== snapshot;

  const ratioIssues = (() => {
    if (!cfg) return [] as { name: string; sum: number }[];
    const bad: { name: string; sum: number }[] = [];
    for (const rg of RATIO_GROUPS) {
      const sum = rg.keys.reduce((acc, k) => acc + (Number(getValue(cfg, [rg.categoryId, rg.groupId, k])) || 0), 0);
      if (sum !== 100) bad.push({ name: rg.name, sum });
    }
    return bad;
  })();
  const ratioValid = ratioIssues.length === 0;

  const loadConfig = async (slotId?: string) => {
    setError('');
    try {
      const q = slotId ? `?slotId=${encodeURIComponent(slotId)}` : '';
      const d = await api<CloudConfigDto>(`/api/dashboard/cloud-config${q}`);
      setData(d);
      setCfg(d.config);
      setSnapshot(JSON.stringify(d.config));
      setActiveSlotId(d.activeSlotId ?? slotId ?? '');
      setEditing(false);
    } catch {
      setError('Failed to load Cloud Configurator');
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const update = (path: string[], value: unknown) => {
    if (!editing || !cfg) return;
    setCfg((prev) => {
      if (!prev) return prev;
      const rg = ratioGroupFor(path);
      if (rg && typeof value === 'number' && Number.isFinite(value)) {
        const othersSum = rg.keys
          .filter((k) => k !== path[2])
          .reduce((acc, k) => acc + (Number(getValue(prev, path.slice(0, 2).concat(k))) || 0), 0);
        const allowed = Math.max(0, 100 - othersSum);
        value = Math.min(value, allowed);
      }
      return setValue(prev, path, value);
    });
  };

  const exitEdit = () => {
    setEditing(false);
    if (cfg && snapshot) {
      try { setCfg(JSON.parse(snapshot) as CloudConfig); } catch { /* ignore */ }
    }
  };

  const save = async () => {
    if (!cfg) return;
    if (!ratioValid) {
      const names = ratioIssues.map((r) => `${r.name} (${r.sum}%)`).join(', ');
      if (!window.confirm(t('cloud.ratioSaveWarning').replace('{groups}', names))) return;
    }
    setSaving(true);
    try {
      const res = await api<SaveCloudConfigResponse>('/api/dashboard/cloud-config', {
        method: 'PUT',
        body: { config: cfg, slotId: activeSlotId || undefined },
      });
      setSnapshot(JSON.stringify(res.config));
      setCfg(res.config);
      setActiveSlotId(res.activeSlotId);
      setEditing(false);
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const switchAccount = (id: string) => {
    if (id === activeSlotId) return;
    loadConfig(id);
  };

  const handleRename = async (id: string, newName: string) => {
    await renameAccount(id, newName);
    setData((prev) =>
      prev ? { ...prev, slots: prev.slots.map((s) => (s.id === id ? { ...s, name: newName } : s)) } : prev
    );
  };

  const openCategory = (id: string) => {
    setActiveCatId(id);
    for (const m of AREA_MAP) {
      if (m.categories.includes(id)) { setArea(m.area); return; }
    }
  };
  const activeCategory = data ? data.schema.categories.find((c) => c.id === activeCatId) ?? null : null;

  if (error) return <div className="text-red-300">{error}</div>;
  if (!data || !cfg) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;

  if (data.locked) {
    return (
      <div className="bs-root min-w-0 space-y-6">
        <HeaderBar t={t} running={true} />
        <div className="bs-panel flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#161A21] text-xl">🔒</span>
          <h3 className="text-[16px] font-bold">{t('cloud.lockedPlan')}</h3>
          <Link to="/pricing" className="bs-btn bs-btn-primary mt-2">{t('dash.upgrade')}</Link>
        </div>
      </div>
    );
  }

  const activeSlot = data.slots.find((s) => s.id === activeSlotId) ?? data.slots[0];

  return (
    <div className="bs-root min-w-0">
      {/* Edit banner */}
      {editing ? (
        <div className="bs-savebar mb-5">
          <div className="flex items-center gap-3">
            <span className="bs-badge warn"><span className="dot" />{t('cloud.editing')}</span>
            {dirty && <div className="bs-unsaved"><span className="dot" />{t('cloud.unsaved')}</div>}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="bs-btn bs-btn-ghost" onClick={exitEdit}>{t('cloud.cancel')}</button>
            <button type="button" className="bs-btn bs-btn-primary" onClick={save} disabled={saving || !dirty}>
              {saving ? <span className="inline-flex items-center gap-2"><Spinner size={16} />{t('cloud.saving')}</span> : <>✓ {t('cloud.save')}</>}
            </button>
          </div>
        </div>
      ) : (
        <div className="bs-savebar mb-5" style={{ justifyContent: 'flex-start' }}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#161A21] text-[var(--bs-gold)]">{I.lock}</span>
          <div>
            <div className="text-[13px] font-bold">{t('cloud.lockedTitle')}</div>
            <div className="text-[12px] text-[var(--bs-text-3)]">{t('cloud.lockedDesc')}</div>
          </div>
          <button type="button" className="bs-btn bs-btn-purple ms-auto" onClick={() => setEditing(true)}>
            {I.configure}{t('cloud.edit')}
          </button>
        </div>
      )}

      <div className="bs-shell">
        {/* Navigation rail */}
        <NavRail
          area={area}
          onArea={(a) => { setArea(a); setActiveCatId(null); }}
          counts={{
            automation: categoriesForArea(data.schema, 'automation').filter(enabledCount(cfg)).length,
            events: categoriesForArea(data.schema, 'events').filter(enabledCount(cfg)).length,
          }}
        />

        {/* Workspace */}
        <div className="bs-workspace">
          <Topbar
            t={t}
            area={area}
            accountName={activeSlot?.name ?? user?.username ?? ''}
            accountSub={user?.username}
            running={true}
            slots={data.slots}
            activeSlotId={activeSlotId}
            onSwitch={switchAccount}
          />

          {area === 'overview' && (
            <OverviewArea t={t} schema={data.schema} cfg={cfg} slots={data.slots} activeSlotId={activeSlotId}
              onGo={(catId) => openCategory(catId)} onEdit={() => setEditing(true)} />
          )}

          {area === 'accounts' && (
            <AccountsArea t={t} slots={data.slots} activeSlotId={activeSlotId} onSwitch={switchAccount}
              onRename={handleRename} username={user?.username ?? ''} />
          )}

          {(area === 'automation' || area === 'events' || area === 'system') && !activeCategory && (
            <FeatureLanding
              cfg={cfg}
              categories={categoriesForArea(data.schema, area)}
              onOpen={openCategory}
            />
          )}

          {(area === 'automation' || area === 'events' || area === 'system') && activeCategory && (
            <>
              <CategoryHeader category={activeCategory} onBack={() => setActiveCatId(null)} />
              <div className={editing ? '' : 'bs-readonly'}>
                <CategoryPanel category={activeCategory} path={[activeCategory.id]} cfg={cfg} disabled={!editing} onChange={update} />
              </div>
              {editing && ratioIssues.length > 0 && (
                <div className="rounded-xl border border-[rgba(240,93,104,0.4)] bg-[rgba(240,93,104,0.08)] px-4 py-3 text-[12.5px] font-semibold text-[var(--bs-warning)]">
                  {t('cloud.ratioGridWarning')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modalOpen && <SavedModal t={t} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

/* Count how many feature-categories are "on" (any enabled boolean among their fields/groups). */
function enabledCount(cfg: CloudConfig) {
  return (cat: CloudCategorySchema): boolean => {
    return walkEnabled(cfg, [cat.id], cat);
  };
}
function walkEnabled(cfg: CloudConfig, path: string[], cat: CloudCategorySchema): boolean {
  for (const f of cat.fields ?? []) {
    if (f.type === 'boolean' && getValue(cfg, [...path, f.key]) === true) return true;
  }
  for (const g of cat.groups ?? []) {
    if (walkEnabled(cfg, [...path, g.id], g)) return true;
  }
  return false;
}

/* ─────────────────────────────────────────────────────────────────────────
   Navigation rail
   ───────────────────────────────────────────────────────────────────────── */
function NavRail({ area, onArea, counts }: { area: Area; onArea: (a: Area) => void; counts: { automation: number; events: number } }) {
  const item = (a: Area, label: string, icon: ReactNode, count?: number) => (
    <button type="button" className={`bs-nav-item ${area === a ? 'active' : ''}`} onClick={() => onArea(a)}>
      <span className="bs-nav-ic">{icon}</span>
      {label}
      {count !== undefined && count > 0 && <span className="bs-nav-count">{count}</span>}
    </button>
  );
  return (
    <aside className="bs-nav" style={{ position: 'sticky', top: 24 }}>
      <div className="bs-nav-head">
        <span className="bs-nav-logo">S8</span>
        <div className="bs-nav-brand">SU8LDEVs BOT<small>Control Console</small></div>
      </div>

      <div className="bs-area-label">Command</div>
      {item('overview', 'Overview', I.overview)}
      {item('accounts', 'Accounts', I.accounts)}

      <div className="bs-area-label">Automation</div>
      {item('automation', 'Automation', I.automation, counts.automation)}

      <div className="bs-area-label">Combat</div>
      {item('events', 'Events', I.events, counts.events)}

      <div className="bs-area-label">System</div>
      {item('system', 'System', I.system)}
    </aside>
  );
}

/* ── Top bar with account context ───────────────────────────────────────── */
function Topbar({
  t, area, accountName, accountSub, running, slots, activeSlotId, onSwitch,
}: {
  t: (k: string) => string;
  area: Area;
  accountName: string;
  accountSub?: string;
  running: boolean;
  slots: CloudSlot[];
  activeSlotId: string;
  onSwitch: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const areaTitle = area.charAt(0).toUpperCase() + area.slice(1);
  return (
    <div className="bs-topbar">
      <div>
        <div className="bs-topbar-sub">{t('dash.botPanel')}</div>
        <h1 className="bs-topbar-title">{area === 'overview' ? t('cloud.title') : areaTitle}</h1>
      </div>

      {running && <span className="bs-badge online"><span className="dot" />{t('botpanel.online')}</span>}

      <div className={`bs-account ${slots.length <= 1 ? 'borderless' : ''}`}>
        <div className="min-w-0 text-end">
          <div className="bs-acct-name">{accountName}</div>
          {accountSub && <div className="bs-acct-meta">{accountSub}</div>}
        </div>
        {slots.length > 1 && (
          <div className="relative">
            <button type="button" className="bs-btn" style={{ minHeight: 30, padding: '0 8px' }} onClick={() => setOpen((o) => !o)}>
              {I.down}
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                <div className="bs-panel absolute end-0 z-40 mt-2 w-52" style={{ padding: 6 }}>
                  {slots.map((s) => (
                    <button key={s.id} type="button"
                      onClick={() => { onSwitch(s.id); setOpen(false); }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-[13px] font-semibold transition-colors hover:bg-[var(--bs-surface-2)] ${s.id === activeSlotId ? 'text-[var(--bs-gold)]' : 'text-[var(--bs-text-2)]'}`}>
                      <span>{s.id === activeSlotId ? '●' : '○'}</span>
                      <span className="truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Overview area ──────────────────────────────────────────────────────── */
function OverviewArea({
  t, schema, cfg, slots, activeSlotId, onGo, onEdit,
}: {
  t: (k: string) => string;
  schema: CloudConfigDto['schema'];
  cfg: CloudConfig;
  slots: CloudSlot[];
  activeSlotId: string;
  onGo: (catId: string) => void;
  onEdit: () => void;
}) {
  const automation = categoriesForArea(schema, 'automation');
  const events = categoriesForArea(schema, 'events');
  const activeAuto = automation.filter(enabledCount(cfg)).length;
  const activeEvents = events.filter(enabledCount(cfg)).length;
  const activeSlot = slots.find((s) => s.id === activeSlotId) ?? slots[0];
  const totalEnabled = [...automation, ...events].filter(enabledCount(cfg)).length;

  return (
    <div className="space-y-4">
      <div className="bs-stat-grid">
        <div className="bs-stat"><div className="bs-stat-num">{slots.length}</div><div className="bs-stat-label">Accounts</div></div>
        <div className="bs-stat"><div className="bs-stat-num">{totalEnabled}</div><div className="bs-stat-label">Active Features</div></div>
        <div className="bs-stat"><div className="bs-stat-num">{activeAuto}</div><div className="bs-stat-label">Automation</div></div>
        <div className="bs-stat"><div className="bs-stat-num">{activeEvents}</div><div className="bs-stat-label">Events</div></div>
      </div>

      <div className="bs-panel">
        <div className="bs-panel-head">
          <div>
            <div className="bs-panel-title">Account</div>
            <div className="bs-panel-sub">Current configuration profile</div>
          </div>
        </div>
        <div className="bs-panel-body">
          <div className="bs-row">
            <div><div className="bs-row-label">{activeSlot?.name ?? t('cloud.switchAccount')}</div><div className="bs-row-desc">{t('botpanel.running')}</div></div>
            <span className="bs-badge online"><span className="dot" />ONLINE</span>
          </div>
        </div>
      </div>

      <div className="bs-panel">
        <div className="bs-panel-head">
          <div>
            <div className="bs-panel-title">{t('cloud.title')}</div>
            <div className="bs-panel-sub">{t('botpanel.subtitle')}</div>
          </div>
          <button type="button" className="bs-btn bs-btn-primary ms-auto" style={{ marginLeft: 0 }} onClick={onEdit}>{I.configure} {t('cloud.edit')}</button>
        </div>
        <div className="bs-panel-body">
          <div className="bs-feature-grid">
            {[...automation, ...events].map((c) => (
              <FeatureCard key={c.id} category={c} enabled={enabledCount(cfg)(c)} onOpen={() => onGo(c.id)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountsArea({
  t, slots, activeSlotId, onSwitch, onRename, username,
}: {
  t: (k: string) => string;
  slots: CloudSlot[];
  activeSlotId: string;
  onSwitch: (id: string) => void;
  onRename: (id: string, newName: string) => Promise<void>;
  username: string;
}) {
  const [renaming, setRenaming] = useState<CloudSlot | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const active = slots.find((s) => s.id === activeSlotId) ?? slots[0];

  const startRename = (s: CloudSlot) => { setName(s.name); setRenaming(s); };
  const doRename = async () => {
    if (!renaming || !name.trim()) return;
    setBusy(true);
    try { await onRename(renaming.id, name.trim()); setRenaming(null); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bs-panel">
        <div className="bs-panel-head">
          <div><div className="bs-panel-title">{t('cloud.switchAccount')}</div><div className="bs-panel-sub">{username}</div></div>
        </div>
        <div className="bs-panel-body">
          {slots.map((s) => (
            <div key={s.id} className="bs-row">
              <div>
                <div className="bs-row-label">{s.name}</div>
                <div className="bs-row-desc">{s.id === activeSlotId ? 'Active configuration' : 'Switch to edit this account'}</div>
              </div>
              <div className="flex items-center gap-2">
                {s.id === activeSlotId && <span className="bs-badge online"><span className="dot" />ACTIVE</span>}
                <button type="button" className="bs-btn bs-btn-ghost" onClick={() => startRename(s)}>{t('cloud.rename')}</button>
                {s.id !== activeSlotId && <button type="button" className="bs-btn" onClick={() => onSwitch(s.id)}>Switch</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bs-panel">
        <div className="bs-panel-head"><div className="bs-panel-title">{active?.name} — {t('botpanel.running')}</div></div>
        <div className="bs-panel-body">
          <div className="bs-row"><div><div className="bs-row-label">Configuration source</div><div className="bs-row-desc">This account uses its own saved configuration.</div></div><span className="bs-row-tag">Custom</span></div>
          <div className="bs-row"><div><div className="bs-row-label">{t('cloud.footerNote')}</div></div></div>
        </div>
      </div>

      {renaming && (
        <div className="bs-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setRenaming(null)}>
          <div className="bs-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bs-modal-title">{t('cloud.renameTitle')}</div>
            <div className="bs-modal-sub">{t('cloud.renameDesc')}</div>
            <input className="bs-input mt-4" value={name} maxLength={60} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void doRename(); }} placeholder={t('cloud.renamePlaceholder')} />
            <div className="mt-4 flex gap-2">
              <button type="button" className="bs-btn bs-btn-primary flex-1" onClick={doRename} disabled={busy || !name.trim()}>{busy ? <Spinner size={16} /> : t('cloud.renameSave')}</button>
              <button type="button" className="bs-btn bs-btn-ghost flex-1" onClick={() => setRenaming(null)}>{t('cloud.renameCancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Feature landing (progressive disclosure) ───────────────────────────── */
function FeatureLanding({
  cfg, categories, onOpen,
}: {
  cfg: CloudConfig;
  categories: CloudCategorySchema[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bs-feature-grid">
        {categories.map((c) => (
          <FeatureCard key={c.id} category={c} enabled={enabledCount(cfg)(c)} onOpen={() => onOpen(c.id)} />
        ))}
      </div>
      {categories.length === 0 && <div className="bs-empty">No features available.</div>}
    </div>
  );
}

function FeatureCard({ category, enabled, onOpen }: { category: CloudCategorySchema; enabled: boolean; onOpen: () => void }) {
  return (
    <div className="bs-feature-card">
      <div className="bs-feature-head">
        <span className="bs-feature-ic">{category.icon ?? '⚙️'}</span>
        <div className="min-w-0">
          <div className="bs-feature-title">{category.title}</div>
          <div className={`bs-state-badge ${enabled ? 'active' : 'paused'}`}>{enabled ? '● ACTIVE' : '○ PAUSED'}</div>
        </div>
      </div>
      {category.description && <div className="bs-feature-desc">{category.description}</div>}
      <div className="bs-feature-actions">
        {enabled && <span className="bs-row-tag">Enabled</span>}
        <button type="button" className="bs-btn" onClick={onOpen} style={{ marginLeft: 'auto' }}>
          Configure {I.chevron}
        </button>
      </div>
    </div>
  );
}

function CategoryHeader({ category, onBack }: { category: CloudCategorySchema; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" className="bs-btn bs-btn-ghost" style={{ minHeight: 34, padding: '0 10px' }} onClick={onBack} title="Back">←</button>
      <span className="bs-feature-ic" style={{ width: 44, height: 44 }}>{category.icon ?? '⚙️'}</span>
      <div>
        <div className="bs-panel-title">{category.title}</div>
        {category.description && <div className="bs-panel-sub">{category.description}</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Dynamic category renderer — groups -> fields, progressive disclosure
   ───────────────────────────────────────────────────────────────────────── */
function CategoryPanel({
  category, path, cfg, disabled, onChange, depth = 0,
}: {
  category: CloudCategorySchema;
  path: string[];
  cfg: CloudConfig;
  disabled: boolean;
  onChange: (path: string[], v: unknown) => void;
  depth?: number;
}) {
  const localRatioGroups = ratioGroupsIn(path);
  const gridRatioKeys = new Set(localRatioGroups.flatMap((r) => r.keys));
  const gridEnableKeys = new Set(localRatioGroups.flatMap((r) => (r.enable ? [r.enable] : [])));
  const booleans = (category.fields ?? []).filter((f) => f.type === 'boolean' && !gridEnableKeys.has(f.key));
  const others = (category.fields ?? []).filter((f) => f.type !== 'boolean' && !gridRatioKeys.has(f.key));

  // Separate first "master switch" boolean (if it looks like one) from the rest
  const master = booleans.find((f) => /enable|enabled|dispatch|epic|advance|claim|collect|battle|auto/i.test(f.key)) ?? booleans[0];
  const masters = master ? booleans.filter((b) => b.key === master.key) : [];
  const restBooleans = booleans.filter((b) => !masters.includes(b));

  return (
    <div className="space-y-4">
      {depth === 0 && category.groups && category.groups.length > 1 && (
        <div className="bs-section-title">Modules <span className="rule" /></div>
      )}

      {/* master toggle row */}
      {masters.map((f) => (
        <BooleanRow key={f.key} field={f} value={Boolean(getValue(cfg, [...path, f.key]))} disabled={disabled} onChange={(v) => onChange([...path, f.key], v)} />
      ))}

      {/* other booleans */}
      {restBooleans.length > 0 && (
        <div>
          {restBooleans.map((f) => (
            <BooleanRow key={f.key} field={f} value={Boolean(getValue(cfg, [...path, f.key]))} disabled={disabled} onChange={(v) => onChange([...path, f.key], v)} />
          ))}
        </div>
      )}

      {/* number / select / radio / string / slider */}
      {others.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {others.map((f) => (
            <Field key={f.key} field={f}>
              <FieldInput field={f} value={getValue(cfg, [...path, f.key])} disabled={disabled} onChange={(v) => onChange([...path, f.key], v)} />
            </Field>
          ))}
        </div>
      )}

      {/* ratio matrix */}
      {localRatioGroups.length > 0 && (
        <RatioPanel groups={localRatioGroups} path={path} cfg={cfg} disabled={disabled} onChange={onChange} />
      )}

      {/* nested groups */}
      {category.groups?.map((g) => (
        <GroupCard key={g.id} group={g} path={[...path, g.id]} cfg={cfg} disabled={disabled} onChange={onChange} />
      ))}

      {depth === 0 && category.fields && category.fields.length === 0 && !category.groups && (
        <div className="bs-empty">No configuration available.</div>
      )}
    </div>
  );
}

function GroupCard({
  group, path, cfg, disabled, onChange,
}: {
  group: CloudCategorySchema;
  path: string[];
  cfg: CloudConfig;
  disabled: boolean;
  onChange: (path: string[], v: unknown) => void;
}) {
  const [open, setOpen] = useState(depthDefault(group));
  const enabled = isGroupEnabled(cfg, path, group);
  return (
    <div className="bs-group">
      <div className="bs-group-head" onClick={() => setOpen((o) => !o)} role="button" aria-expanded={open}>
        {group.icon && <span>{group.icon}</span>}
        <span className="bs-group-title">{group.title}</span>
        {group.description && !open && <span className="bs-row-desc truncate" style={{ margin: 0, maxWidth: '40%' }}>{group.description}</span>}
        <span className="bs-group-state">
          {enabled ? <span className="bs-state-badge active">● ON</span> : <span className="bs-state-badge off">○ OFF</span>}
        </span>
        <span className={`chev ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--bs-text-3)', transition: 'transform .18s' }}>{I.chevron}</span>
      </div>
      {open && (
        <div className="bs-group-body">
          <CategoryPanel category={group} path={path} cfg={cfg} disabled={disabled} onChange={onChange} depth={1} />
        </div>
      )}
    </div>
  );
}

function depthDefault(group: CloudCategorySchema): boolean {
  // Groups containing ratio triplets or a clear primary switch open by default; big toggle lists collapse
  const keys = (group.fields ?? []).map((f) => f.key.toLowerCase());
  const hasRatio = keys.some((k) => /_inf$|_cav$|_arch$|_rng$|_join|_master/.test(k));
  return hasRatio || (group.fields?.length ?? 0) <= 6;
}

function isGroupEnabled(cfg: CloudConfig, path: string[], group: CloudCategorySchema): boolean {
  for (const f of group.fields ?? []) {
    if (f.type === 'boolean' && getValue(cfg, [...path, f.key]) === true) return true;
  }
  for (const g of group.groups ?? []) {
    if (isGroupEnabled(cfg, [...path, g.id], g)) return true;
  }
  return false;
}

/* ── Ratio panel (matrix) ───────────────────────────────────────────────── */
function RatioPanel({
  groups, path, cfg, disabled, onChange,
}: {
  groups: RatioGroupDef[];
  path: string[];
  cfg: CloudConfig;
  disabled: boolean;
  onChange: (path: string[], v: unknown) => void;
}) {
  if (groups.length <= 1) {
    // single triplet — stack vertically for clarity (Championship etc.)
    const rg = groups[0];
    return <div className="bs-panel"><div className="bs-panel-body"><RatioStack rg={rg} path={path} cfg={cfg} disabled={disabled} onChange={onChange} /></div></div>;
  }
  return (
    <div className="bs-panel">
      <div className="bs-panel-head"><div className="bs-panel-title">Troop Distribution</div></div>
      <div className="overflow-x-auto">
        <table className="bs-ratio-table">
          <thead>
            <tr>
              <th> </th><th>Tower / Group</th><th>Inf %</th><th>Cav %</th><th>Arch %</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((rg) => {
              const vals = rg.keys.map((k) => Number(getValue(cfg, [...path, k])) || 0);
              const sum = vals.reduce((a, b) => a + b, 0);
              const ok = sum === 100;
              const enabled = rg.enable ? Boolean(getValue(cfg, [...path, rg.enable])) : true;
              return (
                <tr key={rg.name} className={`bs-ratio-row ${ok ? '' : 'invalid'}`}>
                  <td>{rg.enable && <Toggle checked={enabled} disabled={disabled} onChange={(v) => onChange([...path, rg.enable!], v)} />}</td>
                  <td className="tower" style={{ opacity: enabled ? 1 : 0.45 }}>{rg.name}</td>
                  {rg.keys.map((k, i) => (
                    <td key={k}><RatioInput value={vals[i]} disabled={disabled} onChange={(v) => onChange([...path, k], v)} /></td>
                  ))}
                  <td className={`bs-ratio-total ${ok ? 'ok' : 'bad'}`}>{ok ? '100% ✓' : `${sum}%`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RatioStack({ rg, path, cfg, disabled, onChange }: { rg: RatioGroupDef; path: string[]; cfg: CloudConfig; disabled: boolean; onChange: (path: string[], v: unknown) => void }) {
  const { t } = useI18n();
  const vals = rg.keys.map((k) => Number(getValue(cfg, [...path, k])) || 0);
  const sum = vals.reduce((a, b) => a + b, 0);
  const ok = sum === 100;
  const enabled = rg.enable ? Boolean(getValue(cfg, [...path, rg.enable])) : true;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="bs-feature-title">{rg.name}</div>
          <div className={`bs-state-badge ${ok ? 'active' : 'paused'}`}>{ok ? '✓ 100%' : `${sum}% — ${t('cloud.ratioSumInvalid')}`}</div>
        </div>
        {rg.enable && <Toggle checked={enabled} disabled={disabled} onChange={(v) => onChange([...path, rg.enable!], v)} />}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {rg.keys.map((k, i) => {
          const label = i === 2 && rg.keys.length === 3
            ? (rg.keys[2].endsWith('_rng') ? 'Ranged %' : 'Archer %')
            : (i === 1 ? 'Cavalry %' : 'Infantry %');
          return (
            <div key={k}>
              <div className="bs-input-hint" style={{ marginTop: 0, marginBottom: 6 }}>{label}</div>
              <RatioInput value={vals[i]} disabled={disabled} onChange={(v) => onChange([...path, k], v)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RatioInput({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (v: number) => void }) {
  return <input type="number" className="bs-ratio" min={0} max={100} step={1} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />;
}

/* ── Field primitives ───────────────────────────────────────────────────── */
function BooleanRow({ field, value, disabled, onChange }: { field: CloudFieldSchema; value: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="bs-row">
      <div className="min-w-0">
        <div className="bs-row-label">{field.label}</div>
        {field.description && <div className="bs-row-desc">{field.description}</div>}
      </div>
      <div className="bs-row-control">
        <Toggle checked={value} disabled={disabled} onChange={onChange} />
      </div>
    </div>
  );
}

function Field({ field, children }: { field: CloudFieldSchema; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-[13px] font-semibold text-[var(--bs-text)]">{field.label}</label>
      {field.description && <div className="mb-2 text-[11.5px] text-[var(--bs-text-3)]">{field.description}</div>}
      {children}
    </div>
  );
}

function FieldInput({ field, value, disabled, onChange }: { field: CloudFieldSchema; value: unknown; disabled: boolean; onChange: (v: unknown) => void }) {
  switch (field.type) {
    case 'number': return <NumberInput field={field} value={Number(value ?? 0)} disabled={disabled} onChange={(v) => onChange(v)} />;
    case 'slider': return <Slider field={field} value={Number(value ?? 0)} disabled={disabled} onChange={(v) => onChange(v)} />;
    case 'string':
      return <input className="bs-input" value={String(value ?? '')} maxLength={field.maxLength} placeholder={field.placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} />;
    case 'select':
      return <SelectInput value={String(value ?? '')} options={field.options ?? []} disabled={disabled} onChange={(v) => onChange(v)} />;
    case 'radio':
      return <RadioGroup value={String(value ?? '')} options={field.options ?? []} disabled={disabled} onChange={(v) => onChange(v)} />;
    default: return null;
  }
}

function NumberInput({ field, value, disabled, onChange }: { field: CloudFieldSchema; value: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <div className="bs-numwrap">
      <input className="bs-input" style={{ flex: 1 }} type="number" min={field.min} max={field.max} step={field.step ?? 1} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
      {field.unit && <span className="bs-unit">{field.unit}</span>}
    </div>
  );
}

function Slider({ field, value, disabled, onChange }: { field: CloudFieldSchema; value: number; disabled: boolean; onChange: (v: number) => void }) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  return (
    <div className="bs-slider-row">
      <div className="bs-slider-wrap">
        <input type="range" className="bs-range" min={min} max={max} step={field.step ?? 1} value={value} disabled={disabled} style={{ background: `linear-gradient(to right, var(--bs-gold) ${((value - min) / (max - min)) * 100}%, var(--bs-surface-3) 0%)` }} onChange={(e) => onChange(Number(e.target.value))} />
        <div className="bs-slider-labels"><span>{min}</span><span>{max}{field.unit ? ` ${field.unit}` : ''}</span></div>
      </div>
      <input className="bs-input" style={{ width: 76, textAlign: 'center' }} type="number" min={min} max={max} step={field.step ?? 1} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function SelectInput({ value, options, disabled, onChange }: { value: string; options: string[]; disabled: boolean; onChange: (v: string) => void }) {
  return <select className="bs-select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
}

function RadioGroup({ value, options, disabled, onChange }: { value: string; options: string[]; disabled: boolean; onChange: (v: string) => void }) {
  return (
    <div className="bs-radio-group">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} disabled={disabled} onClick={() => onChange(o)} className="bs-radio">{o}</button>
      ))}
    </div>
  );
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} className="bs-toggle" onClick={() => onChange(!checked)}>
      <span className="knob" />
    </button>
  );
}

/* ── HeaderBar for locked state ─────────────────────────────────────────── */
function HeaderBar({ t, running }: { t: (k: string) => string; running: boolean }) {
  return (
    <div className="bs-topbar">
      <div><div className="bs-topbar-sub">{t('dash.botPanel')}</div><h1 className="bs-topbar-title">{t('cloud.title')}</h1></div>
      {running && <span className="bs-badge online"><span className="dot" />{t('botpanel.online')}</span>}
    </div>
  );
}

function SavedModal({ t, onClose }: { t: (k: string) => string; onClose: () => void }) {
  return (
    <div className="bs-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bs-success-ring"><span className="bs-success-check">{I.check}</span></div>
        <div className="bs-modal-title text-center">{t('cloud.modalTitle')}</div>
        <div className="bs-modal-sub text-center">{t('cloud.footerNote')}</div>
        <button type="button" className="bs-btn bs-btn-primary mt-5 w-full" onClick={onClose}>{t('cloud.modalClose')}</button>
      </div>
    </div>
  );
}