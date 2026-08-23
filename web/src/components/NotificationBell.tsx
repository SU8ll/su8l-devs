import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useI18n } from '../i18n';

interface NotifRow {
  id: string;
  type: string;
  title: string;
  message: string;
  meta: string;
  read_at: string | null;
  created_at: string;
}

function playNotifSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* silent fail */ }
}

export default function NotificationBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const prevUnread = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchCount = async () => {
    try {
      const d = await api<{ unread: number }>('/api/dashboard/notifications/unread-count');
      if (d.unread > prevUnread.current) playNotifSound();
      prevUnread.current = d.unread;
      setUnread(d.unread);
    } catch { /* ignore */ }
  };

  const fetchAll = async () => {
    try {
      const d = await api<{ notifications: NotifRow[]; unread: number }>('/api/dashboard/notifications');
      if (d.unread > prevUnread.current) playNotifSound();
      prevUnread.current = d.unread;
      setNotifs(d.notifications);
      setUnread(d.unread);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 8000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (open) fetchAll();
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = async (id: string) => {
    await api(`/api/dashboard/notifications/${id}/read`, { method: 'POST' });
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
  };

  const markAll = async () => {
    await api('/api/dashboard/notifications/read-all', { method: 'POST' });
    setNotifs((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted transition-colors hover:bg-white/5 hover:text-white"
        title={t('notif.title')}
      >
        <span className="text-sm">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-glow px-1 text-[9px] font-bold text-black shadow-glow animate-pulse">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-h-96 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0f1a] shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="font-display text-sm font-bold text-white">{t('notif.title')}</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs text-glow hover:underline"
              >
                {t('notif.markAll')}
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted">{t('notif.empty')}</div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => { if (!n.read_at) markRead(n.id); }}
                  className={`flex w-full flex-col gap-0.5 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                    !n.read_at ? 'bg-glow/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold text-white">{n.title}</span>
                    {!n.read_at && <span className="rounded bg-glow px-1.5 py-0.5 text-[8px] font-bold text-black">{t('notif.new')}</span>}
                  </div>
                  <span className="text-xs text-muted">{n.message}</span>
                  <span className="mt-0.5 text-[10px] text-muted/50">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
