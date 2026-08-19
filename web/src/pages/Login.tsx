import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api, apiUrl } from '../api';

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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    brand: '#4285F4',
  },
  {
    key: 'facebook',
    labelKey: 'login.facebook',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
      </svg>
    ),
    brand: '#1877F2',
  },
];

export default function Login() {
  const { t } = useI18n();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const error = params.get('error');
  const from = (location.state as { from?: string } | null)?.from;

  const [msg, setMsg] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);
  const [mode, setMode] = useState<'oauth' | 'email'>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (error) setMsg(t(`login.error.${error}`) ?? t('login.error.oauth_failed'));
  }, [error, t]);

  const providerAvailable = (key: string) => {
    const srv = (import.meta.env.VITE_PROVIDERS as string | undefined) || 'discord,google,facebook';
    return srv.split(',').map((s) => s.trim()).includes(key);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);
    try {
      const data = await api<{ ok: boolean; token: string }>('/api/auth/login', {
        method: 'POST',
        body: { identifier, password },
      });
      if (data.ok && data.token) {
        localStorage.setItem('su8l_token', data.token);
        window.location.href = '/dashboard';
      }
    } catch (err: unknown) {
      const apiErr = err as { detail?: { error?: string }; message?: string };
      setFormError(apiErr?.detail?.error || apiErr?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 pb-20">
      <div className="glass-strong glow-border fade-up w-full rounded-3xl p-8 sm:p-10">
        <div className="text-center">
          {logoFailed ? (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-glow shadow-glow">
              <span className="font-display text-lg font-black text-white">SU</span>
            </div>
          ) : (
            <img
              src="/logo.png"
              alt={t('nav.brand')}
              className="mx-auto mb-4 h-12 w-12 rounded-2xl object-contain"
              onError={() => setLogoFailed(true)}
            />
          )}
          <h1 className="font-display text-2xl font-extrabold text-gradient">{t('login.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('login.subtitle')}</p>
        </div>

        {msg && (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {msg}
          </div>
        )}

        {/* Mode toggle */}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
              mode === 'email'
                ? 'bg-glow/20 text-glow border border-glow/30'
                : 'bg-white/5 text-muted border border-white/10 hover:bg-white/10'
            }`}
            onClick={() => { setMode('email'); setFormError(''); }}
          >
            {t('login.emailMode')}
          </button>
          <button
            type="button"
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
              mode === 'oauth'
                ? 'bg-glow/20 text-glow border border-glow/30'
                : 'bg-white/5 text-muted border border-white/10 hover:bg-white/10'
            }`}
            onClick={() => { setMode('oauth'); setFormError(''); }}
          >
            {t('login.socialMode')}
          </button>
        </div>

        {mode === 'email' ? (
          <form onSubmit={handleEmailLogin} className="mt-6 flex flex-col gap-4">
            {formError && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {formError}
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">{t('login.identifierLabel')}</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t('login.identifierPlaceholder')}
                required
                className="neon-input w-full"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">{t('login.passwordLabel')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                required
                className="neon-input w-full"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-ghost w-full !py-3.5 disabled:opacity-50"
            >
              {loading ? t('login.loggingIn') : t('login.loginBtn')}
            </button>
            <p className="text-center text-xs text-muted">
              {t('login.noAccount')}{' '}
              <Link to="/register" className="text-glow hover:underline">
                {t('login.registerLink')}
              </Link>
            </p>
          </form>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {PROVIDERS.map((p) =>
              providerAvailable(p.key) ? (
                <button
                  key={p.key}
                  type="button"
                  className="btn-ghost w-full !py-3.5"
                  onClick={() => {
                    window.location.href = apiUrl(`/api/auth/${p.key}`);
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
        )}

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
