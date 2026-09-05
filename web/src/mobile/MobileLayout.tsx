import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { CloudLangSwitcher } from '../components/CloudLangSwitcher';

export interface MobileNavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  badge?: number;
}

function IconWrap({ children }: { children: ReactNode }) {
  return <span className="m-tab-ic">{children}</span>;
}

function LangToggle() {
  return <CloudLangSwitcher variant="navbar" />;
}

export const MIcons = {
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/></svg>
  ),
  cloud: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 10a4 4 0 0 0-3-1 4 4 0 0 0-8 1 3 3 0 0 0 0 6h11a3 3 0 0 0 0-6Z"/><path d="M12 16v4"/><path d="M9 19h6"/></svg>
  ),
  bot: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2.8 4.2 7v10L12 21.2 19.8 17V7L12 2.8Z"/><path d="M12 11.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/><path d="M8.5 9 12 11.5 15.5 9"/></svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 9h8"/><path d="M8 13h5"/><path d="M18 7a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H8l-4 3V10a3 3 0 0 1 3-3h11Z"/></svg>
  ),
  rewards: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="3.2"/><path d="M16 8h.6a2 2 0 0 1 2 2v1"/><path d="M19 11h-3"/><path d="M17.5 9.5v3"/></svg>
  ),
  tickets: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 7h12"/><path d="M6 11h12"/><path d="M6 15h12"/><path d="M6 19h12"/><rect x="3" y="4" width="18" height="16" rx="2.2"/></svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 10 12 4l7 6v8a1 1 0 0 1-1 1h-4v-5H10v5H6a1 1 0 0 1-1-1v-8Z"/></svg>
  ),
  pricing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2 20 12 12 22 4 12 12 2Z"/></svg>
  ),
  status: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>
  ),
  terms: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>
  ),
  login: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17 15 12 10 7"/><path d="M15 12H3"/></svg>
  ),
};

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
  const [logoFailed, setLogoFailed] = useState(false);
  const navItems = items.slice(0, 5);

  return (
    <div className="m-shell">
      <header className="m-topbar">
        {onAvatar ? (
          <button type="button" onClick={onAvatar} className="m-topbar-avatar" aria-label="profile">
            {user?.avatar ? <img src={user.avatar} alt="" /> : <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%',background:'linear-gradient(135deg,#7C3AED,#A78BFA)',color:'#fff',fontWeight:800,fontSize:13}}>{user?.username?.[0]?.toUpperCase() ?? 'S'}</span>}
          </button>
        ) : logoFailed ? (
          <div className="m-topbar-avatar" style={{display:'flex',alignItems:'center',justifyContent:'center',background:'#1A1A22',color:'#fff',fontWeight:900,letterSpacing:'-0.04em',fontSize:13}}>SU</div>
        ) : (
          <img src="/logo.png" alt="SU8L" className="m-topbar-avatar" style={{objectFit:'contain', background:'#0E0E12'}} onError={()=>setLogoFailed(true)} />
        )}
        <div className="m-topbar-title">
          <div className="m-topbar-title-main">{title}</div>
          {subtitle && <div className="m-topbar-title-sub">{subtitle}</div>}
        </div>
        <LangToggle />
        {onHome && (
          <button type="button" onClick={onHome} className="m-topbar-icon-btn" aria-label="home" style={{borderColor: 'rgba(255,255,255,0.09)'}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 10 12 4l7 6v8a1 1 0 0 1-1 1h-4v-5H10v5H6a1 1 0 0 1-1-1v-8Z"/></svg>
          </button>
        )}
        {user && (
          <button type="button" onClick={async () => { if(window.confirm('تسجيل خروج؟')){ await logout(); navigate('/'); } }} className="m-topbar-icon-btn" aria-label="logout" style={{opacity:0.92}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17 15 12 10 7"/><path d="M15 12H3"/></svg>
          </button>
        )}
      </header>

      <main style={{padding:'16px', flex:1}}>{children}</main>

      <nav className="m-tabbar" aria-label="Primary">
        <div className="m-tabbar-inner">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `m-tab ${isActive ? 'active' : ''}`}>
              <IconWrap>{item.icon}</IconWrap>
              <span className="m-tab-label">{item.label}</span>
              {item.badge != null && item.badge > 0 && <span className="m-tab-badge">{item.badge > 99 ? '99+' : item.badge}</span>}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
