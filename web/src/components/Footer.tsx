import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

export default function Footer() {
  const { t } = useI18n();
  const [logoFailed, setLogoFailed] = useState(false);
  return (
    <footer className="mt-auto border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              {logoFailed ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-glow shadow-glow">
                  <span className="font-display text-xs font-black text-white">SU</span>
                </div>
              ) : (
                <img
                  src="/logo.png"
                  alt={t('nav.brand')}
                  className="h-10 w-10 rounded-xl object-contain"
                  onError={() => setLogoFailed(true)}
                />
              )}
              <span className="font-display text-base font-extrabold text-gradient">SU8L DEVs</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{t('footer.tagline')}</p>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-glow">{t('footer.legal')}</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/terms" className="nav-link">
                {t('nav.terms')}
              </Link>
              <Link to="/refund" className="nav-link">
                {t('nav.refund')}
              </Link>
            </div>
          </div>
          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-glow">{t('footer.resources')}</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/status" className="nav-link">
                {t('nav.status')}
              </Link>
              <Link to="/dashboard" className="nav-link">
                {t('footer.tickets')}
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-muted sm:flex-row">
          <span>
            © {new Date().getFullYear()} SU8L DEVs. {t('footer.rights')}
          </span>
          <span className="font-mono text-glow/70">su8ldevs.eu.cc</span>
        </div>
      </div>
    </footer>
  );
}
