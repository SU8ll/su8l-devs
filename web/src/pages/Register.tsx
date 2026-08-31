import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api } from '../api';

export default function Register() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const refCode = params.get('ref') ?? undefined;
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password !== confirmPassword) {
      setFormError(t('register.error.passwordMismatch'));
      return;
    }
    if (password.length < 6) {
      setFormError(t('register.error.passwordShort'));
      return;
    }
    if (username.length < 3 || username.length > 32) {
      setFormError(t('register.error.usernameLength'));
      return;
    }

    setLoading(true);
    try {
      const data = await api<{ ok: boolean; userId: string }>('/api/auth/register', {
        method: 'POST',
        body: { email, username, password, ref: refCode },
      });
      if (data.ok) {
        window.location.href = '/login?registered=1';
      }
    } catch (err: unknown) {
      const apiErr = err as { detail?: { error?: string }; message?: string };
      setFormError(apiErr?.detail?.error || apiErr?.message || 'Registration failed');
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
          <h1 className="font-display text-2xl font-extrabold text-gradient">{t('register.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          {formError && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {formError}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">{t('register.emailLabel')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('register.emailPlaceholder')}
              required
              className="neon-input w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">{t('register.usernameLabel')}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('register.usernamePlaceholder')}
              required
              minLength={3}
              maxLength={32}
              className="neon-input w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">{t('register.passwordLabel')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('register.passwordPlaceholder')}
              required
              minLength={6}
              className="neon-input w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">{t('register.confirmPasswordLabel')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('register.confirmPasswordPlaceholder')}
              required
              minLength={6}
              className="neon-input w-full"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-ghost w-full !py-3.5 disabled:opacity-50"
          >
            {loading ? t('register.creating') : t('register.createBtn')}
          </button>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-300">
            <strong className="block mb-1">{t('register.warning.title')}</strong>
            {t('register.warning.body')}
          </div>

          <p className="text-center text-xs text-muted">
            {t('register.hasAccount')}{' '}
            <Link to="/login" className="text-glow hover:underline">
              {t('register.loginLink')}
            </Link>
          </p>
        </form>

        <div className="mt-8 text-center text-xs leading-relaxed text-muted">
          {t('login.securedNote')}
        </div>
      </div>
      <div className="mt-6 text-center text-xs text-muted">
        <a href="/terms" className="nav-link underline decoration-glow/40 underline-offset-4">{t('nav.terms')}</a>
        {' · '}
        <a href="/refund" className="nav-link underline decoration-glow/40 underline-offset-4">{t('refund.title')}</a>
      </div>
    </div>
  );
}
