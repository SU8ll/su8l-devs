import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
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
import { Kicker, Spinner } from '../../components/ui';

type JsonObject = Record<string, unknown>;

/**
 * Troop-ratio slider groups whose combined value is HARD-CONSTRAINED to exactly
 * 100%. Mirrors RATIO_GROUPS in server/src/cloudSchema.ts. Any drag or typed
 * input is clamped so a group can never overflow 100%, and save is blocked
 * until every group totals exactly 100%.
 *
 * A Climb Tower group can also carry an `enable` key: that tower's toggle is
 * embedded inside the grid row instead of being rendered as a standalone card.
 */
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

/** i18n accessor used by the schema-driven renderer. */
function useLoc() {
  return useI18n();
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
    const next = cur[path[i]];
    if (next && typeof next === 'object' && !Array.isArray(next)) cur = next as JsonObject;
    else cur = (cur[path[i]] = {}) as JsonObject;
  }
  cur[path[path.length - 1]] = value;
  return clone as unknown as CloudConfig;
}

export default function CloudConfigurator() {
  const { t } = useI18n();
  const [data, setData] = useState<CloudConfigDto | null>(null);
  const [cfg, setCfg] = useState<CloudConfig | null>(null);
  const [snapshot, setSnapshot] = useState('');
  const [activeKey, setActiveKey] = useState('');
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
      const sum = rg.keys.reduce(
        (acc, k) => acc + (Number(getValue(cfg, [rg.categoryId, rg.groupId, k])) || 0),
        0
      );
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
      setActiveKey(d.schema.categories[0]?.id ?? '');
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
      // Hard lock: troop-ratio sliders (Championship + all Climb Tower towers
      // and the other 100%-ratio groups) may never push their group's combined
      // value past 100%.
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
      try {
        setCfg(JSON.parse(snapshot) as CloudConfig);
      } catch {
        /* ignore */
      }
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

  if (error) return <div className="text-red-300">{error}</div>;
  if (!data || !cfg) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;

  if (data.locked) {
    return (
      <div className="min-w-0 space-y-6">
        <Header t={t} running={true} />
        <div className="glass glow-border rounded-3xl p-12 text-center">
          <div className="text-4xl">🔒</div>
          <h3 className="mt-4 font-display text-lg font-bold">{t('cloud.lockedPlan')}</h3>
          <Link to="/pricing" className="btn-primary mt-6 inline-flex">
            {t('dash.upgrade')}
          </Link>
        </div>
      </div>
    );
  }

  const active = data.schema.categories.find((c) => c.id === activeKey) ?? data.schema.categories[0];

  return (
    <div className="min-w-0 space-y-6">
      <Header
        t={t}
        running={true}
        slots={data.slots}
        activeSlotId={activeSlotId}
        onSwitch={switchAccount}
        onRename={handleRename}
      />

      {/* Command-deck lock banner */}
      {editing ? (
        <div className="lock-banner flex flex-col items-center justify-between gap-4 p-5 sm:flex-row sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-glow text-white shadow-glow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </span>
            <div>
              <div className="font-display text-sm font-bold uppercase tracking-[0.2em] text-glow">{t('cloud.editing')}</div>
              <div className="text-xs text-muted">{dirty ? t('cloud.unsaved') : '—'}</div>
            </div>
          </div>
          <button type="button" className="btn-ghost" onClick={exitEdit}>
            {t('cloud.cancel')}
          </button>
        </div>
      ) : (
        <div className="lock-banner flex flex-col items-center justify-between gap-4 p-5 sm:flex-row sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-glow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <div>
              <div className="font-display text-sm font-bold uppercase tracking-[0.2em] text-glow">{t('cloud.lockedTitle')}</div>
              <div className="text-xs text-muted">{t('cloud.lockedDesc')}</div>
            </div>
          </div>
          <button type="button" className="btn-primary shrink-0" onClick={() => setEditing(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            {t('cloud.edit')}
          </button>
        </div>
      )}

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar — master schema categories */}
        <aside className="glass glow-border rounded-3xl p-2 lg:sticky lg:top-24">
          {/* Mobile: compact select dropdown */}
          <select
            className="neon-input neon-select w-full text-sm lg:hidden"
            value={active?.id ?? ''}
            onChange={(e) => {
              const cat = data.schema.categories.find((c) => c.id === e.target.value);
              if (cat) setActiveKey(cat.id);
            }}
          >
            {data.schema.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ''}{c.title}
              </option>
            ))}
          </select>
          {/* Desktop: horizontal then vertical scroll */}
          <div className="hidden gap-1 lg:flex lg:flex-col lg:gap-1">
            {data.schema.categories.map((c) => (
              <SidebarItem
                key={c.id}
                category={c}
                active={c.id === active?.id}
                onClick={() => setActiveKey(c.id)}
              />
            ))}
          </div>
        </aside>

        {/* Active category — rendered dynamically from the schema */}
        <div className="min-w-0 glass-strong rounded-3xl p-4 sm:p-8">
          {active && (
            <div className={editing ? '' : 'pointer-events-none select-none opacity-60 sm:opacity-50'}>
              <CategoryPanel
                category={active}
                path={[active.id]}
                cfg={cfg}
                disabled={!editing}
                onChange={update}
              />
            </div>
          )}

          {/* Save deck — only while editing */}
          {editing && (
            <div className="mt-10 border-t border-white/10 pt-8">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <div className="text-center sm:text-start">
                  <button
                    type="button"
                    className="btn-primary w-full px-10 py-3 text-base sm:w-auto"
                    onClick={save}
                    disabled={saving || !dirty}
                  >
                    {saving ? (
                      <span className="inline-flex items-center gap-2">
                        <Spinner size={18} /> {t('cloud.saving')}
                      </span>
                    ) : (
                      <>
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                        {t('cloud.save')}
                      </>
                    )}
                  </button>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-glow/70" />
                    <span className="text-xs text-muted">{t('cloud.footerNote')}</span>
                  </div>
                </div>
                <button type="button" className="btn-ghost" onClick={exitEdit}>
                  {t('cloud.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <SavedModal
          onClose={() => setModalOpen(false)}
          t={t}
        />
      )}
    </div>
  );
}

