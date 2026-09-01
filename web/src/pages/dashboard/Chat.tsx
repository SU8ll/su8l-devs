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
import { createTranslator, detectLanguage } from '../../chatTranslate';
import { Spinner } from '../../components/ui';
import { useIsMobile } from '../../hooks/useIsMobile';

const translate = createTranslator();

export default function Chat() {
  const { t, lang } = useI18n();
  const siteIsAr = lang === 'ar';
  const { user, refresh } = useAuth();
  const isMobile = useIsMobile();
  const [chosenLanguage, setChosenLanguage] = useState<ChatLang | null>(null);
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [activeUsers, setActiveUsers] = useState(0);
  void activeUsers;
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; body: string; username: string } | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notEntitled, setNotEntitled] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [usernameEdit, setUsernameEdit] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(user?.username ?? '');
  const [usernameError, setUsernameError] = useState('');
  const [nameUpdated, setNameUpdated] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(()=>{ try{ const k= typeof window!=='undefined' ? localStorage.getItem(`su8l_chat_disclaimer_${lang}`) : null; const legacy= typeof window!=='undefined' ? localStorage.getItem('su8l_chat_disclaimer') : null; return k==='1' || legacy==='1'; }catch{ return false; }});
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [replyToast, setReplyToast] = useState<{from:string; body:string}|null>(null);
  const audioCtxRef = useRef<AudioContext|null>(null);
  useEffect(()=>{ try{ const k=`su8l_chat_disclaimer_${lang}`; const ok = localStorage.getItem(k)==='1' || localStorage.getItem('su8l_chat_disclaimer')==='1'; setDisclaimerAccepted(ok); setDisclaimerChecked(false);}catch{} },[lang]);
  useEffect(()=>{
    if(chosenLanguage && disclaimerAccepted && typeof Notification!=='undefined' && Notification.permission==='default'){
      Notification.requestPermission().catch(()=>{});
    }
    if(chosenLanguage && disclaimerAccepted){
      const ensure=()=>{
        try{
          if(!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
          if(audioCtxRef.current.state==='suspended') void audioCtxRef.current.resume();
        }catch{}
      };
      ensure();
      const onFirst=()=>{ ensure(); document.removeEventListener('click', onFirst); document.removeEventListener('touchstart', onFirst); };
      document.addEventListener('click', onFirst, {once:true});
      document.addEventListener('touchstart', onFirst, {once:true});
      return ()=>{ document.removeEventListener('click', onFirst); document.removeEventListener('touchstart', onFirst); };
    }
  },[chosenLanguage, disclaimerAccepted]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function ensureAudio():AudioContext|null{
    try{
      if(!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
      if(audioCtxRef.current.state==='suspended') void audioCtxRef.current.resume();
      return audioCtxRef.current;
    }catch{ return null; }
  }
  function playReplySound(){
    try{
      const ctx = ensureAudio();
      if(!ctx) return;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type='sine'; o.frequency.value=880; g.gain.value=0.13;
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime+0.18);
      setTimeout(()=>{ try{ const o2=ctx.createOscillator(); const g2=ctx.createGain(); o2.frequency.value=1320; g2.gain.value=0.10; o2.connect(g2); g2.connect(ctx.destination); o2.start(); o2.stop(ctx.currentTime+0.12);}catch{} },90);
    }catch{}
  }
  function isMeaningfulForTranslation(text: string): boolean{
    const t=text.trim();
    if(t.length<2) return false;
    try{
      const noEmoji=t.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]/gu,'').trim();
      return noEmoji.length>=2;
    }catch{ return t.length>=2; }
  }

  // Curated iOS-style emoji set (rendered by the OS in native color-emoji font).
  const iOS_EMOJIS = useMemo(
    () => [
      '😀','😁','😂','🤣','😊','😇','🥰','😍','🤩','😘','😗','😉','🙂','🤗','🤔','🫡','😐','😴','😴','🤤','😢','😭','🥺','😡','🤯','🥳','😎','🤓','🧐','🙃',
      '👍','👍🏽','👎','👏','🙏','✌️','🤞','🤙','👌','🤝','💪','🫶','👋','🤚','🖐️','✋','👀','🧠','👅','👄',
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💖','💫','✨','🔥','⚡','🌈','☀️','🌙','⭐','🌟','💥','🎉','🎊','🥂','🍻',
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🦄','🐝','🦋','🐢','🐙','🦀','🐬','🐳','🦈',
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥕','🌽','🌶️','🥦','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🥗','🍿','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍺','🥤','☕',
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🥊','🥋','⛳','🏹','🎣','🛹','🛼','🚴','🏋️','⛸️','🎿','🏂','🏄','🏊','🚣','🎯','🎲','🎮','🎰','🎳',
    ],
    []
  );
  const EMOJI_COLS = [
    iOS_EMOJIS.slice(0, 36),
    iOS_EMOJIS.slice(36, 52),
    iOS_EMOJIS.slice(52, 76),
    iOS_EMOJIS.slice(76, 104),
    iOS_EMOJIS.slice(104, 128),
    iOS_EMOJIS.slice(128),
  ];

  const knownUsers = useMemo(() => {
    const set = new Set<string>([...(user?.username ? [user.username] : [])]);
    for (const m of messages) if (m.user.username) set.add(m.user.username);
    return Array.from(set);
  }, [messages, user?.username]);

  const chosenRef = useRef<ChatLang | null>(null);
  chosenRef.current = chosenLanguage;
  const userRef = useRef(user);
  userRef.current = user;

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
      } catch (e) {
        // 403 = chat requires an active subscription or a completed purchase.
        const status = (e as { status?: number })?.status;
        if (status === 403 && !cancelled) setNotEntitled(true);
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
    const declared = (m.language as ChatLang) || 'en';
    const src = detectLanguage(m.body, declared);
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
            const me = userRef.current;
            const isReplyToMe = !!(me && msg.replyTo && ( (msg.replyTo as unknown as {userId?:string}).userId ? (msg.replyTo as unknown as {userId?:string}).userId===me.id : msg.replyTo.username.toLowerCase()===me.username.toLowerCase()) && msg.user.id!==me.id);
            if (isReplyToMe){
              playReplySound();
              setReplyToast({from: msg.user.username, body: msg.body});
              setTimeout(()=> setReplyToast(prev=> prev && prev.from===msg.user.username && prev.body===msg.body ? null : prev), 4200);
              try{
                if(typeof Notification!=='undefined'){
                  if(Notification.permission==='granted') new Notification(siteIsAr? `رد من ${msg.user.username}` : `Reply from ${msg.user.username}`,{body: msg.body.slice(0,80), icon: msg.user.avatar || '/logo.png'});
                  else if(Notification.permission!=='denied') Notification.requestPermission();
                }
                if(navigator.vibrate) navigator.vibrate([80,40,80]);
              }catch{}
              // Fallback: also trigger a global in-app event so even if WS handler is missed, toast shows
              try{ window.dispatchEvent(new CustomEvent('su8l:reply-toast', {detail:{from: msg.user.username, body: msg.body}})); }catch{}
            }
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

  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    if (el) {
      const start = el.selectionStart ?? input.length;
      const end = el.selectionEnd ?? input.length;
      const next = input.slice(0, start) + emoji + input.slice(end);
      setInput(next);
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + emoji.length;
        el.setSelectionRange(pos, pos);
      });
    } else {
      setInput((v) => v + emoji);
    }
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
  if (notEntitled) {
    return (
      <div className="mx-auto max-w-xl">
        <section className="glass glow-border rounded-3xl p-8 text-center">
          <div className="text-5xl">🔒</div>
          <h1 className="mt-4 font-display text-2xl font-extrabold text-gradient text-glow">{t('chat.lockedTitle')}</h1>
          <p className="mt-3 text-sm text-muted">{t('chat.lockedDesc')}</p>
        </section>
      </div>
    );
  }

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

  if (chosenLanguage && !disclaimerAccepted) {
    return (
      <div style={{minHeight: isMobile? 'calc(100dvh - 112px)':'60vh', display:'flex', alignItems:'center', justifyContent:'center', padding: isMobile? '16px':'24px', background: isMobile? 'transparent' : 'radial-gradient(900px 400px at 50% -10%, rgba(124,58,237,0.06), transparent)'}}>
        <div style={{width:'100%', maxWidth:480, background:'#0F0F14', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.55)'}}>
          <div style={{height:3, background:'linear-gradient(90deg,#7C3AED,#A78BFA, #22D3EE)'}}/>
          <div style={{padding:20, direction: siteIsAr? 'rtl':'ltr'}}>
            <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:10}}>
              <img src="/logo.png" alt="" style={{width:40,height:40, borderRadius:11, objectFit:'contain', border:'1px solid rgba(255,255,255,0.06)', background:'#0E0E12'}} onError={e=>{ (e.target as HTMLImageElement).style.display='none'; }}/>
              <div>
                <div style={{fontSize:10, fontWeight:800, letterSpacing:'0.14em', textTransform:'uppercase', color:'#A78BFA'}}>SU8L DEVs • {siteIsAr? 'المجتمع العالمي' : 'Global Community'}</div>
                <div style={{fontSize:17, fontWeight:800, letterSpacing:'-0.02em', color:'#F5F5F7', marginTop:2, textAlign: siteIsAr? 'right':'left'}}>{siteIsAr? 'إرشادات المجتمع' : 'Community Guidelines'}</div>
              </div>
            </div>
            <div style={{fontSize:12.5, lineHeight:1.6, color:'#9A99A6', marginBottom:14, textAlign: siteIsAr? 'right':'left'}}>{siteIsAr? 'مرحبًا بك في المحادثة العالمية. للحفاظ على بيئة آمنة ومحترمة للجميع، يرجى الالتزام:' : 'Welcome to the global chat. To keep it safe and respectful for everyone, please follow:'}</div>

            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              <div style={{display:'flex', gap:12, padding:12, borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{width:32,height:32, borderRadius:9, background:'rgba(239,68,68,0.09)', border:'1px solid rgba(239,68,68,0.14)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16}}>🛡️</span>
                <div>
                  <div style={{fontSize:13, fontWeight:700, color:'#F5F5F7', textAlign: siteIsAr? 'right':'left'}}>{siteIsAr? 'لا تشارك معلوماتك الخاصة' : 'Protect your privacy'}</div>
                  <div style={{fontSize:12, lineHeight:1.5, color:'#9A99A6', marginTop:3, textAlign: siteIsAr? 'right':'left'}}>{siteIsAr? 'لا تنشر رقم المملكة، اسم التحالف، الإحداثيات أو أي تفاصيل تحدد هويتك.' : "Don't share kingdom number, alliance, coordinates or anything that identifies you."}</div>
                </div>
              </div>
              <div style={{display:'flex', gap:12, padding:12, borderRadius:12, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)'}}>
                <span style={{width:32,height:32, borderRadius:9, background:'rgba(245,158,11,0.09)', border:'1px solid rgba(245,158,11,0.14)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16}}>🔒</span>
                <div>
                  <div style={{fontSize:13, fontWeight:700, color:'#F5F5F7', textAlign: siteIsAr? 'right':'left'}}>{siteIsAr? 'حافظ على أمان حسابك' : 'Keep your account safe'}</div>
                  <div style={{fontSize:12, lineHeight:1.5, color:'#9A99A6', marginTop:3, textAlign: siteIsAr? 'right':'left'}}>{siteIsAr? 'لا تشارك كلمات المرور أو بيانات الدفع. SU8L DEVs لن تطلبها منك أبدًا هنا.' : 'Never share passwords or payment info. SU8L DEVs will never ask for them here.'}</div>
                </div>
              </div>
            </div>

            <div style={{marginTop:14, display:'flex', gap:10, padding:12, borderRadius:12, background:'rgba(59,130,246,0.06)', border:'1px solid rgba(59,130,246,0.14)'}}>
              <span style={{fontSize:16, flexShrink:0, marginTop:1}}>⏰</span>
              <div style={{fontSize:12, lineHeight:1.5, color:'#93C5FD', textAlign: siteIsAr? 'right':'left'}}>{siteIsAr? 'المحادثات تُحذف تلقائيًا كل 6 ساعات للحفاظ على خفة الموقع — خاصة على الهواتف البسيطة.' : 'Chats auto-delete every 6 hours to keep the site fast — especially on low-end phones.'}</div>
            </div>

            <label style={{display:'flex', gap:10, alignItems:'flex-start', marginTop:16, cursor:'pointer', padding:12, borderRadius:12, border: disclaimerChecked? '1px solid rgba(124,58,237,0.28)' : '1px solid rgba(255,255,255,0.06)', background: disclaimerChecked? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)', flexDirection: siteIsAr? 'row-reverse':'row'}}>
              <input type="checkbox" checked={disclaimerChecked} onChange={e=>setDisclaimerChecked(e.target.checked)} style={{marginTop:2, width:18, height:18, accentColor:'#7C3AED', flexShrink:0}}/>
              <span style={{fontSize:12.5, lineHeight:1.5, color: disclaimerChecked? '#D1D1D6' : '#9A99A6', textAlign: siteIsAr? 'right':'left'}}>{siteIsAr? 'أقر بأنني قرأت وفهمت الإرشادات، وأتحمل مسؤولية ما أنشره، وأوافق على عدم مشاركة معلومات حساسة.' : 'I have read and understood the guidelines, take responsibility for what I post, and agree not to share sensitive information.'}</span>
            </label>

            <button type="button" disabled={!disclaimerChecked} onClick={()=>{ try{ localStorage.setItem(`su8l_chat_disclaimer_${lang}`,'1'); localStorage.setItem('su8l_chat_disclaimer','1'); }catch{} setDisclaimerAccepted(true); }} style={{width:'100%', marginTop:14, padding:'13px', borderRadius:12, border:'none', background: disclaimerChecked? '#7C3AED':'rgba(255,255,255,0.07)', color: disclaimerChecked? '#fff':'#6B6A78', fontWeight:800, fontSize:14, boxShadow: disclaimerChecked? '0 8px 20px rgba(124,58,237,0.28)' : 'none', transition:'all 0.15s'}}>
              {siteIsAr? 'موافق — دخول المحادثة →' : 'Agree & Enter Chat →'}
            </button>
            <div style={{textAlign:'center', marginTop:10, fontSize:11, color:'#6B6A78'}}><a href="/terms" target="_blank" rel="noreferrer" style={{color:'#A78BFA', textDecoration:'none'}}>{siteIsAr? 'الشروط' : 'Terms'}</a> • <a href="/refund" target="_blank" rel="noreferrer" style={{color:'#A78BFA', textDecoration:'none'}}>{siteIsAr? 'سياسة الاسترجاع' : 'Refund'}</a></div>
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile premium chat: conversational, airy, like Discord/Telegram — not boxed group ─────
  if (isMobile) {
    return (
      <div style={{display:'flex', flexDirection:'column', gap:10, minHeight:'calc(100dvh - 112px)'}}>
        {/* Sub-header: presence + actions as text, not pill */}
        <div style={{display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:12, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, flex:1, minWidth:0}}>
            <span style={{width:28,height:28,borderRadius:8, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.18)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12}}>●</span>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13, fontWeight:700, color:'#F5F5F7'}}>{meta.flag} {meta.name}</div>
              <div style={{fontSize:11, color:'#6B6A78'}}>Community</div>
            </div>
          </div>
          <button type="button" onClick={()=> setUsernameEdit(v=>!v)} style={{padding:'7px 10px', borderRadius:9, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.03)', color:'#D1D1D6', fontSize:12, fontWeight:600}}>✎ {t('chat.changeName')}</button>
          <button type="button" title={siteIsAr? 'إرشادات المجتمع':'Community guidelines'} onClick={()=>{ setDisclaimerAccepted(false); setDisclaimerChecked(false); }} style={{padding:'7px 10px', borderRadius:9, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.03)', color:'#D1D1D6', fontSize:12, fontWeight:600}}>📋</button>
          <button type="button" onClick={()=> setChosenLanguage(null)} style={{padding:'7px 10px', borderRadius:9, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.03)', color:'#D1D1D6', fontSize:12, fontWeight:600}}>🌐</button>
        </div>
        {replyToast && (
          <div onClick={()=>setReplyToast(null)} style={{display:'flex', gap:10, alignItems:'center', padding:'10px 12px', borderRadius:12, background:'#1A1628', border:'1px solid rgba(124,58,237,0.24)', boxShadow:'0 8px 24px rgba(0,0,0,0.35)', cursor:'pointer'}}>
            <span style={{width:28,height:28, borderRadius:8, background:'#7C3AED', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14}}>↩</span>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:12, fontWeight:700, color:'#A78BFA'}}>{siteIsAr? `رد من ${replyToast.from}` : `Reply from ${replyToast.from}`}</div>
              <div style={{fontSize:12, color:'#D1D1D6', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{replyToast.body}</div>
            </div>
            <span style={{color:'#6B6A78'}}>✕</span>
          </div>
        )}

        {usernameEdit && (
          <div className="m-card" style={{padding:12}}>
            <div style={{display:'flex', gap:8}}>
              <input value={usernameDraft} onChange={e=>{setUsernameDraft(e.target.value); setNameUpdated(false);}} maxLength={24} placeholder={t('chat.namePlaceholder')} style={{flex:1, padding:'11px 12px', borderRadius:11, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none'}}/>
              <button type="button" onClick={()=>void saveUsername()} style={{padding:'11px 14px', borderRadius:11, background:'#7C3AED', color:'#fff', fontWeight:700, border:'none'}}>OK</button>
              <button type="button" onClick={()=>setUsernameEdit(false)} style={{padding:'11px 12px', borderRadius:11, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.04)', color:'#9A99A6'}}>✕</button>
            </div>
            {usernameError && <div style={{marginTop:8, fontSize:12, color:'#F87171'}}>{usernameError}</div>}
            {nameUpdated && !usernameError && <div style={{marginTop:8, fontSize:12, color:'#6EE7B7'}}>{t('chat.nameSaved')}</div>}
          </div>
        )}
        <div style={{padding:'8px 10px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', fontSize:11, color:'#6B6A78', textAlign:'center', lineHeight:1.4}}>⏰ {siteIsAr? 'المحادثات تُحذف تلقائيًا كل 6 ساعات للحفاظ على خفة الموقع بالهواتف البسيطة.' : 'Chats are auto-deleted every 6 hours to keep the site light.'}</div>

        {/* Messages — airy rows, not boxed cards */}
        <div style={{flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:14, padding:'4px 2px'}}>
          {loading ? <div className="flex justify-center py-16"><Spinner size={28}/></div>
          : messages.length===0 ? <div style={{textAlign:'center', padding:'48px 0', color:'#6B6A78', fontSize:13}}>{t('chat.empty')}</div>
          : messages.map(m=>{
              const mine = m.user.id===user?.id;
              const declared=(m.language as ChatLang)||'en';
              const src=detectLanguage(m.body, declared);
              const translated=translations[m.id];
              const origMode=!!showOriginal[m.id];
              const showTranslated=!!translated && !origMode;
              const isRtl = chosenLanguage==='ar';
              const mineOnLeft = !isRtl;
              const isLeft = mine ? mineOnLeft : !mineOnLeft;
              return (
                <div key={m.id} id={`chat-${m.id}`} style={{display:'flex', gap:10, flexDirection: isLeft? 'row':'row-reverse', justifyContent:'flex-start', padding: mine? '10px 10px' : '0', borderRadius:12, background: mine? 'rgba(124,58,237,0.06)' : 'transparent', border: mine? '1px solid rgba(124,58,237,0.10)' : 'none', textAlign: isLeft? 'left':'right'}}>
                  <div style={{width:32,height:32, borderRadius:9, overflow:'hidden', flexShrink:0, border:'1px solid rgba(255,255,255,0.06)', background: mine? '#7C3AED':'#1E1E24', display:'flex', alignItems:'center', justifyContent:'center'}}>
                    {m.user.avatar ? <img src={m.user.avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/> : <span style={{fontWeight:800, color:'#fff', fontSize:11}}>{m.user.username[0]?.toUpperCase()??'?'}</span>}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:'flex', alignItems:'baseline', gap:6, flexWrap:'wrap', justifyContent: isLeft? 'flex-start':'flex-end'}}>
                      <span style={{fontSize:13, fontWeight:700, color: mine? '#A78BFA' : '#F5F5F7'}}>{mine? t('tickets.you') : m.user.username}</span>
                      <span style={{fontSize:11, color:'#6B6A78'}}>{new Date(m.createdAt).toLocaleTimeString([],{hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    {m.replyTo && (
                      <div onClick={()=>{ const el=document.getElementById(`chat-${m.replyTo!.id}`); el?.scrollIntoView({behavior:'smooth', block:'center'}); }} style={{marginTop:6, padding:'7px 10px', borderLeft: isLeft? '2px solid #7C3AED' : 'none', borderRight: !isLeft? '2px solid #7C3AED' : 'none', background:'rgba(124,58,237,0.07)', borderRadius:8, fontSize:12, color:'#9A99A6', cursor:'pointer', textAlign: isLeft? 'left':'right'}}>
                        <span style={{fontWeight:700, color:'#A78BFA'}}>@{m.replyTo.username}</span> {m.replyTo.body.slice(0,80)}
                      </div>
                    )}
                    <div style={{marginTop:6, fontSize:14, lineHeight:1.55, color:'#E6E6E8', whiteSpace:'pre-wrap', wordBreak:'break-word'}}>{showTranslated? translated : m.body}</div>
                    {showTranslated && isMeaningfulForTranslation(m.body) && <div style={{marginTop:6, fontSize:11, color:'#6B6A78', fontStyle:'italic', textAlign: isLeft? 'left':'right'}}>{t('chat.originalNote').replace('{lang}', chatLangMeta(src).name)} <button type="button" onClick={()=>setShowOriginal(p=>({...p,[m.id]:true}))} style={{marginLeft:6, color:'#A78BFA', background:'none', border:'none', fontWeight:600, textDecoration:'underline'}}>{t('chat.viewOriginal')}</button></div>}
                    {!showTranslated && isMeaningfulForTranslation(m.body) && m.body!==translated && src!==chosenLanguage && <div style={{marginTop:4, fontSize:11, color:'#6B6A78', textAlign: isLeft? 'left':'right'}}>{t('chat.originalLang').replace('{lang}', chatLangMeta(src).name)}</div>}
                    <div style={{marginTop:8, display:'flex', gap:10, justifyContent: isLeft? 'flex-start':'flex-end'}}>
                      {!mine && <button type="button" onClick={()=>{ setReplyTo({id:m.id, body:m.body, username:m.user.username}); inputRef.current?.focus(); }} style={{fontSize:11, color:'#6B6A78', background:'none', border:'none', display:'flex', alignItems:'center', gap:4}}>↩ {t('chat.reply')}</button>}
                      {showOriginal[m.id] && <button type="button" onClick={()=>setShowOriginal(p=>({...p,[m.id]:false}))} style={{fontSize:11, color:'#A78BFA', background:'none', border:'none'}}>↑ {t('chat.backToTranslated')}</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          <div ref={bottomRef}/>
        </div>

        {replyTo && (
          <div style={{display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:10, background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.14)'}}>
            <span style={{fontWeight:700, color:'#A78BFA', fontSize:12}}>↩ @{replyTo.username}</span>
            <span style={{flex:1, fontSize:12, color:'#9A99A6', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{replyTo.body}</span>
            <button type="button" onClick={()=>setReplyTo(null)} style={{color:'#9A99A6', background:'none', border:'none'}}>✕</button>
          </div>
        )}

        <div style={{display:'flex', flexDirection:'column', gap:8, padding:'10px', borderRadius:14, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex', gap:8, alignItems:'flex-end'}}>
            <button type="button" onClick={()=>setEmojiOpen(v=>!v)} style={{width:40,height:40, borderRadius:10, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>😊</button>
            <textarea ref={inputRef} value={input} onChange={e=>handleInputChange(e.target.value)} onClick={()=>setEmojiOpen(false)} onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); void send(); } }} rows={1} maxLength={2000} placeholder={`${t('chat.placeholder')} — ${meta.flag} ${meta.name}`} style={{flex:1, minHeight:40, maxHeight:100, padding:'11px 12px', borderRadius:11, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.04)', color:'#F5F5F7', outline:'none', resize:'none'}}/>
            <button type="button" onClick={()=>void send()} disabled={sending||!input.trim()} style={{width:40,height:40, borderRadius:11, border:'none', background: input.trim()?'#7C3AED':'rgba(255,255,255,0.08)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity: sending||!input.trim()?0.6:1}}>{sending? '…':'➤'}</button>
          </div>
          {emojiOpen && (
            <div style={{display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:4, padding:8, borderRadius:12, background:'rgba(15,15,20,0.9)', border:'1px solid rgba(255,255,255,0.06)', maxHeight:200, overflowY:'auto'}}>
              {iOS_EMOJIS.map(e=> <button key={e} type="button" onClick={()=>insertEmoji(e)} style={{width:32,height:32, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, background:'transparent', border:'none', fontSize:18}}>{e}</button>)}
            </div>
          )}
          <div style={{fontSize:10, color:'#6B6A78', textAlign:'right'}}>{t('chat.autoTranslate')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="m-chat-screen mx-auto flex h-[calc(100vh-9rem)] min-h-[480px] max-w-3xl flex-col">
      {/* Header */}
      <div className="m-chat-head glass-strong mb-3 flex items-center gap-3 rounded-2xl px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-xl">{meta.flag}</span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{t('chat.title')}</div>
            <div className="flex items-center gap-1 text-[0.7rem] text-muted">
              <span className={`inline-block h-2 w-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={() => setUsernameEdit((v) => !v)} className="btn-ghost text-xs">
            ✎ {t('chat.changeName')}
          </button>
          <button type="button" title={siteIsAr? 'إرشادات المجتمع':'Community guidelines'} onClick={()=>{ setDisclaimerAccepted(false); setDisclaimerChecked(false); }} className="btn-ghost text-xs">
            📋
          </button>
          <button type="button" onClick={() => setChosenLanguage(null)} className="btn-ghost text-xs">
            🌐 {t('chat.switchLang')}
          </button>
        </div>
      </div>
      {replyToast && (
        <div onClick={()=>setReplyToast(null)} style={{display:'flex', gap:10, alignItems:'center', padding:'10px 12px', borderRadius:12, background:'#1A1628', border:'1px solid rgba(124,58,237,0.24)', boxShadow:'0 8px 24px rgba(0,0,0,0.25)', cursor:'pointer', marginBottom:12}}>
          <span style={{width:28,height:28, borderRadius:8, background:'#7C3AED', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff'}}>↩</span>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontSize:12, fontWeight:700, color:'#A78BFA'}}>{siteIsAr? `رد من ${replyToast.from}` : `Reply from ${replyToast.from}`}</div>
            <div style={{fontSize:12, color:'#D1D1D6', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{replyToast.body}</div>
          </div>
          <span style={{color:'#6B6A78'}}>✕</span>
        </div>
      )}

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
      <div className="glass flex-1 space-y-3 overflow-y-auto rounded-2xl px-3 py-4">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size={32} /></div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">{t('chat.empty')}</div>
        ) : (
          messages.map((m) => {
            const mine = m.user.id === user?.id;
            const declared = (m.language as ChatLang) || 'en';
            const src = detectLanguage(m.body, declared);
            const translated = translations[m.id];
            const origMode = !!showOriginal[m.id];
            const showTranslated = !!translated && !origMode;
            const mentioned = isMentioned(m);
            return (
              <div key={m.id} id={`chat-${m.id}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[84%] rounded-2xl px-4 py-2.5 ${
                    mine ? 'm-bubble-mine' : 'm-bubble-theirs'
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

                  {showTranslated && isMeaningfulForTranslation(m.body) && (
                    <div className="mt-1 border-t border-white/5 pt-1 text-[0.68rem] italic text-muted">
                      {t('chat.originalNote').replace('{lang}', chatLangMeta(src).name)}
                      <button type="button" className="ml-2 nav-link underline underline-offset-2" onClick={() => setShowOriginal((p) => ({ ...p, [m.id]: true }))}>
                        {t('chat.viewOriginal')}
                      </button>
                    </div>
                  )}
                  {!showTranslated && isMeaningfulForTranslation(m.body) && m.body !== translated && src !== chosenLanguage && (
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setEmojiOpen((v) => !v)}
              className="btn-ghost flex h-[38px] w-[38px] shrink-0 items-center justify-center text-xl"
              title="Emoji"
            >
              😊
            </button>
            {emojiOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setEmojiOpen(false)} />
                <div className="glass-strong absolute bottom-12 left-0 z-40 w-[300px] rounded-2xl p-2 shadow-xl">
                  <div className="max-h-56 space-y-1 overflow-y-auto">
                    {EMOJI_COLS.map((row, ri) => (
                      <div key={ri} className="flex flex-wrap gap-0.5">
                        {row.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => insertEmoji(e)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-xl transition-all hover:scale-110 hover:bg-white/10"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onClick={() => setEmojiOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            maxLength={2000}
            className="neon-input m-chat-input flex-1 resize-none"
            placeholder={`${t('chat.placeholder')} — ${meta.flag} ${meta.name}`}
          />
          <button type="button" onClick={() => void send()} disabled={sending || !input.trim()} className="btn-primary m-send-btn shrink-0 disabled:opacity-40">
            {sending ? <Spinner size={16} /> : '➤'}
          </button>
        </div>
        <div className="mt-1.5 text-right text-[0.65rem] text-muted">{t('chat.autoTranslate')}</div>
      </div>
    </div>
  );
}
