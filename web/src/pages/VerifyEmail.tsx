import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api } from '../api';

export default function VerifyEmail() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [logoFailed, setLogoFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setMsg('');
    setLoading(true);
    try {
      const data = await api<{ ok: boolean; token: string }>('/api/auth/verify-email', {
        method: 'POST',
        body: { email, code },
      });
      if (data.ok && data.token) {
        localStorage.setItem('su8l_token', data.token);
        window.location.href = '/dashboard';
      }
    } catch (err: unknown) {
      const apiErr = err as { detail?: { error?: string }; message?: string };
      setFormError(apiErr?.detail?.error || apiErr?.message || t('verify.error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setFormError('');
    setMsg('');
    setResending(true);
    try {
      await api('/api/auth/resend-code', { method: 'POST', body: { email } });
      setMsg(t('verify.resendSuccess'));
    } catch (err: unknown) {
      const apiErr = err as { detail?: { error?: string }; message?: string };
      setFormError(apiErr?.detail?.error || apiErr?.message || t('verify.error.generic'));
    } finally {
      setResending(false);
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
          <h1 className="font-display text-2xl font-extrabold text-gradient">{t('verify.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('verify.subtitle')}</p>
          {email && (
            <p className="mt-1 text-sm font-medium text-glow">{email}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          {formError && (
            <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {formError}
            </div>
          )}
          {msg && (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              {msg}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">{t('verify.codeLabel')}</label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('verify.codePlaceholder')}
              required
              maxLength={6}
              className="neon-input w-full text-center font-mono text-2xl tracking-[0.5em]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="btn-ghost w-full !py-3.5 disabled:opacity-50"
          >
            {loading ? t('verify.verifying') : t('verify.verifyBtn')}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full text-center text-xs text-glow hover:underline disabled:opacity-50"
          >
            {resending ? t('verify.resending') : t('verify.resendBtn')}
          </button>

          <p className="text-center text-xs text-muted">
            {t('verify.hasAccount')}{' '}
            <Link to="/login" className="text-glow hover:underline">
              {t('register.loginLink')}
            </Link>
          </p>
        </form>

        <div className="mt-8 text-center text-xs leading-relaxed text-muted">
          {t('verify.note')}
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