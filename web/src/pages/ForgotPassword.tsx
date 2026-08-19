import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api } from '../api';

type Step = 'request' | 'reset' | 'done';

export default function ForgotPassword() {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [recovered, setRecovered] = useState<{ email: string; username: string } | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setMsg('');
    setLoading(true);
    try {
      await api('/api/auth/forgot', { method: 'POST', body: { identifier } });
      setStep('reset');
      setMsg(t('forgot.codeSent'));
    } catch (err: unknown) {
      const apiErr = err as { detail?: { error?: string }; message?: string };
      setFormError(apiErr?.detail?.error || apiErr?.message || t('forgot.error.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setMsg('');
    if (newPassword !== confirmPassword) {
      setFormError(t('forgot.error.passwordMismatch'));
      return;
    }
    if (newPassword.length < 6) {
      setFormError(t('forgot.error.passwordShort'));
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ ok: boolean; email: string; username: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: { identifier, code, newPassword },
      });
      if (data.ok) {
        setRecovered({ email: data.email, username: data.username });
        setStep('done');
      }
    } catch (err: unknown) {
      const apiErr = err as { detail?: { error?: string }; message?: string };
      setFormError(apiErr?.detail?.error || apiErr?.message || t('forgot.error.generic'));
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
          <h1 className="font-display text-2xl font-extrabold text-gradient">{t('forgot.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('forgot.subtitle')}</p>
        </div>

        {step === 'request' && (
          <form onSubmit={handleRequest} className="mt-8 flex flex-col gap-4">
            {formError && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{formError}</div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">{t('forgot.identifierLabel')}</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={t('forgot.identifierPlaceholder')}
                required
                className="neon-input w-full"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-ghost w-full !py-3.5 disabled:opacity-50">
              {loading ? t('forgot.sending') : t('forgot.sendBtn')}
            </button>
            <p className="text-center text-xs text-muted">
              {t('forgot.remembered')}{' '}
              <Link to="/login" className="text-glow hover:underline">{t('register.loginLink')}</Link>
            </p>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="mt-8 flex flex-col gap-4">
            {msg && (
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">{msg}</div>
            )}
            {formError && (
              <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{formError}</div>
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
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">{t('register.passwordLabel')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
            <button type="submit" disabled={loading} className="btn-ghost w-full !py-3.5 disabled:opacity-50">
              {loading ? t('forgot.resetting') : t('forgot.resetBtn')}
            </button>
            <p className="text-center text-xs text-muted">
              <Link to="/forgot" className="text-glow hover:underline">{t('forgot.backLink')}</Link>
            </p>
          </form>
        )}

        {step === 'done' && recovered && (
          <div className="mt-8 flex flex-col gap-4">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">{t('forgot.success')}</div>
            <div className="box bg-[#1e293b] rounded-xl p-4 border border-slate-700">
              <p className="text-xs text-muted mb-1">{t('forgot.yourUsername')}</p>
              <p className="text-sm font-semibold text-white break-all">{recovered.username}</p>
              <p className="text-xs text-muted mt-3 mb-1">{t('forgot.yourEmail')}</p>
              <p className="text-sm font-semibold text-white break-all">{recovered.email}</p>
            </div>
            <Link to="/login" className="btn-ghost w-full !py-3.5 text-center">{t('register.loginLink')}</Link>
          </div>
        )}

        <div className="mt-8 text-center text-xs leading-relaxed text-muted">
          {t('forgot.note')}
        </div>
      </div>
    </div>
  );
}