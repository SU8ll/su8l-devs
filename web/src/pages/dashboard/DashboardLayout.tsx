import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAuth } from '../../AuthContext';
import AvatarPicker from '../../components/AvatarPicker';

export default function DashboardLayout() {
  const { t } = useI18n();
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const onReply = () => setUnread((n) => n + 1);
    window.addEventListener('su8l:staff-reply', onReply);
    return () => window.removeEventListener('su8l:staff-reply', onReply);
  }, []);

  useEffect(() => {
    if (location.pathname.startsWith('/dashboard/tickets')) setUnread(0);
  }, [location.pathname]);

  const links = [
    { to: '/dashboard', label: t('dash.overview'), icon: '◉', end: true },
    { to: '/dashboard/bot', label: t('dash.cloudConfig'), icon: '⬢', end: false },
    { to: '/dashboard/status', label: t('dash.status'), icon: '◈', end: false },
    { to: '/dashboard/tickets', label: t('dash.tickets'), icon: '▤', end: false },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:pt-20">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass-strong rounded-3xl p-5">
            <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-5">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="relative shrink-0 rounded-full transition-opacity hover:opacity-80"
                title={t('dash.changeAvatar')}
              >
                {user?.avatar ? (
                  <img src={user.avatar} alt="" className="avatar-glow h-11 w-11 object-cover" />
                ) : (
                  <div className="avatar-glow flex h-11 w-11 items-center justify-center bg-gradient-to-br from-primary to-glow font-display text-sm font-black text-white">
                    {user?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-glow text-[10px] text-white shadow">
                  ✎
                </span>
              </button>
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-bold">{user?.username}</div>
                <div className="text-xs text-muted">{user?.email ?? 'operator'}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="mb-2 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-muted transition-all hover:bg-white/5 hover:text-white"
            >
              <span className="text-glow">⌂</span>
              {t('nav.home')}
            </button>

            <nav className="flex flex-col gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-primary/40 to-glow/30 text-white shadow-glow'
                        : 'text-muted hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <span className="text-glow">{l.icon}</span>
                  <span className="flex-1">{l.label}</span>
                  {l.to === '/dashboard/tickets' && unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-glow px-1.5 text-[11px] font-bold text-black shadow-glow">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="mt-5 border-t border-white/10 pt-5">
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-muted transition-colors hover:bg-white/5 hover:text-red-300"
                onClick={async () => {
                  await logout();
                  navigate('/');
                }}
              >
                <span>⎋</span>
                {t('nav.logout')}
              </button>
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0">
          <Outlet context={{ openAvatarPicker: () => setPickerOpen(true) }} />
        </div>
      </div>

      <AvatarPicker open={pickerOpen} current={user?.avatar ?? null} onClose={() => setPickerOpen(false)} onSaved={() => void refresh()} />
    </div>
  );
}
