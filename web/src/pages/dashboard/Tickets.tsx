import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { api } from '../../api';
import { Badge, Kicker, Spinner } from '../../components/ui';

interface Ticket {
  id: number;
  user_id: string;
  subject: string;
  status: 'open' | 'answered' | 'closed';
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  updated_at: string;
}

const PRIORITY_LABEL: Record<string, string> = { low: 'low', normal: 'normal', high: 'high' };

export default function Tickets() {
  const { t } = useI18n();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api<{ tickets: Ticket[] }>('/api/tickets')
      .then((r) => setTickets(r.tickets))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load tickets.');
        setTickets([]);
      });
  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener('su8l:tickets-changed', onChange);
    return () => window.removeEventListener('su8l:tickets-changed', onChange);
  }, []);

  const create = async () => {
    if (!subject.trim() || !body.trim() || creating) return;
    setCreating(true);
    setError('');
    try {
      await api('/api/tickets', { method: 'POST', body: { subject, body, priority } });
      setSubject('');
      setBody('');
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create ticket.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>{t('dash.tickets')}</Kicker>
          <h1 className="font-display text-2xl font-extrabold text-gradient">{t('tickets.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('tickets.subtitle')}</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? '✕' : '+'} {t('tickets.new')}
        </button>
      </div>

      {showForm && (
        <div className="glass-strong rounded-3xl p-7">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t('tickets.subject')}</label>
              <input className="neon-input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t('tickets.body')}</label>
              <textarea className="neon-input min-h-28 resize-y" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold">{t('tickets.priority')}</label>
              <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                {(['low', 'normal', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`rounded-full px-5 py-1.5 text-xs font-semibold transition-all ${
                      priority === p ? 'bg-gradient-to-r from-primary to-glow text-white shadow-glow' : 'text-muted'
                    }`}
                  >
                    {t(`tickets.${PRIORITY_LABEL[p]}`)}
                  </button>
                ))}
              </div>
            </div>
            {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</div>}
            <div className="flex items-center gap-3">
              <button type="button" className="btn-primary" onClick={create} disabled={creating}>
                {creating ? '…' : t('tickets.new')}
              </button>
            </div>
          </div>
        </div>
      )}

      {!tickets ? (
        <div className="flex justify-center py-24"><Spinner size={32} /></div>
      ) : error ? (
        <div className="glass rounded-3xl p-8 text-center">
          <div className="text-3xl">⚠</div>
          <p className="mt-3 text-sm text-red-300">{error}</p>
          <button type="button" className="btn-ghost mt-4" onClick={() => { setError(''); setTickets(null); void load(); }}>
            ↻ {t('status.checkNow')}
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <div className="text-3xl">▤</div>
          <p className="mt-3 text-muted">{t('tickets.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((tk) => (
            <Link
              key={tk.id}
              to={`/dashboard/tickets/${tk.id}`}
              className="glass card-hover flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">#{tk.id} — {tk.subject}</div>
                <div className="mt-1 text-xs text-muted">
                  {t('tickets.created')}: {new Date(tk.updated_at).toLocaleString()}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={tk.priority === 'high' ? 'red' : tk.priority === 'low' ? 'slate' : 'amber'}>
                  {t(`tickets.${tk.priority}`)}
                </Badge>
                <Badge tone={tk.status === 'closed' ? 'slate' : tk.status === 'answered' ? 'green' : 'purple'}>
                  {t(`tickets.${tk.status}`)}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
