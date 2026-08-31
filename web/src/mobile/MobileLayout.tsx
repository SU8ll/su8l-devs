import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export interface MobileNavItem {
  to: string;
  label: string;
  icon: string;
  primary?: boolean;
  badge?: number;
  end?: boolean;
}

/**
 * Dedicated mobile shell: slim sticky top bar + a 5-slot bottom navigation,
 * app-like and calm. Only ever rendered on phones (see App.tsx routing).
 */
export default function MobileLayout({
  title,
  subtitle,
  items,
  onAvatar,
  onHome,
  children,
}: {
  title: string;
  subtitle?: string;
  items: MobileNavItem[];
  onAvatar?: () => void;
  onHome?: () => void;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = items.slice(0, 5);

  return (
    <div className="m-shell">
      {/* Top app bar */}
      <header className="m-topbar">
        {onAvatar && (
          <button type="button" onClick={onAvatar} className="m-topbar-icon-btn" aria-label="avatar" style={{ width: 40 }}>
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-glow text-xs font-black text-white">
                {user?.username?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </button>
        )}
        <div className="m-topbar-title">
          <div className="truncate">{title}</div>
          {subtitle && <div className="truncate text-[0.72rem] font-medium text-muted">{subtitle}</div>}
        </div>
        {onHome && (
          <button type="button" onClick={onHome} className="m-topbar-icon-btn" aria-label="home">⌂</button>
        )}
        <button
          type="button"
          onClick={async () => { await logout(); navigate('/'); }}
          className="m-topbar-icon-btn"
          aria-label="logout"
        >
          ⎋
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pt-3" style={{ paddingBottom: '1.5rem' }}>
        {children}
      </main>

      {/* Bottom navigation — max 5 items */}
      <nav className="m-tabbar" aria-label="Primary">
        <div className="m-tabbar-inner">
          {navItems.map((l, i) => {
            const isMiddle = navItems.length === 5 && i === 2;
            const cls = `m-tab ${l.primary || isMiddle ? 'primary' : ''}`;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `${cls} ${isActive ? 'active' : ''}`}
              >
                <span className="m-tab-ic">{l.icon}</span>
                <span>{l.label}</span>
                {l.badge != null && l.badge > 0 && <span className="m-tab-badge">{l.badge > 99 ? '99+' : l.badge}</span>}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
