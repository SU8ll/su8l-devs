import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';

const PROVIDERS = [
  {
    key: 'discord',
    labelKey: 'login.discord',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.3 4.4A19.8 19.8 0 0 0 15.9 3l-.4.9a13.4 13.4 0 0 0-7 0L8.1 3a19.8 19.8 0 0 0-4.4 1.5C1.2 8.2.4 11.8.8 15.4A20 20 0 0 0 6.6 18l.9-1.5a8 8 0 0 1-1.4-.7l.3-.2a14.2 14.2 0 0 0 12.4 0l.3.2c-.4.3-.9.6-1.4.7l.9 1.5a19.8 19.8 0 0 0 5.8-2.6c.4-4.2-.7-7.8-2.1-11.2zM8.7 13.1c-.9 0-1.7-.9-1.7-2s.8-2 1.7-2 1.7.9 1.7 2-.8 2-1.7 2zm6.6 0c-.9 0-1.7-.9-1.7-2s.8-2 1.7-2 1.7.9 1.7 2-.8 2-1.7 2z" />
      </svg>
    ),
    brand: '#5865F2',
  },
  {
    key: 'google',
    labelKey: 'login.google',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.4H12v4.5h5.9a5.4 5.4 0 0 1-2.3 3.6v3h3.7c2.2-2 3.3-5 3.3-8.7z" />
        <path fill="#34A853" d="M12 23c3.2 0 5.8-1.1 7.7-2.9l-3.7-3a7 7 0 0 1-10.5-3.7H1.7v3A12 12 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.5 13.4a7.2 7.2 0 0 1 0-4.6v-3H1.7a12 12 0 0 0 0 10.6l3.8-3z" />
        <path fill="#EA4335" d="M12 5.1c1.8 0 3.3.6 4.6 1.8l3.3-3.3A12 12 0 0 0 1.7 5.8l3.8 3A7.2 7.2 0 0 1 12 5.1z" />
      </svg>
    ),
  },
  {
    key: 'facebook',
    labelKey: 'login.facebook',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" />
      </svg>
    ),
  },
];

export default function Login() {
  const { t } = useI18n();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const error = params.get('error');
  const from = (location.state as { from?: string } | null)?.from;

  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (error) setMsg(t(`login.error.${error}`) ?? t('login.error.oauth_failed'));
  }, [error, t]);

  const providerAvailable = (key: string) => {
    const srv = (import.meta.env.VITE_PROVIDERS as string | undefined) || 'discord';
    return srv.split(',').map((s) => s.trim()).includes(key);
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 pb-20">
      <div className="glass-strong glow-border fade-up w-full rounded-3xl p-8 sm:p-10">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-glow shadow-glow">
            <span className="font-display text-lg font-black text-white">SU</span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-gradient">{t('login.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('login.subtitle')}</p>
        </div>

        {msg && (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {msg}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {PROVIDERS.map((p) =>
            providerAvailable(p.key) ? (
              <button
                key={p.key}
                type="button"
                className="btn-ghost w-full !py-3.5"
                onClick={() => {
                  window.location.href = `/api/auth/${p.key}`;
                }}
              >
                <span style={{ color: p.brand }}>{p.icon}</span>
                {t(p.labelKey)}
              </button>
            ) : (
              <button key={p.key} type="button" className="btn-ghost w-full !py-3.5 opacity-40" disabled title={t('login.error.provider')}>
                {p.icon}
                {t(p.labelKey)}
              </button>
            )
          )}
        </div>

        <div className="mt-8 text-center text-xs leading-relaxed text-muted">
          {t('login.securedNote')}
        </div>
        {from && from !== '/' && (
          <div className="mt-4 text-center text-xs text-muted">
            {t('login.returnTo')} <span className="font-mono text-glow/70">{from}</span>
          </div>
        )}
      </div>
      <div className="mt-6 text-center text-xs text-muted">
        <a href="/terms" className="nav-link underline decoration-glow/40 underline-offset-4">{t('nav.terms')}</a>
        {' · '}
        <a href="/refund" className="nav-link underline decoration-glow/40 underline-offset-4">{t('refund.title')}</a>
      </div>
    </div>
  );
}
