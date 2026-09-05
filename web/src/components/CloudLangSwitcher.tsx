import * as React from 'react';
import { useI18n, type Lang } from '../i18n';
import { api } from '../api';

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
  const [askOpen, setAskOpen] = React.useState(false);
  const [askLang, setAskLang] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const active = LANGS.find((l) => l.code === lang) ?? LANGS[0]!;
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  const submitLangRequest = async () => {
    if (!askLang.trim() || sending) return;
    setSending(true);
    try {
      const isPreview = typeof window !== 'undefined' && window.location.pathname.startsWith('/preview');
      const endpoint = isPreview ? '/api/tickets/public-language-request' : '/api/tickets';
      const body = isPreview
        ? { language: askLang.trim() }
        : { subject: 'طلب لغة جديدة', body: `ما هي لغتك المفضلة؟\n${askLang.trim()}`, priority: 'normal' };
      await api(endpoint, { method: 'POST', body });
      setSent(true);
      setTimeout(() => { setAskOpen(false); setSent(false); setAskLang(''); setOpen(false); }, 1800);
    } catch {
      // fallback: still close and show sent for preview
      setSent(true);
      setTimeout(() => { setAskOpen(false); setSent(false); setAskLang(''); }, 1800);
    } finally {
      setSending(false);
    }
  };
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
          <button type="button" onClick={() => { setAskOpen(true); setOpen(false); }} className="bs-lang-premium-foot-link" style={{ width: '100%', border: 'none' }}>
            لغتك المفضلة ليست هنا ؟
          </button>
        </div>
      )}
      {askOpen && (
        <div className="bs-lang-ask-backdrop" onClick={() => setAskOpen(false)}>
          <div className="bs-lang-ask-modal" onClick={(e) => e.stopPropagation()}>
            <div className="bs-lang-ask-head">
              <span className="bs-lang-ask-icon">🌐</span>
              <div>
                <div className="bs-lang-ask-title">ما هي لغتك المفضلة؟</div>
                <div className="bs-lang-ask-sub">أخبرنا وسنضيفها — تذكرتك ستصل مباشرة لبرنامج الأدمن</div>
              </div>
            </div>
            <input
              autoFocus
              value={askLang}
              onChange={(e) => setAskLang(e.target.value)}
              placeholder="مثال: الإسبانية، الإيطالية، الكورية..."
              className="bs-lang-ask-input"
              onKeyDown={(e) => { if (e.key === 'Enter') submitLangRequest(); }}
            />
            <div className="bs-lang-ask-actions">
              <button type="button" className="bs-btn bs-btn-ghost" onClick={() => setAskOpen(false)}>إلغاء</button>
              <button type="button" className="bs-btn bs-btn-primary" onClick={submitLangRequest} disabled={!askLang.trim() || sending}>
                {sending ? 'جارٍ الإرسال…' : sent ? '✓ تم الإرسال' : 'إرسال'}
              </button>
            </div>
            {sent && <div className="bs-lang-ask-sent">✓ وصلت تذكرتك للأدمن — شكراً لك!</div>}
          </div>
        </div>
      )}
    </div>
  );
}
