import { useEffect, useRef } from 'react';
import { api, apiUrl } from '../../api';
import { useI18n } from '../../i18n';

interface TicketListItem {
  id: number;
  subject: string;
  messages_count?: number;
  last_message_author?: string | null;
}

interface TicketStreamEvent {
  type: 'new' | 'message' | 'status' | 'deleted';
  ticketId?: number;
  userId?: string;
  author?: 'user' | 'staff';
  subject?: string;
  status?: string;
}

let audioCtx: AudioContext | null = null;

function ensureAudioCtx(): AudioContext | null {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === 'suspended') void audioCtx.resume().catch(() => {});
  return audioCtx;
}

function beep(): void {
  try {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const play = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.05);
    };
    play(880, 0, 0.12);
    play(1318, 0.14, 0.18);
  } catch {}
}

function notify(title: string, body: string, ticketId: number): void {
  beep();
  showToast(title, body);
  window.dispatchEvent(new CustomEvent('su8l:staff-reply', { detail: { ticketId } }));
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, silent: true });
    }
  } catch {}
}

let toastTimer: number | undefined;
function showToast(title: string, body: string): void {
  try {
    const root = document.getElementById('root');
    if (!root) return;
    let el = document.getElementById('ntf-toast') as HTMLDivElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'ntf-toast';
      el.style.cssText = [
        'position:fixed',
        'bottom:20px',
        'right:20px',
        'z-index:9999',
        'max-width:340px',
        'padding:12px 16px',
        'border-radius:12px',
        'background:#1c1c22',
        'border:1px solid #2e2e38',
        'box-shadow:0 8px 24px rgba(0,0,0,0.45)',
        'font:13px/1.5 system-ui,Segoe UI,Arial,sans-serif',
        'color:#eee',
        'cursor:pointer',
        'transition:opacity .25s ease,transform .25s ease',
      ].join(';');
      el.onclick = () => {
        el?.remove();
        if (toastTimer !== undefined) window.clearTimeout(toastTimer);
      };
      root.appendChild(el);
    }
    el.innerHTML = `<strong style="color:#7c9cff;display:block;margin-bottom:2px">${escapeHtml(
      title
    )}</strong><span style="color:#cfcfd6">${escapeHtml(body)}</span>`;
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    if (toastTimer !== undefined) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      el?.remove();
    }, 8000);
  } catch {}
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/**
 * Polls the customer's tickets and fires a browser notification + beep whenever
 * staff adds a new reply. Only runs while the dashboard is mounted.
 */
export function useTicketNotifications(enabled = true): void {
  const { t } = useI18n();
  const seen = useRef<Record<number, number>>({});
  const seeded = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      if (cancelled) return;
      let tickets: TicketListItem[] = [];
      try {
        tickets = (await api<{ tickets: TicketListItem[] }>('/api/tickets')).tickets ?? [];
      } catch {
        return;
      }
      const now: Record<number, number> = {};
      for (const tk of tickets) {
        const count = tk.messages_count ?? 0;
        now[tk.id] = count;
        const prev = seen.current[tk.id];
        if (prev === undefined) continue;
        if (count > prev && tk.last_message_author === 'staff' && seeded.current) {
          const title = t('notif.staffReplyTitle');
          const body = t('notif.staffReplyBody')
            .replace('{id}', String(tk.id))
            .replace('{subject}', tk.subject ?? '');
          notify(title, body, tk.id);
        }
      }
      seen.current = now;
      seeded.current = true;
    };

    const resume = () => {
      ensureAudioCtx();
      if (audioCtx && audioCtx.state === 'suspended') void audioCtx.resume().catch(() => {});
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    };
    document.addEventListener('pointerdown', resume);
    document.addEventListener('keydown', resume);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Live stream: the instant a message lands we re-poll (so the count-based
    // notification fires right away instead of waiting for the 30s interval)
    // and broadcast a change event so open pages refresh immediately.
    let stream: EventSource | null = null;
    const handleStreamEvent = (evt: TicketStreamEvent) => {
      window.dispatchEvent(
        new CustomEvent('su8l:tickets-changed', { detail: { ticketId: evt.ticketId } })
      );
      if (evt.ticketId != null) void poll();
    };
    try {
      stream = new EventSource(apiUrl('/api/tickets/stream'), { withCredentials: true });
      stream.onmessage = (msg) => {
        try {
          handleStreamEvent(JSON.parse(msg.data) as TicketStreamEvent);
        } catch {
          /* ignore malformed frame */
        }
      };
      // EventSource reconnects automatically; also sync counts when we reconnect.
      stream.onopen = () => void poll();
    } catch {
      // SSE unsupported — the 30s poll remains the fallback.
    }

    void poll();
    timer = window.setInterval(() => void poll(), 30000);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearInterval(timer);
      stream?.close();
      document.removeEventListener('pointerdown', resume);
      document.removeEventListener('keydown', resume);
    };
  }, [enabled, t]);
}
