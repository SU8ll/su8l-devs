import * as React from 'react';
import { useI18n, type Lang } from '../i18n';

const LANGS: { code: Lang; label: string; flag: string; native: string }[] = [
  { code: 'en', label: 'EN', flag: '🇬🇧', native: 'English' },
  { code: 'ar', label: 'AR', flag: '🇸🇦', native: 'العربية' },
  { code: 'fr', label: 'FR', flag: '🇫🇷', native: 'Français' },
  { code: 'de', label: 'DE', flag: '🇩🇪', native: 'Deutsch' },
  { code: 'tr', label: 'TR', flag: '🇹🇷', native: 'Türkçe' },
];

export function CloudLangSwitcher({ variant = 'panel' }: { variant?: 'panel' | 'navbar' }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const active = LANGS.find((l) => l.code === lang) ?? LANGS[0]!;
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);
  return (
    <div ref={ref} className={`bs-lang-premium-wrap ${variant}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={`bs-lang-premium-trigger ${open ? 'open' : ''}`}
      >
        <span className="bs-lang-globe" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>
        </span>
        <span className="bs-lang-flag" aria-hidden>{active.flag}</span>
        <span className="bs-lang-label">{active.label}</span>
        <span className="bs-lang-native">{active.native}</span>
        <span className={`bs-lang-caret ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="bs-lang-premium-menu" role="menu">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              role="menuitemradio"
              aria-checked={lang === l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`bs-lang-premium-item ${lang === l.code ? 'active' : ''}`}
            >
              <span className="bs-lang-flag lg" aria-hidden>{l.flag}</span>
              <span className="bs-lang-item-main">
                <span className="bs-lang-item-label">{l.label} — {l.native}</span>
                <span className="bs-lang-item-sub">{l.code === 'ar' ? 'العربية' : l.code === 'fr' ? 'Français · KINGSHOT' : l.code === 'de' ? 'Deutsch · KINGSHOT' : l.code === 'tr' ? 'Türkçe · KINGSHOT' : 'English · Global'}</span>
              </span>
              {lang === l.code && <span className="bs-lang-check">✓</span>}
            </button>
          ))}
          <div className="bs-lang-premium-foot">5 languages · KINGSHOT official event names</div>
        </div>
      )}
    </div>
  );
}
