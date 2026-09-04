import { useEffect, useRef, useState } from 'react';
import { HEROES, HERO_BY_ID, starsLabel } from '../lib/heroes';

function heroEmptyLabel(fieldKey: string): string {
  if (fieldKey.startsWith('bear_leader_')) return '— Today\'s best-per-army-type auto-pick';
  return '— Best buff (auto)';
}

export function HeroSelect({
  fieldKey,
  value,
  disabled,
  onChange,
}: {
  fieldKey: string;
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hero = HERO_BY_ID.get(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const emptyLabel = heroEmptyLabel(fieldKey);

  return (
    <div className="bs-hero-select-wrap" ref={wrapRef}>
      <button
        type="button"
        className="bs-hero-select"
        disabled={disabled}
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        {hero ? (
          <>
            <img className="bs-hero-select-portrait" src={hero.portrait} alt={hero.name} width={28} height={28} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
            <span className="bs-hero-name">{hero.name}</span>
            <span className="bs-hero-stars">{starsLabel(hero.stars)}</span>
          </>
        ) : (
          <span className="bs-hero-empty">{emptyLabel}</span>
        )}
        <span className="bs-hero-chevron" aria-hidden>{open ? '▲' : '▼'}</span>
      </button>

      {open && !disabled && (
        <div className="bs-hero-dropdown" role="listbox">
          {/* Empty / auto option first */}
          <div
            key="__empty"
            role="option"
            aria-selected={value === ''}
            className={`bs-hero-option ${value === '' ? 'selected' : ''}`}
            onClick={() => { onChange(''); setOpen(false); }}
          >
            <span className="bs-hero-empty-icon">✦</span>
            <span className="bs-hero-name" style={{ fontStyle: 'italic', color: 'var(--bs-text-2)' }}>{emptyLabel}</span>
          </div>
          <div className="bs-hero-dropdown-sep" />
          {HEROES.map((h) => {
            const sel = value === h.id;
            return (
              <div
                key={h.id}
                role="option"
                aria-selected={sel}
                className={`bs-hero-option ${sel ? 'selected' : ''}`}
                onClick={() => { onChange(h.id); setOpen(false); }}
              >
                <img src={h.portrait} alt={h.name} width={32} height={32} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                <span className="bs-hero-name">{h.name}</span>
                <span className="bs-hero-stars">{starsLabel(h.stars)}</span>
                <span className="bs-hero-meta">{h.rarity} · Gen {h.gen} · {h.clazz}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function isHeroFieldKey(key: string): boolean {
  return key.startsWith('bear_joiner_') || key.startsWith('bear_leader_');
}
