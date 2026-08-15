import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useI18n, useLang, type Lang } from '../i18n';
import { useAuth } from '../AuthContext';

function LangToggle() {
  const { lang, setLang } = useLang();
  const next: Lang = lang === 'en' ? 'ar' : 'en';
  return (
    <button
      type="button"
      className="lang-pill"
      onClick={() => setLang(next)}
      aria-label="Toggle language"
    >
      <span className="inline-flex items-center gap-1">
        {lang === 'en' ? (
          <>
            <span className="text-glow">EN</span>
            <span className="opacity-50">/ AR</span>
          </>
        ) : (
          <>
            <span className="opacity-50">EN /</span>
            <span className="text-glow">AR</span>
          </>
        )}
      </span>
    </button>
  );
}

export default function Navbar() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="glass-strong mt-4 flex items-center justify-between rounded-2xl px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            {logoFailed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-glow shadow-glow">
                <span className="font-display text-sm font-black tracking-tight text-white">SU</span>
              </div>
            ) : (
              <img
                src="/logo.png"
                alt={t('nav.brand')}
                className="h-10 w-10 rounded-xl object-contain"
                onError={() => setLogoFailed(true)}
              />
            )}
            <div className="leading-tight">
              <div className="font-display text-base font-extrabold tracking-wide text-gradient">
                {t('nav.brand')}
              </div>
              <div className="text-[0.68rem] font-medium uppercase tracking-[0.25em] text-muted">
                {t('nav.tagline')}
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/pricing" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {t('nav.pricing')}
            </NavLink>
            <NavLink to="/status" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {t('nav.status')}
            </NavLink>
            <NavLink to="/terms" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {t('nav.terms')}
            </NavLink>
            <NavLink to="/refund" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {t('nav.refund')}
            </NavLink>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LangToggle />
            {user ? (
              <button type="button" className="btn-primary !px-5 !py-2.5" onClick={() => navigate('/dashboard')}>
                {t('nav.dashboard')}
              </button>
            ) : (
              <button type="button" className="btn-primary !px-5 !py-2.5" onClick={() => navigate('/login')}>
                {t('nav.login')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            <LangToggle />
            <button
              type="button"
              className="btn-ghost !px-3 !py-2"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {open ? (
                  <path d="M6 6l12 12M6 18L18 6" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="glass-strong mt-2 rounded-2xl p-4 lg:hidden">
            <div className="flex flex-col gap-3">
              <NavLink to="/" className="nav-link" onClick={() => setOpen(false)}>
                {t('nav.home')}
              </NavLink>
              <NavLink to="/pricing" className="nav-link" onClick={() => setOpen(false)}>
                {t('nav.pricing')}
              </NavLink>
              <NavLink to="/status" className="nav-link" onClick={() => setOpen(false)}>
                {t('nav.status')}
              </NavLink>
              <NavLink to="/terms" className="nav-link" onClick={() => setOpen(false)}>
                {t('nav.terms')}
              </NavLink>
              <NavLink to="/refund" className="nav-link" onClick={() => setOpen(false)}>
                {t('nav.refund')}
              </NavLink>
              <div className="h-px bg-white/10" />
              {user ? (
                <button type="button" className="btn-primary" onClick={() => { setOpen(false); navigate('/dashboard'); }}>
                  {t('nav.dashboard')}
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={() => { setOpen(false); navigate('/login'); }}>
                  {t('nav.login')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
