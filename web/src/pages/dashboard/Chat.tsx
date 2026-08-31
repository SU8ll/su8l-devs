import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { useAuth } from '../../AuthContext';
import {
  CHAT_LANGUAGES,
  apiWsUrl,
  chatLangMeta,
  changeUsername,
  getChatHistory,
  getChatPreferences,
  postChatMessage,
  setChatPreferences,
  type ChatLang,
  type ChatMessageDto,
} from '../../api';
import { createTranslator } from '../../chatTranslate';
import { Spinner } from '../../components/ui';

const translate = createTranslator();

export default function Chat() {
  const { t } = useI18n();
  const { user, refresh } = useAuth();
  const [chosenLanguage, setChosenLanguage] = useState<ChatLang | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [activeUsers, setActiveUsers] = useState(0);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; body: string; username: string } | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [usernameEdit, setUsernameEdit] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(user?.username ?? '');
  const [usernameError, setUsernameError] = useState('');
  const [nameUpdated, setNameUpdated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const knownUsers = useMemo(() => {
    const set = new Set<string>([...(user?.username ? [user.username] : [])]);
    for (const m of messages) if (m.user.username) set.add(m.user.username);
    return Array.from(set);
  }, [messages, user?.username]);

  const chosenRef = useRef<ChatLang | null>(null);
  chosenRef.current = chosenLanguage;

  // ── Boot: fetch prefs + history ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prefs = await getChatPreferences();
        if (!cancelled && prefs?.preferredLanguage) {
          const lang = (prefs.preferredLanguage as ChatLang) || 'en';
          setPrefAndLang(lang);
        }
      } catch {
        /* ignore */
      }
      try {
        const hist = await getChatHistory();
        if (!cancelled) {
          setMessages(hist.messages);
          setActiveUsers(hist.activeUsers);
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setPrefAndLang(lang: ChatLang) {
    setChosenLanguage(lang);
    void setChatPreferences(lang).catch(() => {});
  }

  // ── Translate stored messages whenever the language/list changes ─────────
  useEffect(() => {
    if (!chosenLanguage) return;
    for (const m of messages) runTranslation(m, chosenLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenLanguage, messages]);

  async function runTranslation(m: ChatMessageDto, target: ChatLang) {
    const src = (m.language as ChatLang) || 'en';
    if (src === target) return;
    const translated = await translate.translate(m.body, src, target);
    setTranslations((prev) => (prev[m.id] === translated ? prev : { ...prev, [m.id]: translated }));
  }

  // ── WebSocket connection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!chosenLanguage) return;
    const token = localStorage.getItem('su8l_token');
    let reconnect = true;
    let ws: WebSocket | null = null;

    function connect() {
      ws = new WebSocket(`${apiWsUrl('/ws')}?token=${encodeURIComponent(token ?? '')}`);
      ws.onopen = () => setWsConnected(true);
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as { type: string; message?: ChatMessageDto; active?: number; me?: unknown };
          if (data.type === 'message' && data.message) {
            const msg = data.message;
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            const lang = chosenRef.current;
            if (lang) runTranslation(msg, lang);
          } else if (data.type === 'presence' && typeof data.active === 'number') {
            setActiveUsers(data.active);
          } else if (data.type === 'hello' && typeof data.active === 'number') {
            setActiveUsers(data.active);
          }
        } catch {
          /* ignore */
        }
      };
      ws.onclose = () => {
        setWsConnected(false);
        if (reconnect) setTimeout(connect, 3000);
      };
      ws.onerror = () => ws?.close();
    }
    connect();
    return () => {
      reconnect = false;
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosenLanguage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, translations]);

  // ── Mentions ─────────────────────────────────────────────────────────────
  function handleInputChange(value: string) {
    setInput(value);
    const at = value.lastIndexOf('@');
    if (at >= 0 && !value.slice(at).includes(' ')) {
      setMentionQuery(value.slice(at + 1).toLowerCase());
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  }

  function pickMention(name: string) {
    const at = input.lastIndexOf('@');
    if (at < 0) return;
    setInput(`${input.slice(0, at)}@${name} `);
    setMentionOpen(false);
    inputRef.current?.focus();
  }

  const mentionMatches = useMemo(() => {
    if (!mentionOpen || !mentionQuery) return [];
    return knownUsers
      .filter((n) => n.toLowerCase().includes(mentionQuery) && n !== user?.username)
      .slice(0, 6);
  }, [mentionOpen, mentionQuery, knownUsers, user?.username]);

  function isMentioned(m: ChatMessageDto): boolean {
    if (!user?.username) return false;
    return m.mentions?.some((n) => n.toLowerCase() === user.username.toLowerCase()) ?? false;
  }

  async function send() {
    const body = input.trim();
    const replyId = replyTo?.id ?? null;
    if (!body || sending || !chosenLanguage) return;
    setSending(true);
    try {
      const msg = await postChatMessage({ body, language: chosenLanguage, replyTo: replyId });
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setInput('');
      setReplyTo(null);
      setMentionOpen(false);
      runTranslation(msg, chosenLanguage);
    } catch {
      /* ignore send errors */
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function saveUsername() {
    const name = usernameDraft.trim();
    if (name.length < 2 || name.length > 24) {
      setUsernameError(t('chat.nameInvalid'));
      return;
    }
    setUsernameError('');
    try {
      await changeUsername(name);
      setNameUpdated(true);
      setUsernameEdit(false);
      setTimeout(() => setNameUpdated(false), 2500);
      await refresh();
    } catch {
      setUsernameError(t('chat.nameTaken'));
    }
  }

  // ── Language selection screen ─────────────────────────────────────────────
  if (!chosenLanguage) {
    return (
      <div className="mx-auto max-w-2xl">
        <section className="glass glow-border rounded-3xl p-8 text-center">
          <div className="text-4xl">🌐</div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-gradient text-glow">{t('chat.introTitle')}</h1>
          <p className="mt-2 text-sm text-muted">{t('chat.introDesc')}</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CHAT_LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setPrefAndLang(l.code)}
                className="glass card-hover flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all hover:bg-white/5"
              >
                <span className="text-2xl">{l.flag}</span>
                <span className="font-semibold">{l.name}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const meta = chatLangMeta(chosenLanguage);

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[480px] flex-col">
      {/* Header */}
      <div className="glass-strong mb-3 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta.flag}</span>
          <div>
            <div className="text-sm font-bold">{t('chat.title')}</div>
            <div className="flex items-center gap-2 text-[0.7rem] text-muted">
              <span>{activeUsers} {t('chat.online')}</span>
              <span className={`inline-block h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setUsernameEdit((v) => !v)} className="btn-ghost text-xs">
            ✎ {t('chat.changeName')}
          </button>
          <button type="button" onClick={() => setChosenLanguage(null)} className="btn-ghost text-xs">
            🌐 {t('chat.switchLang')}
          </button>
        </div>
      </div>

      {/* Username editor */}
      {usernameEdit && (
        <div className="glass mb-3 rounded-2xl p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={usernameDraft}
              onChange={(e) => {
                setUsernameDraft(e.target.value);
                setNameUpdated(false);
              }}
              maxLength={24}
              className="neon-input flex-1"
              placeholder={t('chat.namePlaceholder')}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => void saveUsername()} className="btn-primary shrink-0 text-xs">
                {t('chat.save')}
              </button>
              <button type="button" onClick={() => setUsernameEdit(false)} className="btn-ghost shrink-0 text-xs">
                {t('chat.cancel')}
              </button>
            </div>
          </div>
          {usernameError && <div className="mt-2 text-xs text-red-300">{usernameError}</div>}
          {nameUpdated && !usernameError && <div className="mt-2 text-xs text-emerald-300">{t('chat.nameSaved')}</div>}
        </div>
      )}

      {/* Messages */}
      <div className="glass flex-1 space-y-3 overflow-y-auto rounded-2xl p-4">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">{t('chat.empty')}</div>
        ) : (
          messages.map((m) => {
            const mine = m.user.id === user?.id;
            const src = (m.language as ChatLang) || 'en';
            const translated = translations[m.id];
            const origMode = !!showOriginal[m.id];
            const showTranslated = !!translated && !origMode;
            const mentioned = isMentioned(m);
            return (
              <div key={m.id} id={`chat-${m.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`group max-w-[82%] rounded-2xl px-4 py-2.5 ${
                    mine ? 'bg-gradient-to-br from-primary/40 to-glow/30' : 'border border-white/5 bg-white/[0.04]'
                  } ${mentioned ? 'ring-1 ring-glow/50' : ''}`}
                >
                  {m.replyTo && (
                    <div
                      className="mb-1.5 cursor-pointer rounded-lg border-l-2 border-glow/50 bg-white/[0.03] px-2.5 py-1 text-xs text-muted"
                      onClick={() => {
                        const el = document.getElementById(`chat-${m.replyTo!.id}`);
                        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    >
                      <span className="font-semibold text-glow/80">@{m.replyTo.username}</span> {m.replyTo.body}
                    </div>
                  )}
                  {!mine && (
                    <div className="mb-1 flex items-center gap-2">
                      {m.user.avatar ? (
                        <img src={m.user.avatar} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-glow text-[9px] font-black text-white">
                          {m.user.username[0]?.toUpperCase() ?? '?'}
                        </span>
                      )}
                      <span className={`text-xs font-bold ${mentioned ? 'text-glow' : 'text-white/70'}`}>{m.user.username}</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {showTranslated ? translated : m.body}
                  </div>

                  {/* Translation footers */}
                  {showTranslated && (
                    <div className="mt-1 border-t border-white/5 pt-1 text-[0.68rem] italic text-muted">
                      {t('chat.originalNote').replace('{lang}', chatLangMeta(src).name)}
                      <button type="button" className="ml-2 nav-link underline underline-offset-2" onClick={() => setShowOriginal((p) => ({ ...p, [m.id]: true }))}>
                        {t('chat.viewOriginal')}
                      </button>
                    </div>
                  )}
                  {!showTranslated && m.body !== translated && src !== chosenLanguage && (
                    <div className="mt-1 text-[0.68rem] text-muted">
                      {t('chat.originalLang').replace('{lang}', chatLangMeta(src).name)}
                    </div>
                  )}

                  <div className="mt-1 flex items-center gap-2 text-[0.65rem] text-muted/70">
                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      type="button"
                      className="hover:text-glow"
                      onClick={() => {
                        setReplyTo({ id: m.id, body: m.body, username: m.user.username });
                        inputRef.current?.focus();
                      }}
                    >
                      ↩ {t('chat.reply')}
                    </button>
                    {showOriginal[m.id] && (
                      <button type="button" className="hover:text-white" onClick={() => setShowOriginal((p) => ({ ...p, [m.id]: false }))}>
                        ↑ {t('chat.backToTranslated')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply-to chip */}
      {replyTo && (
        <div className="glass-strong mt-2 flex items-center gap-3 rounded-xl px-3 py-2 text-xs">
          <span className="font-semibold text-glow">↩ @{replyTo.username}</span>
          <span className="flex-1 truncate text-muted">{replyTo.body}</span>
          <button type="button" className="text-muted hover:text-white" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* Composer */}
      <div className="glass-strong mt-2 rounded-2xl p-3">
        {mentionOpen && mentionMatches.length > 0 && (
          <div className="mb-2 max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-1">
            {mentionMatches.map((name) => (
              <button key={name} type="button" onClick={() => pickMention(name)} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">
                @{name}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            maxLength={2000}
            className="neon-input flex-1 resize-none"
            placeholder={`${t('chat.placeholder')} — ${meta.flag} ${meta.name}`}
          />
          <button type="button" onClick={() => void send()} disabled={sending || !input.trim()} className="btn-primary shrink-0 disabled:opacity-40">
            {sending ? <Spinner size={16} /> : '➤'}
          </button>
        </div>
        <div className="mt-1.5 text-right text-[0.65rem] text-muted">{t('chat.autoTranslate')}</div>
      </div>
    </div>
  );
}