function Header({
  t,
  running,
  slots,
  activeSlotId,
  onSwitch,
  onRename,
}: {
  t: (k: string) => string;
  running: boolean;
  slots?: CloudSlot[];
  activeSlotId?: string | null;
  onSwitch?: (id: string) => void;
  onRename?: (id: string, newName: string) => Promise<void>;
}) {
  const showSwitcher = !!slots && slots.length > 1 && !!onSwitch && !!onRename;
  return (
    <div>
      <Kicker>{t('dash.botPanel')}</Kicker>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-extrabold text-gradient">{t('cloud.title')}</h1>
        <span className="rounded-full border border-glow/40 bg-glow/10 px-3 py-0.5 font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-glow">
          {t('cloud.subtitle')}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">{t('cloud.subtitleLong')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${running ? 'pulse-dot' : 'bg-muted'}`} />
        <span className="text-sm font-semibold text-emerald-300">{t('botpanel.running')}</span>
        {showSwitcher && (
          <AccountSwitcher
            slots={slots!}
            activeId={activeSlotId ?? slots![0].id}
            onSwitch={onSwitch!}
            onRename={onRename!}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Drop-in dropdown to switch the active bot slot (account) without a full
 * reload. Only rendered when the user owns more than one slot. A pencil button
 * sits next to the active account name and opens the rename modal.
 */
function AccountSwitcher({
  slots,
  activeId,
  onSwitch,
  onRename,
}: {
  slots: CloudSlot[];
  activeId: string;
  onSwitch: (id: string) => void;
  onRename: (id: string, newName: string) => Promise<void>;
}) {
  const { t } = useLoc();
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [renameErr, setRenameErr] = useState('');
  const active = slots.find((s) => s.id === activeId) ?? slots[0];

  const openRename = () => {
    setNameInput(active?.name ?? '');
    setRenameErr('');
    setRenaming(true);
    setOpen(false);
  };

  const saveRename = async () => {
    if (!active) return;
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setBusy(true);
    setRenameErr('');
    try {
      await onRename(active.id, trimmed);
      setRenaming(false);
    } catch {
      setRenameErr(t('cloud.renameError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative ms-auto sm:ms-0">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
        >
          <span className="h-2 w-2 rounded-full bg-glow" />
          <span className="max-w-40 truncate">{active?.name ?? t('cloud.switchAccount')}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {active && (
          <button
            type="button"
            onClick={openRename}
            title={t('cloud.rename')}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="glass-strong glow-border absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl p-1.5">
            {slots.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onSwitch(s.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-sm font-semibold transition-colors ${
                  s.id === activeId
                    ? 'bg-gradient-to-r from-primary/25 to-glow/25 text-white'
                    : 'text-muted hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-xs">{s.id === activeId ? '●' : '○'}</span>
                <span className="truncate">{s.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {renaming && active && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setRenaming(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-gradient">{t('cloud.renameTitle')}</h3>
            <p className="mt-1 text-xs text-muted">{t('cloud.renameDesc')}</p>
            <input
              className="neon-input mt-4 w-full"
              value={nameInput}
              maxLength={60}
              placeholder={t('cloud.renamePlaceholder')}
              autoFocus
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveRename();
              }}
            />
            {renameErr && <div className="mt-2 text-xs text-red-300">{renameErr}</div>}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={saveRename}
                disabled={busy || !nameInput.trim()}
              >
                {busy ? <Spinner size={16} /> : t('cloud.renameSave')}
              </button>
              <button type="button" className="btn-ghost flex-1" onClick={() => setRenaming(false)}>
                {t('cloud.renameCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarItem({
  category,
  active,
  onClick,
}: {
  category: CloudCategorySchema;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-all ${
        active
          ? 'bg-gradient-to-r from-primary/20 to-glow/15 ring-1 ring-glow/30'
          : 'hover:bg-white/[0.04]'
      }`}
    >
      <span className="text-xl">{category.icon ?? '⚙️'}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-white/90">{category.title}</span>
        {category.description && (
          <span className="hidden truncate text-xs text-muted lg:block">{category.description}</span>
        )}
      </span>
    </button>
  );
}

/* ── Dynamic category renderer ────────────────────────────────────────────── */

function CategoryPanel({
  category,
  path,
  cfg,
  disabled,
  onChange,
  showTitle = true,
}: {
  category: CloudCategorySchema;
  path: string[];
  cfg: CloudConfig;
  disabled: boolean;
  onChange: (path: string[], value: unknown) => void;
  showTitle?: boolean;
}) {
  const localRatioGroups = ratioGroupsIn(path);
  // Groups holding several 100%-constrained triplets (e.g. the 3 Climb Tower
  // troop ratios) render as a compact grid table instead of a slider stack.
  const isRatioGrid = localRatioGroups.length > 1;
  const gridRatioKeys = new Set(localRatioGroups.flatMap((r) => r.keys));
  const gridEnableKeys = new Set(localRatioGroups.flatMap((r) => (r.enable ? [r.enable] : [])));
  const booleans = (category.fields ?? []).filter(
    (f) => f.type === 'boolean' && !gridEnableKeys.has(f.key)
  );
  const others = (category.fields ?? []).filter(
    (f) => f.type !== 'boolean' && (!isRatioGrid || !gridRatioKeys.has(f.key))
  );

  return (
    <div className="space-y-6">
      {showTitle && (
        <SectionTitle icon={category.icon} title={category.title} desc={category.description} />
      )}

      {booleans.map((f) => (
        <BooleanRow
          key={f.key}
          field={f}
          value={Boolean(getValue(cfg, [...path, f.key]))}
          disabled={disabled}
          onChange={(v) => onChange([...path, f.key], v)}
        />
      ))}

      {others.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2">
          {others.map((f) => (
            <Field key={f.key} field={f}>
              <FieldInput
                field={f}
                value={getValue(cfg, [...path, f.key])}
                disabled={disabled}
                onChange={(v) => onChange([...path, f.key], v)}
              />
            </Field>
          ))}
        </div>
      )}

      {isRatioGrid && (
        <RatioGrid groups={localRatioGroups} path={path} cfg={cfg} disabled={disabled} onChange={onChange} />
      )}

      {category.groups?.map((g) => (
        <div
          key={g.id}
          className="rounded-2xl border border-glow/[0.12] bg-gradient-to-br from-glow/[0.03] to-transparent p-4 sm:p-6"
        >
          <SectionTitle icon={g.icon} title={g.title} desc={g.description} />
          <div className="mt-5">
            <CategoryPanel
              category={g}
              path={[...path, g.id]}
              cfg={cfg}
              disabled={disabled}
              onChange={onChange}
              showTitle={false}
            />
          </div>
          <RatioSumBadges cfg={cfg} path={[...path, g.id]} />
        </div>
      ))}
    </div>
  );
}

/**
 * Compact horizontal grid table for 100%-constrained troop-ratio groups. Each
 * tower is a single row with an optional enable toggle, inline number inputs
 * for Inf / Cav / Arch and a live `= 100%` validator. Every input is
 * hard-clamped upstream in `update()`.
 */
function RatioGrid({
  groups,
  path,
  cfg,
  disabled,
  onChange,
}: {
  groups: RatioGroupDef[];
  path: string[];
  cfg: CloudConfig;
  disabled: boolean;
  onChange: (path: string[], value: unknown) => void;
}) {
  const { t } = useLoc();
  return (
    <div className="mt-5">
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[480px]">
          <div className="grid grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto] items-center gap-2 px-3 pb-1.5 text-[0.65rem] font-bold uppercase tracking-[0.15em] text-muted">
            <span className="flex justify-center text-base normal-case" aria-hidden>
              ⚡
            </span>
            <span>{t('cloud.ratioTower')}</span>
            <span className="text-center">{t('cloud.ratioInf')}</span>
            <span className="text-center">{t('cloud.ratioCav')}</span>
            <span className="text-center">{t('cloud.ratioArch')}</span>
            <span className="text-right">{t('cloud.ratioTotal')}</span>
          </div>
          <div className="space-y-2">
            {groups.map((rg) => {
              const vals = rg.keys.map((k) => Number(getValue(cfg, [...path, k])) || 0);
              const sum = vals.reduce((a, b) => a + b, 0);
              const ok = sum === 100;
              const enabled = rg.enable ? Boolean(getValue(cfg, [...path, rg.enable])) : true;
              return (
                <div
                  key={rg.name}
                  className={`grid grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto] items-center gap-2 rounded-xl border px-3 py-2 ${
                    ok ? 'border-white/10 bg-white/[0.03]' : 'border-amber-400/40 bg-amber-400/10'
                  }`}
                >
                  <span className="flex justify-center">
                    {rg.enable && (
                      <Toggle
                        checked={enabled}
                        disabled={disabled}
                        onChange={(v) => onChange([...path, rg.enable!], v)}
                      />
                    )}
                  </span>
                  <span className={`text-sm font-semibold transition-opacity ${enabled ? '' : 'opacity-40'}`}>
                    {rg.name}
                  </span>
                  {rg.keys.map((k, i) => (
                    <RatioInput
                      key={k}
                      value={vals[i]}
                      disabled={disabled}
                      onChange={(v) => onChange([...path, k], v)}
                    />
                  ))}
                  <span
                    className={`text-right text-xs font-bold transition-opacity ${
                      enabled ? (ok ? 'text-emerald-300' : 'text-amber-300') : 'opacity-30'
                    }`}
                  >
                    {ok ? '= 100% ✓' : `= ${sum}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {groups.some((rg) => {
        const sum = rg.keys.reduce((acc, k) => acc + (Number(getValue(cfg, [...path, k])) || 0), 0);
        return sum !== 100;
      }) && (
        <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300">
          {t('cloud.ratioGridWarning')}
        </div>
      )}
    </div>
  );
}

function RatioInput({ value, disabled, onChange }: { value: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      className="neon-ratio"
      min={0}
      max={100}
      step={1}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function RatioSumBadges({ cfg, path }: { cfg: CloudConfig; path: string[] }) {
  const { t } = useLoc();
  const groups = ratioGroupsIn(path);
  // Grid groups already show a per-row `= 100%` validator inside the table;
  // only lone slider groups (Championship) need a summary badge.
  if (groups.length === 0 || groups.length > 1) return null;
  return (
    <div className="mt-4 space-y-2">
      {groups.map((rg) => {
        const sum = rg.keys.reduce((acc, k) => acc + (Number(getValue(cfg, [...path, k])) || 0), 0);
        const ok = sum === 100;
        return (
          <div
            key={rg.name}
            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
              ok
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : 'border-amber-400/40 bg-amber-400/10 text-amber-300'
            }`}
          >
            {rg.name}: {t('cloud.ratioSumLabel')} {sum}% — {ok ? t('cloud.ratioSumOk') : t('cloud.ratioSumInvalid')}
          </div>
        );
      })}
    </div>
  );
}

/* ── Field primitives ─────────────────────────────────────────────────────── */

function SectionTitle({ icon, title, desc }: { icon?: string; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-glow/20 text-xl">
          {icon}
        </span>
      )}
      <div>
        <h2 className="font-display text-lg font-bold text-white">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
      </div>
    </div>
  );
}

function Field({ field, children }: { field: CloudFieldSchema; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-white/90">{field.label}</label>
      {field.description && <p className="mb-2 text-xs text-muted">{field.description}</p>}
      {children}
    </div>
  );
}

function BooleanRow({
  field,
  value,
  disabled,
  onChange,
}: {
  field: CloudFieldSchema;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-4 transition-colors hover:bg-white/[0.04]">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white/90">{field.label}</div>
        {field.description && <div className="mt-0.5 text-xs text-muted">{field.description}</div>}
      </div>
      <Toggle checked={value} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function FieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: CloudFieldSchema;
  value: unknown;
  disabled: boolean;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case 'number':
      return (
        <NumberInput field={field} value={Number(value ?? 0)} disabled={disabled} onChange={(v) => onChange(v)} />
      );
    case 'slider':
      return (
        <Slider field={field} value={Number(value ?? 0)} disabled={disabled} onChange={(v) => onChange(v)} />
      );
    case 'string':
      return (
        <input
          className="neon-input"
          value={String(value ?? '')}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'select':
      return (
        <SelectInput
          value={String(value ?? '')}
          options={field.options ?? []}
          disabled={disabled}
          onChange={(v) => onChange(v)}
        />
      );
    case 'radio':
      return (
        <RadioGroup
          value={String(value ?? '')}
          options={field.options ?? []}
          disabled={disabled}
          onChange={(v) => onChange(v)}
        />
      );
  }
}

function NumberInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: CloudFieldSchema;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        className="neon-input"
        type="number"
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {field.unit && <span className="shrink-0 text-xs font-semibold text-muted">{field.unit}</span>}
    </div>
  );
}

function Slider({
  field,
  value,
  disabled,
  onChange,
}: {
  field: CloudFieldSchema;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
}) {
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const pct = max > min ? Math.min(100, Math.max(0, Math.round(((value - min) / (max - min)) * 100))) : 0;
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={field.step ?? 1}
        value={value}
        disabled={disabled}
        className="neon-slider"
        style={{ '--fill': `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        type="number"
        className="neon-input w-20 text-center"
        min={min}
        max={max}
        step={field.step ?? 1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {field.unit && <span className="shrink-0 text-xs font-semibold text-muted">{field.unit}</span>}
    </div>
  );
}

function SelectInput({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <select className="neon-input neon-select" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function RadioGroup({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
            value === o
              ? 'bg-gradient-to-r from-primary to-glow text-white shadow-[0_0_10px_rgba(168,85,247,0.25)]'
              : 'border border-white/[0.08] bg-white/[0.03] text-muted hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-200 ${
        checked
          ? 'bg-gradient-to-r from-primary to-glow shadow-[0_0_12px_rgba(168,85,247,0.3)]'
          : 'bg-white/10 ring-1 ring-inset ring-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 ${
          checked ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function SavedModal({
  onClose,
  t,
}: {
  onClose: () => void;
  t: (k: string) => string;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="check-wrap">
          <span className="check-ring" />
          <span className="check-ring r2" />
          <span className="check-ring r3" />
          <div className="check-core">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline className="check-path" points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h3 className="font-display text-xl font-extrabold text-gradient text-glow">{t('cloud.modalTitle')}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">{t('cloud.footerNote')}</p>

        <button ref={closeRef} type="button" className="btn-primary mt-7 w-full" onClick={onClose}>
          {t('cloud.modalClose')}
        </button>
      </div>
    </div>
  );
}
