import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { api } from '../../api';
import { Badge, Kicker, Spinner } from '../../components/ui';

interface Message {
  id: number;
  ticket_id: number;
  author: 'user' | 'staff';
  body: string;
  created_at: string;
}

interface TicketDetail {
  ticket: {
    id: number;
    subject: string;
    status: 'open' | 'answered' | 'closed';
    priority: 'low' | 'normal' | 'high';
    created_at: string;
    updated_at: string;
  };
  messages: Message[];
  staff: boolean;
}

export default function TicketDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const [data, setData] = useState<TicketDetail | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const load = () => api<TicketDetail>(`/api/tickets/${id}`).then(setData).catch((e) => setError(e.message));

  const sendingRef = useRef(false);

  useEffect(() => {
    sendingRef.current = false;
    void load();
    const timer = window.setInterval(() => {
      if (!sendingRef.current) void load();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [id]);

  if (error) return <div className="text-red-300">{error}</div>;
  if (!data) return <div className="flex justify-center py-24"><Spinner size={36} /></div>;

  const send = async () => {
    if (!reply.trim() || sending) return;
    sendingRef.current = true;
    setSending(true);
    try {
      await api(`/api/tickets/${data.ticket.id}/messages`, { method: 'POST', body: { body: reply } });
      setReply('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const setStatus = async (status: 'open' | 'closed') => {
    await api(`/api/tickets/${data.ticket.id}/status`, { method: 'POST', body: { status } });
    await load();
  };

  return (
    <div className="space-y-6">
      <Link to="/dashboard/tickets" className="nav-link text-sm">
        ← {t('tickets.back')}
      </Link>

      <div className="glass-strong rounded-3xl p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Kicker>#{data.ticket.id}</Kicker>
            <h1 className="font-display text-xl font-extrabold text-gradient">{data.ticket.subject}</h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="purple">{t(`tickets.${data.ticket.priority}`)}</Badge>
              <Badge tone={data.ticket.status === 'closed' ? 'slate' : data.ticket.status === 'answered' ? 'green' : 'amber'}>
                {t(`tickets.${data.ticket.status}`)}
              </Badge>
            </div>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setStatus(data.ticket.status === 'closed' ? 'open' : 'closed')}
          >
            {data.ticket.status === 'closed' ? t('tickets.reopen') : t('tickets.close')}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {data.messages.map((m) => (
          <div key={m.id} className={`glass rounded-2xl px-6 py-4 ${m.author === 'staff' ? 'glow-border' : ''}`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`font-bold uppercase tracking-wider ${m.author === 'staff' ? 'text-glow' : 'text-muted'}`}>
                {m.author === 'staff' ? t('tickets.staff') : t('tickets.you')}
              </span>
              <span className="text-muted">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">{m.body}</p>
          </div>
        ))}
      </div>

      {data.ticket.status !== 'closed' && (
        <div className="glass rounded-3xl p-6">
          <label className="mb-2 block text-sm font-semibold">{t('tickets.reply')}</label>
          <textarea
            className="neon-input min-h-24 resize-y"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={4000}
            placeholder={t('tickets.body')}
          />
          {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
          <button type="button" className="btn-primary mt-4" onClick={send} disabled={sending}>
            {sending ? '…' : t('tickets.send')}
          </button>
        </div>
      )}
    </div>
  );
}
