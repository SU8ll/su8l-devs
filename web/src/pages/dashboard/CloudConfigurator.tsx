import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import {
  api,
  type CloudCategorySchema,
  type CloudConfig,
  type CloudConfigDto,
  type CloudFieldSchema,
  type SaveCloudConfigResponse,
} from '../../api';
import { Kicker, Spinner } from '../../components/ui';

type JsonObject = Record<string, unknown>;

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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedInfo, setSavedInfo] = useState<{ dispatched: boolean; reason?: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const dirty = cfg !== null && JSON.stringify(cfg) !== snapshot;

  useEffect(() => {
    api<CloudConfigDto>('/api/dashboard/cloud-config')
      .then((d) => {
        setData(d);
        setCfg(d.config);
        setSnapshot(JSON.stringify(d.config));
        setActiveKey(d.schema.categories[0]?.id ?? '');
      })
      .catch(() => setError('Failed to load Cloud Configurator'));
  }, []);

  const update = (path: string[], value: unknown) => {
    if (!editing || !cfg) return;
    setCfg((prev) => (prev ? setValue(prev, path, value) : prev));
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
    setSaving(true);
    setSavedInfo(null);
    try {
      const res = await api<SaveCloudConfigResponse>('/api/dashboard/cloud-config', {
        method: 'PUT',
        body: cfg,
      });
      setSnapshot(JSON.stringify(res.config));
      setCfg(res.config);
      setSavedInfo({ dispatched: res.dispatched, reason: res.dispatchReason });
      setEditing(false);
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="text-red-300">{error}</div>;
  if (!data || !cfg) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;

  if (data.locked) {
    return (
      <div className="space-y-6">
        <Header t={t} slotsAvailable={data.slotsAvailable} running={true} />
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
    <div className="space-y-6">
      <Header t={t} slotsAvailable={data.slotsAvailable} running={true} />

      {/* Command-deck lock banner */}
      {editing ? (
        <div className="lock-banner flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
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
        <div className="lock-banner flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
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

      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar — derived from the master schema */}
        <aside className="glass glow-border rounded-3xl p-2 lg:sticky lg:top-24">
          <div className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
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
        <div className="glass-strong rounded-3xl p-8">
          {active && (
            <div className={editing ? '' : 'pointer-events-none select-none opacity-50'}>
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
                  <div className="mt-3 flex flex-col items-center gap-1 sm:items-start">
                    <span className="text-xs text-muted">{t('cloud.dmNote')}</span>
                    {data.discord && (
                      <span className="text-xs text-glow/80">
                        {t('cloud.dmAs')}: {data.discord.username} · {data.discord.id}
                      </span>
                    )}
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
          dispatched={savedInfo?.dispatched ?? false}
          onClose={() => setModalOpen(false)}
          t={t}
        />
      )}
    </div>
  );
}

function Header({ t, slotsAvailable, running }: { t: (k: string) => string; slotsAvailable: number; running: boolean }) {
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
      <div className="mt-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${running ? 'pulse-dot' : 'bg-muted'}`} />
        <span className="text-sm font-semibold text-emerald-300">{t('botpanel.running')}</span>
        <span className="text-xs text-muted">· {t('cloud.slots')}: {slotsAvailable}</span>
      </div>
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
          ? 'bg-gradient-to-r from-primary/25 to-glow/25 ring-1 ring-glow/40'
          : 'hover:bg-white/5'
      }`}
    >
      <span className="text-xl">{category.icon ?? '⚙️'}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{category.title}</span>
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
}: {
  category: CloudCategorySchema;
  path: string[];
  cfg: CloudConfig;
  disabled: boolean;
  onChange: (path: string[], value: unknown) => void;
}) {
  const booleans = (category.fields ?? []).filter((f) => f.type === 'boolean');
  const others = (category.fields ?? []).filter((f) => f.type !== 'boolean');

  return (
    <div className="space-y-6">
      <SectionTitle icon={category.icon} title={category.title} desc={category.description} />

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

      {category.groups?.map((g) => (
        <div key={g.id} className="rounded-2xl border border-glow/20 bg-gradient-to-br from-glow/[0.06] to-transparent p-6">
          <SectionTitle icon={g.icon} title={g.title} desc={g.description} />
          <div className="mt-5">
            <CategoryPanel category={g} path={[...path, g.id]} cfg={cfg} disabled={disabled} onChange={onChange} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Field primitives ─────────────────────────────────────────────────────── */

function SectionTitle({ icon, title, desc }: { icon?: string; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-glow/30 text-xl">
          {icon}
        </span>
      )}
      <div>
        <h2 className="font-display text-lg font-bold text-gradient">{title}</h2>
        {desc && <p className="mt-0.5 text-sm text-muted">{desc}</p>}
      </div>
    </div>
  );
}

function Field({ field, children }: { field: CloudFieldSchema; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">{field.label}</label>
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
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold">{field.label}</div>
        {field.description && <div className="text-xs text-muted">{field.description}</div>}
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
      return field.slider ? (
        <Slider field={field} value={Number(value ?? 0)} disabled={disabled} onChange={(v) => onChange(v)} />
      ) : (
        <NumberInput field={field} value={Number(value ?? 0)} disabled={disabled} onChange={(v) => onChange(v)} />
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
    <div className="flex items-center gap-4">
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
      <span className="w-24 shrink-0 rounded-lg border border-glow/30 bg-glow/10 px-2 py-1 text-center font-mono text-sm font-bold text-glow">
        {value}{field.unit ? ` ${field.unit}` : ''}
      </span>
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
              ? 'bg-gradient-to-r from-primary to-glow text-white shadow-glow'
              : 'border border-white/10 bg-white/5 text-muted hover:text-white'
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
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-gradient-to-r from-primary to-glow shadow-glow' : 'bg-white/10'}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${checked ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'}`}
      />
    </button>
  );
}

function SavedModal({
  dispatched,
  onClose,
  t,
}: {
  dispatched: boolean;
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
        <p className="mt-3 text-sm leading-relaxed text-muted">{t('cloud.modalNote')}</p>

        {dispatched ? (
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300">
            <span className="pulse-dot" />
            {t('cloud.modalDiscord')}
          </span>
        ) : (
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
            {t('cloud.dmFailed')}
          </span>
        )}

        <button ref={closeRef} type="button" className="btn-primary mt-7 w-full" onClick={onClose}>
          {t('cloud.modalClose')}
        </button>
      </div>
    </div>
  );
}
