import { useI18n, type Lang } from '../i18n';

const LANGS: { code: Lang; label: string; flag: string; native: string }[] = [
  { code: 'en', label: 'EN', flag: '🇬🇧', native: 'English' },
  { code: 'ar', label: 'AR', flag: '🇸🇦', native: 'العربية' },
  { code: 'fr', label: 'FR', flag: '🇫🇷', native: 'Français' },
  { code: 'de', label: 'DE', flag: '🇩🇪', native: 'Deutsch' },
  { code: 'tr', label: 'TR', flag: '🇹🇷', native: 'Türkçe' },
];

export function CloudLangSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <div className="bs-lang-switcher" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          aria-pressed={lang === l.code}
          title={l.native}
          onClick={() => setLang(l.code)}
          className={`bs-lang-pill ${lang === l.code ? 'active' : ''}`}
        >
          <span className="bs-lang-flag" aria-hidden>{l.flag}</span>
          <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}
