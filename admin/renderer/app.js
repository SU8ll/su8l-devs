/* SU8L DEVs — Admin Panel (desktop renderer) */
'use strict';

const LS = { base: 'su8l_admin_base', key: 'su8l_admin_key', token: 'su8l_admin_token', lang: 'su8l_admin_lang' };
const $ = (sel) => document.querySelector(sel);
const el = (html) => { const tpl = document.createElement('template'); tpl.innerHTML = html.trim(); return tpl.content.firstElementChild; };

const I18N = {
  ar: {
    loginSub: 'Admin Panel · لوحة التحكم',
    loginBaseLabel: 'رابط السيرفر (API)',
    loginKeyLabel: 'مفتاح الأدمن',
    loginBtn: 'دخول · Login',
    brandSub: 'لوحة التحكم',
    connOn: 'متصل',
    connOff: 'غير متصل',
    logout: 'خروج · Logout',
    refresh: 'تحديث',
    'nav.overview': 'نظرة عامة',
    'nav.users': 'المستخدمون',
    'nav.orders': 'الطلبات',
    'nav.tickets': 'التذاكر',
    'nav.promos': 'أكواد الخصم',
    'nav.configs': 'اختيارات العملاء',
    sessionExpired: 'انتهت الجلسة — سجّل الدخول مجددًا',
    keyNotConfigured: 'المفتاح غير مضبوط على السيرفر (ADMIN_API_KEY). ركّبه من إعدادات Render أولًا.',
    loginFailed: 'فشل الدخول',
    loggedOut: 'تم تسجيل الخروج',
    usersL: 'المستخدمون',
    activeSubs: 'اشتراكات نشطة',
    ordersL: 'الطلبات',
    revenue: 'الإيراد المحصّل',
    revenuePending: 'إيراد معلّق',
    ticketsOpen: 'تذاكر مفتوحة',
    promoAvailable: 'أكواد خصم متاحة',
    extraSlotsL: 'سلوت إضافية',
    botConfigs: 'إعدادات بوتات',
    searchPlaceholder: 'ابحث بالاسم أو البريد أو المعرّف…',
    search: 'بحث',
    createUser: 'إنشاء مستخدم',
    createUserTitle: 'إنشاء مستخدم جديد',
    createUserEmail: 'البريد الإلكتروني',
    createUserUsername: 'اسم المستخدم',
    createUserPassword: 'كلمة المرور',
    createUserBtn: 'إنشاء',
    createUserCancel: 'إلغاء',
    createUserSuccess: 'تم إنشاء المستخدم بنجاح',
    createUserFailed: 'فشل إنشاء المستخدم',
    idCol: 'المعرّف',
    nameCol: 'الاسم',
    emailCol: 'البريد',
    regCol: 'التسجيل',
    noResults: 'لا نتائج',
    backToList: '← رجوع للقائمة',
    noEmail: 'لا بريد',
    registered: 'سجّل',
    grantSub: 'منح اشتراك',
    planCol: 'الباقة',
    cycleCol: 'الدورة',
    priceCol: 'السعر',
    statusCol: 'الحالة',
    endsCol: 'الانتهاء',
    grantBtn: 'منح اشتراك',
    daysLabel: 'الأيام',
    grantDaysHint: 'فارغ = تلقائي (شهري/سنوي)',
    monthly: 'شهري',
    yearly: 'سنوي',
    subCount: 'الاشتراكات',
    revoke: 'إلغاء',
    noSubs: 'لا اشتراكات',
    extraSlotsTitle: 'السلوتات الإضافية',
    grantExtra: '+ منح سلوت إضافي',
    dateCol: 'التاريخ',
    remove: 'إزالة',
    noExtras: 'لا سلوتات إضافية',
    ordersTitle: 'الطلبات',
    noOrders: 'لا طلبات',
    botSlotsTitle: 'إعدادات البوت / السلوتات',
    slotCol: 'السلوت',
    lastUpdate: 'آخر تحديث',
    noSlots: 'لا سلوتات',
    slotConfigTitle: 'إعدادات السلوت',
    close: 'إغلاق',
    viewRaw: 'عرض JSON خام',
    viewSummary: 'عرض الملخص',
    selections: 'اختيارات العميل',
    emptySelections: 'لا اختيارات محفوظة',
    grantedSubOk: 'تم منح الاشتراك ✓',
    revokedSubOk: 'تم الإلغاء',
    grantedSlotOk: 'تم منح السلوت ✓',
    removedSlotOk: 'تمت الإزالة',
    statusUpdatedOk: 'تم تحديث الحالة',
    replyFirst: 'اكتب الرد أولًا',
    replySentOk: 'تم إرسال الرد ✓',
    copied: 'تم نسخ الكود',
    genPromosTitle: 'توليد أكواد خصم',
    countLabel: 'العدد',
    discountLabel: 'الخصم %',
    monthsLabel: 'المدة (أشهر، اختياري)',
    generate: 'توليد',
    copiedOk: 'تم توليد {n} كود ✓',
    disablePromo: 'تعطيل',
    promoList: 'الأكواد',
    codeCol: 'الكود',
    usedByCol: 'المستخدم',
    usedAtCol: 'استُخدم',
    createdAtCol: 'أُنشئ',
    discountCol: 'الخصم',
    monthsCol: 'المدة',
    noPromos: 'لا أكواد',
    status_open: 'مفتوحة',
    status_closed: 'مغلقة',
    status_active: 'نشط',
    status_cancelled: 'ملغى',
    status_used: 'مستخدم',
    status_unused: 'متاح',
    status_disabled: 'معطّل',
    status_completed: 'مكتمل',
    status_pending: 'معلّق',
    status_denied: 'مرفوض',
    status_created: 'جديد',
    status_approved: 'موافق عليه',
    status_captured: 'محتجز',
    yes: 'نعم',
    no: 'لا',
    on: 'مفعل',
    off: 'متوقف',
    fromCol: 'من',
    messagesCount: 'رسائل',
    noMessages: 'لا رسائل',
    closeTicket: 'إغلاق التذكرة',
    reopenTicket: 'إعادة فتح',
    deleteTicket: 'مسح التذكرة',
    deleteTicketConfirm: 'مسح هذه التذكرة نهائيًا مع رسائلها؟',
    ticketDeletedOk: 'تم مسح التذكرة',
    replyPlaceholder: 'اكتب ردك…',
    send: 'إرسال الرد',
    ticketsTitle: 'التذاكر',
    noTickets: 'لا تذاكر',
    subjectCol: 'الموضوع',
    refreshErr: 'تعذر التحميل',
    notifNewTicket: 'تذكرة جديدة',
    notifNewReply: 'ردّ جديد',
    notifConfigSaved: 'تم تحديث إعدادات بوت',
    notifBtnOn: 'تشغيل الإشعارات',
    notifBtnOff: 'كتم الإشعارات',
    ratioTower: 'البرج',
    ratioInf: 'مشاة',
    ratioCav: 'فرسان',
    ratioArch: 'رماة',
    ratioTotal: 'المجموع %',
    'nav.status': 'الحالة',
    statusTabTitle: 'الحالة والصيانة',
    maintenanceLabel: 'وضع الصيانة',
    maintenanceMessage: 'رسالة الصيانة',
    maintenancePlaceholder: 'رسالة للمستخدمين أثناء الصيانة…',
    maintenanceOn: 'الصيانة مفعّلة',
    maintenanceOff: 'الصيانة متوقفة',
    saveStatus: 'حفظ',
    statusSaved: 'تم الحفظ ✓',
    'nav.referrals': 'الإحالات',
    refsSearchPlaceholder: 'ابحث بالاسم أو البريد أو كود الإحالة…',
    refsReferrer: 'المحيل',
    refsReferrerCode: 'كود المحيل',
    refsInvitee: 'المدعو',
    refsJoinedAt: 'تاريخ الإحالة',
    refsProgress: 'التقدم',
    refsClaimed: 'استلم الشهر المجاني',
    refsClaimedYes: 'استلم ✓',
    refsClaimedNo: 'لم يستلم',
    refsGoalRaised: 'هدف 7 (استخدم حسمه)',
    refsGoalNormal: 'هدف 5',
    refsRefOrders: 'طلبات بحسم إحالة',
    refsTotal: 'إجمالي الإحالات',
    refsClaims: 'مكافآت مستلمة',
    refsReferrers: 'عدد المحيلين',
    refsNone: 'لا توجد إحالات',
    refsUserCode: 'كودك (رابطك)',
    refsBoundRef: 'الكود المربوط بالحساب (صديق انضم عبره)',
    refsFreeMonth: 'الشهر المجاني',
    refsUsedOwnDiscount: 'استخدم حسم صاحب الرابط',
    refsFriendsList: 'الأشخاص الذين انضموا عبر رابطك',
    refsNoFriends: 'لم يضمّ أحد بعد',
    refsProgressOf: '{n} من {goal}',
    refsOrderRef: 'كود الإحالة',
  },
  en: {
    loginSub: 'Admin Panel',
    loginBaseLabel: 'Server URL (API)',
    loginKeyLabel: 'Admin Key',
    loginBtn: 'Login',
    brandSub: 'Admin Panel',
    connOn: 'Connected',
    connOff: 'Disconnected',
    logout: 'Logout',
    refresh: 'Refresh',
    'nav.overview': 'Overview',
    'nav.users': 'Users',
    'nav.orders': 'Orders',
    'nav.tickets': 'Tickets',
    'nav.promos': 'Promo Codes',
    'nav.configs': 'Customer Selections',
    sessionExpired: 'Session expired — please sign in again',
    keyNotConfigured: 'Server key is not configured (ADMIN_API_KEY). Set it in Render settings first.',
    loginFailed: 'Login failed',
    loggedOut: 'Logged out',
    usersL: 'Users',
    activeSubs: 'Active subscriptions',
    ordersL: 'Orders',
    revenue: 'Revenue',
    revenuePending: 'Pending revenue',
    ticketsOpen: 'Open tickets',
    promoAvailable: 'Available promo codes',
    extraSlotsL: 'Extra slots',
    botConfigs: 'Bot configs',
    searchPlaceholder: 'Search by name, email or id…',
    search: 'Search',
    createUser: 'Create User',
    createUserTitle: 'Create New User',
    createUserEmail: 'Email',
    createUserUsername: 'Username',
    createUserPassword: 'Password',
    createUserBtn: 'Create',
    createUserCancel: 'Cancel',
    createUserSuccess: 'User created successfully',
    createUserFailed: 'Failed to create user',
    idCol: 'ID',
    nameCol: 'Name',
    emailCol: 'Email',
    regCol: 'Registered',
    noResults: 'No results',
    backToList: '← Back to list',
    noEmail: 'No email',
    registered: 'Joined',
    grantSub: 'Grant subscription',
    planCol: 'Plan',
    cycleCol: 'Cycle',
    priceCol: 'Price',
    statusCol: 'Status',
    endsCol: 'Ends',
    grantBtn: 'Grant',
    daysLabel: 'Days',
    grantDaysHint: 'Empty = auto (monthly/yearly)',
    monthly: 'Monthly',
    yearly: 'Yearly',
    subCount: 'Subscriptions',
    revoke: 'Cancel',
    noSubs: 'No subscriptions',
    extraSlotsTitle: 'Extra slots',
    grantExtra: '+ Grant extra slot',
    dateCol: 'Date',
    remove: 'Remove',
    noExtras: 'No extra slots',
    ordersTitle: 'Orders',
    noOrders: 'No orders',
    botSlotsTitle: 'Bot slots / configs',
    slotCol: 'Slot',
    lastUpdate: 'Last update',
    noSlots: 'No slots',
    slotConfigTitle: 'Slot config',
    close: 'Close',
    viewRaw: 'View raw JSON',
    viewSummary: 'View summary',
    selections: 'Customer selections',
    emptySelections: 'No saved selections',
    grantedSubOk: 'Subscription granted ✓',
    revokedSubOk: 'Cancelled',
    grantedSlotOk: 'Extra slot granted ✓',
    removedSlotOk: 'Removed',
    statusUpdatedOk: 'Status updated',
    replyFirst: 'Write a reply first',
    replySentOk: 'Reply sent ✓',
    copied: 'Code copied',
    genPromosTitle: 'Generate promo codes',
    countLabel: 'Count',
    discountLabel: 'Discount %',
    monthsLabel: 'Duration (months, optional)',
    generate: 'Generate',
    copiedOk: 'Generated {n} codes ✓',
    disablePromo: 'Disable',
    promoList: 'Codes',
    codeCol: 'Code',
    usedByCol: 'Used by',
    usedAtCol: 'Used at',
    createdAtCol: 'Created',
    discountCol: 'Discount',
    monthsCol: 'Duration',
    noPromos: 'No codes',
    status_open: 'Open',
    status_closed: 'Closed',
    status_active: 'Active',
    status_cancelled: 'Cancelled',
    status_used: 'Used',
    status_unused: 'Available',
    status_disabled: 'Disabled',
    status_completed: 'Completed',
    status_pending: 'Pending',
    status_denied: 'Denied',
    status_created: 'Created',
    status_approved: 'Approved',
    status_captured: 'Captured',
    yes: 'Yes',
    no: 'No',
    on: 'On',
    off: 'Off',
    fromCol: 'From',
    messagesCount: 'Messages',
    noMessages: 'No messages',
    closeTicket: 'Close ticket',
    reopenTicket: 'Reopen',
    deleteTicket: 'Delete ticket',
    deleteTicketConfirm: 'Delete this ticket permanently with its messages?',
    ticketDeletedOk: 'Ticket deleted',
    replyPlaceholder: 'Write your reply…',
    send: 'Send reply',
    ticketsTitle: 'Tickets',
    noTickets: 'No tickets',
    subjectCol: 'Subject',
    refreshErr: 'Failed to load',
    notifNewTicket: 'New ticket',
    notifNewReply: 'New reply',
    notifConfigSaved: 'Bot config updated',
    notifBtnOn: 'Turn notifications on',
    notifBtnOff: 'Mute notifications',
    ratioTower: 'Tower',
    ratioInf: 'Inf',
    ratioCav: 'Cav',
    ratioArch: 'Arch',
    ratioTotal: 'Total %',
    'nav.status': 'Status',
    statusTabTitle: 'Status & Maintenance',
    maintenanceLabel: 'Maintenance Mode',
    maintenanceMessage: 'Maintenance Message',
    maintenancePlaceholder: 'Message shown to users during maintenance…',
    maintenanceOn: 'Maintenance ON',
    maintenanceOff: 'Maintenance OFF',
    saveStatus: 'Save',
    statusSaved: 'Saved ✓',
    'nav.referrals': 'Referrals',
    refsSearchPlaceholder: 'Search by name, email, or referral code…',
    refsReferrer: 'Referrer',
    refsReferrerCode: 'Referrer code',
    refsInvitee: 'Invitee',
    refsJoinedAt: 'Referral date',
    refsProgress: 'Progress',
    refsClaimed: 'Free month claimed',
    refsClaimedYes: 'Claimed ✓',
    refsClaimedNo: 'Not claimed',
    refsGoalRaised: 'Goal 7 (used own discount)',
    refsGoalNormal: 'Goal 5',
    refsRefOrders: 'Orders with referral discount',
    refsTotal: 'Total referrals',
    refsClaims: 'Claims awarded',
    refsReferrers: 'Referrers',
    refsNone: 'No referrals yet',
    refsUserCode: 'Your referral code',
    refsBoundRef: 'Bound friend code (inviter)',
    refsFreeMonth: 'Free month',
    refsUsedOwnDiscount: 'Used link-owner discount',
    refsFriendsList: 'Friends who joined via your link',
    refsNoFriends: 'No one joined yet',
    refsProgressOf: '{n} of {goal}',
    refsOrderRef: 'Referral code',
  },
};

let lang = localStorage.getItem(LS.lang) || 'ar';
function t(key) { return (I18N[lang] && I18N[lang][key]) || key; }
function st(status) { return t('status_' + status) || status; }

/* 100%-ratio troop groups — mirrors the customer configurator (RATIO_GROUPS). */
const RATIO_GROUPS = [
  { name: 'Championship', categoryId: 'alliance_systems', groupId: 'alliance_championship', keys: ['champ_inf', 'champ_cav', 'champ_rng'] },
  { name: 'Coliseum', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t1', keys: ['col_inf', 'col_cav', 'col_arch'] },
  { name: 'Forest of Life', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t2', keys: ['fol_inf', 'fol_cav', 'fol_arch'] },
  { name: 'Crystal Cave', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t3', keys: ['cc_inf', 'cc_cav', 'cc_arch'] },
  { name: 'Knowledge Nexus', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t4', keys: ['kn_inf', 'kn_cav', 'kn_arch'] },
  { name: 'Molten Fort', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t5', keys: ['mf_inf', 'mf_cav', 'mf_arch'] },
  { name: 'Radiant Spire', categoryId: 'towers_arena', groupId: 'climb_tower', enable: 'climb_t6', keys: ['rs_inf', 'rs_cav', 'rs_arch'] },
];
function ratioGroupsIn(path) {
  if (!path || path.length !== 2) return [];
  return RATIO_GROUPS.filter((r) => r.categoryId === path[0] && r.groupId === path[1]);
}

const state = {
  base: localStorage.getItem(LS.base) || 'https://su8ldevs.eu.cc/api/panel',
  token: localStorage.getItem(LS.token) || '',
  view: 'overview',
  users: [],
  orders: [],
  tickets: [],
  promos: [],
  configs: [],
  referrals: [],
  stats: null,
  selectedUser: null,
  selectedTicket: null,
  schema: null,
  schemaPromise: null,
  cfgSlot: null,
  cfgCatId: null,
  ticketWatch: {},
  notifSeeded: false,
  notifTimer: null,
  streamCtl: null,
};

let toastTimer = null;
function toast(msg, kind) {
  const elm = $('#toast');
  elm.textContent = msg;
  elm.className = 'toast ' + (kind || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elm.classList.add('hidden'), 3500);
}

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(lang === 'ar' ? 'ar' : 'en-GB');
}

async function api(path, opts = {}) {
  const res = await fetch(state.base.replace(/\/$/, '') + path, {
    method: opts.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + state.token,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) {
    logout(true);
    throw new Error(t('sessionExpired'));
  }
  if (res.status === 503) {
    throw new Error(t('keyNotConfigured'));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

/* ── i18n / language ───────────────────────────────────── */
function setLang(next) {
  lang = next;
  localStorage.setItem(LS.lang, next);
  applyLang();
}
function applyLang() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  const label = lang === 'ar' ? 'ع / EN' : 'EN / ع';
  const l1 = $('#langBtn');
  const l2 = $('#loginLangBtn');
  if (l1) l1.textContent = label;
  if (l2) l2.textContent = label;
  document.querySelectorAll('[data-i18n]').forEach((elm) => {
    elm.textContent = t(elm.dataset.i18n);
  });
  if ($('#connStatus')) $('#connStatus').textContent = state.token ? t('connOn') : t('connOff');
  if (!$('#app').classList.contains('hidden')) loadView();
}

/* ── Auth ──────────────────────────────────────────────── */
function login() {
  const base = $('#loginBase').value.trim().replace(/\/+$/, '');
  const key = $('#loginKey').value.trim();
  const err = $('#loginErr');
  err.classList.add('hidden');
  const btn = $('#loginBtn');
  btn.disabled = true;
  fetch((base || state.base) + '/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: key }),
  })
    .then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || t('loginFailed'));
      state.base = base;
      state.token = d.token;
      localStorage.setItem(LS.base, base);
      localStorage.setItem(LS.token, d.token);
      localStorage.setItem(LS.key, key);
      showApp();
    })
    .catch((e) => {
      err.textContent = e.message;
      err.classList.remove('hidden');
    })
    .finally(() => { btn.disabled = false; });
}

function logout(soft) {
  stopNotifPoll();
  if (state.streamCtl) { state.streamCtl.abort(); state.streamCtl = null; }
  localStorage.removeItem(LS.token);
  state.token = '';
  $('#app').classList.add('hidden');
  $('#login').classList.remove('hidden');
  if (!soft) toast(t('loggedOut'));
}

/* ── Notifications ─────────────────────────────────────── */
let notifAudioCtx = null;
let notifUnlocked = false;

function ensureAudioCtx() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!notifAudioCtx || notifAudioCtx.state === 'closed') notifAudioCtx = new AC();
    if (notifAudioCtx.state === 'suspended') notifAudioCtx.resume();
    return notifAudioCtx;
  } catch { return null; }
}

document.addEventListener('click', () => {
  if (!notifUnlocked) {
    notifUnlocked = true;
    const ctx = ensureAudioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }
}, { once: false });

function beep() {
  try {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    const play = (freq, start, dur) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.05);
    };
    play(880, 0, 0.15);
    play(1100, 0.10, 0.12);
    play(1318, 0.22, 0.20);
  } catch {}
}

const notifHistory = [];
let notifBadge = 0;

function notify(title, body, action) {
  beep();
  const entry = { title, body, time: Date.now(), read: false, done: false, action: action || null, id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6) };
  notifHistory.unshift(entry);
  if (notifHistory.length > 50) notifHistory.length = 50;
  notifBadge++;
  renderNotifBadge();
  renderNotifPanel();
  toast(title + ' — ' + body, 'ok');
  try {
    if (typeof window.desktopNotify === 'function') {
      window.desktopNotify(title, body).catch(() => {});
    } else if (window.Notification && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'logo.png', silent: true });
    }
  } catch {}
}

function notifNavigate(nid) {
  const entry = notifHistory.find(n => n.id === nid);
  if (!entry || !entry.action) return;
  entry.read = true;
  const a = entry.action;
  if (a.view) switchView(a.view);
  if (a.view === 'tickets' && a.id) {
    setTimeout(() => openTicket(a.id).catch(() => {}), 200);
  }
  if (a.view === 'users' && a.id) {
    setTimeout(() => { state.selectedUser = a.id; loadView(); }, 200);
  }
  renderNotifPanel();
}

function toggleDone(nid) {
  const entry = notifHistory.find(n => n.id === nid);
  if (!entry) return;
  entry.done = !entry.done;
  renderNotifPanel();
}

function toggleNotifRead(nid) {
  const entry = notifHistory.find(n => n.id === nid);
  if (!entry) return;
  entry.read = !entry.read;
  if (!entry.read) notifBadge++;
  else notifBadge = Math.max(0, notifBadge - 1);
  renderNotifBadge();
  renderNotifPanel();
}

async function pollTickets() {
  if (!state.token) return;
  let tickets;
  try {
    tickets = (await api('/tickets')).tickets || [];
  } catch { return; }
  const now = {};
  for (const tk of tickets) {
    const count = tk.messages_count || 0;
    const prev = state.ticketWatch[tk.id];
    now[tk.id] = count;
    if (!prev) {
      if (state.notifSeeded) notify(t('notifNewTicket'), '#' + tk.id + ' — ' + (tk.subject || ''), { view: 'tickets', id: tk.id });
    } else if (count > prev && tk.last_message_author !== 'staff') {
      notify(t('notifNewReply'), '#' + tk.id + ' — ' + (tk.subject || ''), { view: 'tickets', id: tk.id });
    }
  }
  state.ticketWatch = now;
  state.notifSeeded = true;
}

/* ── Config change polling ─────────────────────────────── */
const configWatch = {};
let configSeeded = false;

async function pollConfigChanges() {
  if (!state.token) return;
  try {
    const d = await api('/config-changes');
    const changes = d.changes || [];
    for (const c of changes) {
      const prev = configWatch[c.slot_id];
      if (prev && prev === c.updated_at) continue;
      configWatch[c.slot_id] = c.updated_at;
      if (configSeeded) {
        notify(t('notifConfigSaved'), (c.username || '') + ' — ' + (c.name || c.slot_id), { view: 'configs', id: c.slot_id });
      }
    }
    configSeeded = true;
  } catch { /* ignore */ }
}

function startNotifPoll() {
  stopNotifPoll();
  state.notifSeeded = false;
  state.ticketWatch = {};
  configSeeded = false;
  pollTickets();
  pollConfigChanges();
  state.notifTimer = setInterval(() => { pollTickets(); pollConfigChanges(); }, 10000);
}
function stopNotifPoll() {
  if (state.notifTimer) {
    clearInterval(state.notifTimer);
    state.notifTimer = null;
  }
}

/* ── Live ticket stream (SSE) ──────────────────────────── */
function connectTicketStream() {
  if (state.streamCtl || !state.token) return;
  const ctl = new AbortController();
  state.streamCtl = ctl;
  (async () => {
    try {
      const res = await fetch(state.base.replace(/\/$/, '') + '/tickets/stream', {
        headers: { Authorization: 'Bearer ' + state.token },
        signal: ctl.signal,
      });
      if (!res.ok || !res.body) throw new Error('stream ' + res.status);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const line = chunk.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          let evt;
          try { evt = JSON.parse(line.slice(5).trim()); } catch { continue; }
          onTicketStreamEvent(evt);
        }
      }
    } catch {
      /* stream dropped — retry below */
    }
    if (state.streamCtl === ctl && state.token) {
      state.streamCtl = null;
      setTimeout(connectTicketStream, 5000);
    }
  })();
}

function onTicketStreamEvent(evt) {
  if (!evt || evt.ticketId === undefined) return;
  // Re-fetch instantly so the count-based notification fires without the 20s wait.
  if (state.token) pollTickets();
  // If the admin is viewing that ticket, reload it so the message appears live
  // (preserving the reply draft). The admin's own replies are excluded — they
  // already trigger a reload in doAction.
  const open = state.selectedTicket && state.selectedTicket.ticket;
  if (open && open.id === evt.ticketId && evt.author !== 'staff') {
    const draft = $('#replyBody') ? $('#replyBody').value : '';
    openTicket(evt.ticketId).then(() => {
      const box = $('#replyBody');
      if (box && draft) box.value = draft;
    }).catch(() => {});
    return;
  }
  // Refresh the tickets table (counts / new rows) when the list is on screen.
  if (state.view === 'tickets' && !state.selectedTicket) {
    loadTickets().catch(() => {});
  }
}

function renderNotifBtn() {
  const b = $('#notifBtn');
  if (!b) return;
  b.innerHTML = '🔔<span id="notifBadge" class="notif-badge' + (notifBadge > 0 ? ' show' : '') + '">' + (notifBadge > 99 ? '99+' : notifBadge) + '</span>';
}

function renderNotifBadge() {
  const badge = $('#notifBadge');
  if (!badge) return renderNotifBtn();
  badge.textContent = notifBadge > 99 ? '99+' : notifBadge;
  badge.classList.toggle('show', notifBadge > 0);
}

function renderNotifPanel() {
  const panel = $('#notifPanel');
  if (!panel) return;
  if (notifHistory.length === 0) {
    panel.innerHTML = '<div class="notif-empty">' + (lang === 'ar' ? 'لا إشعارات' : 'No notifications') + '</div>';
    return;
  }
  const doneCount = notifHistory.filter(n => n.done).length;
  const totalCount = notifHistory.length;
  panel.innerHTML =
    '<div class="notif-header">' +
      '<span class="notif-header-title">' + (lang === 'ar' ? 'الإشعارات' : 'Notifications') + ' <small>(' + doneCount + '/' + totalCount + ')</small></span>' +
      '<button class="notif-mark-all" onclick="notifMarkAllDone()">' + (lang === 'ar' ? 'تحديد الكل كمنجز' : 'Mark all done') + '</button>' +
    '</div>' +
    notifHistory.slice(0, 30).map((n) => {
    const t2 = new Date(n.time);
    const timeStr = t2.toLocaleTimeString(lang === 'ar' ? 'ar' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
    const dateStr = t2.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', { day: '2-digit', month: '2-digit' });
    const hasAction = n.action ? ' clickable' : '';
    const doneClass = n.done ? ' done' : '';
    const unreadClass = n.read ? '' : ' unread';
    return '<div class="notif-item' + unreadClass + doneClass + hasAction + '" data-nid="' + n.id + '">' +
      '<div class="notif-item-main" onclick="notifNavigate(\'' + n.id + '\')">' +
        '<div class="notif-item-title">' + n.title + '</div>' +
        '<div class="notif-item-body">' + n.body + '</div>' +
        '<div class="notif-item-time">' + dateStr + ' ' + timeStr + (n.action ? ' · ' + (lang === 'ar' ? 'اضغط للانتقال' : 'Click to go') : '') + '</div>' +
      '</div>' +
      '<div class="notif-item-actions">' +
        (n.done
          ? '<button class="notif-btn-done" onclick="event.stopPropagation(); toggleDone(\'' + n.id + '\')" title="' + (lang === 'ar' ? 'إلغاء التنفيذ' : 'Undo') + '">✓</button>'
          : '<button class="notif-btn-undone" onclick="event.stopPropagation(); toggleDone(\'' + n.id + '\')" title="' + (lang === 'ar' ? 'تم التنفيذ' : 'Mark done') + '">○</button>') +
      '</div>' +
    '</div>';
  }).join('');
}

function notifMarkAllDone() {
  notifHistory.forEach(n => { n.done = true; n.read = true; });
  notifBadge = 0;
  renderNotifBadge();
  renderNotifPanel();
}

function toggleNotifPanel() {
  const panel = $('#notifPanel');
  if (!panel) return;
  const isVisible = !panel.classList.contains('hidden');
  if (!isVisible) {
    notifHistory.forEach(n => { n.read = true; });
    notifBadge = 0;
    renderNotifBadge();
    renderNotifPanel();
  }
  panel.classList.toggle('hidden');
}

/* ── Navigation ────────────────────────────────────────── */
function switchView(v) {
  state.view = v;
  state.selectedUser = null;
  state.selectedTicket = null;
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  $('#viewTitle').textContent = t('nav.' + v) + (lang === 'ar' ? ' · ' : ' — ') + (v.charAt(0).toUpperCase() + v.slice(1));
  loadView();
}

function showApp() {
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#connStatus').classList.add('on');
  $('#connStatus').textContent = t('connOn');
  if (window.Notification && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
  renderNotifBtn();
  renderNotifPanel();
  startNotifPoll();
  connectTicketStream();
  loadView();
}

function loadView() {
  const v = state.view;
  if (v === 'overview') loadStats();
  else if (v === 'users') loadUsers();
  else if (v === 'orders') loadOrders();
  else if (v === 'referrals') loadReferrals();
  else if (v === 'tickets') loadTickets();
  else if (v === 'promos') loadPromos();
  else if (v === 'configs') loadConfigs();
  else if (v === 'status') loadStatus();
}

/* ── Overview ──────────────────────────────────────────── */
async function loadStats() {
  try {
    state.stats = await api('/stats');
    renderStats();
  } catch (e) { renderError(e); }
}
function renderStats() {
  const s = state.stats;
  const cards = [
    [t('usersL'), s.users, ''],
    [t('activeSubs'), s.activeSubs, ''],
    [t('ordersL'), s.orders, ''],
    [t('revenue'), '$' + s.revenue, ''],
    [t('revenuePending'), '$' + s.revenuePending, 'amber'],
    [t('ticketsOpen'), s.ticketsOpen, s.ticketsOpen > 0 ? 'red' : ''],
    [t('promoAvailable'), s.promoCount, ''],
    [t('extraSlotsL'), s.extraSlots, ''],
    [t('botConfigs'), s.configs, ''],
    [t('refsTotal'), s.referrals, ''],
    [t('refsRefOrders'), s.referralOrders, ''],
    [t('refsClaims'), s.referralClaims, s.referralClaims > 0 ? 'green' : ''],
  ];
  $('#view').innerHTML =
    '<div class="cards">' +
    cards.map((c) => `<div class="stat"><div class="num" style="${c[2] === 'amber' ? 'color:#fcd34d;-webkit-text-fill-color:#fcd34d;' : ''}${c[2] === 'red' ? 'color:#fda4af;-webkit-text-fill-color:#fda4af;' : ''}${c[2] === 'green' ? 'color:#6ee7b7;-webkit-text-fill-color:#6ee7b7;' : ''}">${c[1]}</div><div class="lab">${c[0]}</div></div>`).join('') +
    '</div>';
}

/* ── Users ─────────────────────────────────────────────── */

function showCreateUserModal() {
  const overlay = el(`<div class="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;display:flex;align-items:center;justify-content:center;">
    <div class="panel" style="width:380px;max-width:90vw;">
      <h3>${t('createUserTitle')}</h3>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px;">
        <input id="cuEmail" class="input" type="email" placeholder="${t('createUserEmail')}" />
        <input id="cuUsername" class="input" placeholder="${t('createUserUsername')}" />
        <input id="cuPassword" class="input" type="password" placeholder="${t('createUserPassword')}" />
        <div class="row" style="justify-content:flex-end;gap:8px;">
          <button class="btn ghost" id="cuCancel">${t('createUserCancel')}</button>
          <button class="btn success" id="cuSubmit">${t('createUserBtn')}</button>
        </div>
      </div>
    </div>
  </div>`);
  document.body.appendChild(overlay);
  overlay.querySelector('#cuCancel').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#cuSubmit').addEventListener('click', async () => {
    const email = overlay.querySelector('#cuEmail').value.trim();
    const username = overlay.querySelector('#cuUsername').value.trim();
    const password = overlay.querySelector('#cuPassword').value;
    if (!email || !username || !password) return;
    try {
      await api('/auth/create-user', { method: 'POST', body: { email, username, password } });
      overlay.remove();
      alert(t('createUserSuccess'));
      loadUsers();
    } catch (err) {
      alert(t('createUserFailed') + ': ' + (err.message || err));
    }
  });
}

async function loadUsers(q) {
  const query = (q || $('#userSearch')?.value || '').trim();
  try {
    state.users = (await api('/users?q=' + encodeURIComponent(query))).users;
    renderUsers();
  } catch (e) { renderError(e); }
}
function renderUsers() {
  const rows = state.users.map((u) => `
    <tr class="clickable" data-action="user" data-id="${u.id}">
      <td class="mono">${u.id}</td>
      <td>${escapeHtml(u.username)}</td>
      <td dir="ltr">${u.email || '—'}</td>
      <td>${fmtDate(u.created_at)}</td>
    </tr>`).join('');
  $('#view').innerHTML = `
    <div class="search-row">
      <input id="userSearch" class="input" placeholder="${t('searchPlaceholder')}" value="${escapeHtml(($('#userSearch')?.value || ''))}" />
      <button class="btn ghost" id="userSearchBtn">${t('search')}</button>
      <button class="btn success" id="createUserBtn">${t('createUser')}</button>
    </div>
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>${t('idCol')}</th><th>${t('nameCol')}</th><th>${t('emailCol')}</th><th>${t('regCol')}</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="4" class="muted">' + t('noResults') + '</td></tr>'}</tbody>
      </table>
    </div>`;
}

async function openUser(id) {
  try {
    state.selectedUser = await api('/users/' + encodeURIComponent(id));
    renderUserDetail();
  } catch (e) { renderError(e); }
}
function renderUserDetail() {
  const u = state.selectedUser;
  const subs = u.subscriptions || [];
  const extra = u.extraSlots || [];
  const orders = u.orders || [];
  const slots = u.botSlots || [];

  const subRows = subs.map((s) => `
    <tr>
      <td class="mono">${s.id}</td>
      <td>${escapeHtml(s.plan_name || s.plan_key)}</td>
      <td>${s.cycle}</td>
      <td>$${s.amount}</td>
      <td><span class="badge ${s.status === 'active' ? 'green' : 'red'}">${st(s.status)}</span></td>
      <td>${fmtDate(s.current_period_end)}</td>
      <td>${s.status === 'active' ? `<button class="btn danger small" data-action="revoke-sub" data-sub="${s.id}">${t('revoke')}</button>` : ''}</td>
    </tr>`).join('');

  const extraRows = extra.map((e) => `
    <tr>
      <td class="mono">${e.id}</td>
      <td>$${e.amount}</td>
      <td>${fmtDate(e.created_at)}</td>
      <td><button class="btn danger small" data-action="revoke-slot" data-slot="${e.id}">${t('remove')}</button></td>
    </tr>`).join('');

  const orderRows = orders.map((o) => `
    <tr>
      <td class="mono">${o.id}</td>
      <td>${escapeHtml(o.plan_name || o.plan_key)}</td>
      <td>$${o.amount}</td>
      <td><span class="badge ${o.status === 'completed' ? 'green' : o.status === 'pending' ? 'amber' : 'red'}">${st(o.status)}</span></td>
      <td>${fmtDate(o.created_at)}</td>
    </tr>`).join('');

  const slotRows = slots.map((s) => `
    <tr class="clickable" data-action="slot" data-slot="${s.id}">
      <td class="mono">${s.id}</td>
      <td>${escapeHtml(s.name || '')}</td>
      <td>${fmtDate(s.updated_at)}</td>
    </tr>`).join('');

  $('#view').innerHTML = `
    <button class="btn ghost small back" data-action="back-users">${t('backToList')}</button>
    <div class="panel">
      <h3>${escapeHtml(u.user.username)} · ${u.user.email || t('noEmail')}</h3>
      <div class="row">
        <span class="badge purple mono">${u.user.id}</span>
        <span class="muted">${t('registered')}: ${fmtDate(u.user.created_at)}</span>
      </div>
    </div>

    <div class="panel">
      <h3>${t('grantSub')}</h3>
      <div class="row">
        <select id="grantPlan" class="input grow">
          <option value="starter">Starter — $18/${t('monthly').toLowerCase()}</option>
          <option value="elite">Elite — $22/${t('monthly').toLowerCase()}</option>
        </select>
        <select id="grantCycle" class="input">
          <option value="monthly">${t('monthly')}</option>
          <option value="yearly">${t('yearly')}</option>
        </select>
        <input id="grantDays" class="input" type="number" min="1" max="3650" style="width:110px" placeholder="${t('daysLabel')}" title="${t('grantDaysHint')}" />
        <button class="btn success" id="grantSubBtn">${t('grantBtn')}</button>
      </div>
      <h3 class="mt">${t('subCount')} (${subs.length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${t('idCol')}</th><th>${t('planCol')}</th><th>${t('cycleCol')}</th><th>${t('priceCol')}</th><th>${t('statusCol')}</th><th>${t('endsCol')}</th><th></th></tr></thead>
          <tbody>${subRows || '<tr><td colspan="7" class="muted">' + t('noSubs') + '</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h3>${t('extraSlotsTitle')} (${extra.length})</h3>
      <button class="btn success small mt" data-action="grant-slot">${t('grantExtra')}</button>
      <div class="table-wrap mt">
        <table>
          <thead><tr><th>${t('idCol')}</th><th>${t('priceCol')}</th><th>${t('dateCol')}</th><th></th></tr></thead>
          <tbody>${extraRows || '<tr><td colspan="4" class="muted">' + t('noExtras') + '</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h3>${t('ordersTitle')} (${orders.length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${t('idCol')}</th><th>${t('planCol')}</th><th>${t('priceCol')}</th><th>${t('statusCol')}</th><th>${t('dateCol')}</th></tr></thead>
          <tbody>${orderRows || '<tr><td colspan="5" class="muted">' + t('noOrders') + '</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h3>${t('botSlotsTitle')} (${slots.length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${t('slotCol')} ID</th><th>${t('nameCol')}</th><th>${t('lastUpdate')}</th></tr></thead>
          <tbody>${slotRows || '<tr><td colspan="3" class="muted">' + t('noSlots') + '</td></tr>'}</tbody>
        </table>
      </div>
    </div>

    ${renderUserReferral(u)}`;
}

function renderUserReferral(u) {
  const ref = u.referral || {};
  const inviteeRows = (ref.invitees || []).map((i) => `
    <tr>
      <td>${escapeHtml(i.username)}</td>
      <td dir="ltr">${i.email || '—'}</td>
      <td>${fmtDate(i.joinedAt)}</td>
    </tr>`).join('');
  const goalBadge = ref.goal === 7
    ? `<span class="badge red">${t('refsGoalRaised')}</span>`
    : `<span class="badge slate">${t('refsGoalNormal')}</span>`;
  const claimedBadge = ref.claimed
    ? `<span class="badge green">${t('refsClaimedYes')}</span>`
    : `<span class="muted">${t('refsClaimedNo')}</span>`;
  return `
    <div class="panel">
      <h3>${t('nav.referrals')} — ${t('refsProgressOf').replace('{n}', ref.count ?? 0).replace('{goal}', ref.goal ?? 5)}</h3>
      <div class="row" style="flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        ${ref.code ? `<span class="copy-chip mono" dir="ltr">${escapeHtml(ref.code)} <button data-action="copy" data-id="${escapeHtml(ref.code)}" title="${t('copied')}">⧉</button></span>` : `<span class="muted">${t('refsUserCode')}: —</span>`}
        ${ref.boundRef ? `<span class="badge purple" dir="ltr" title="${t('refsBoundRef')}">↦ ${escapeHtml(ref.boundRef)}</span>` : ''}
        ${ref.usedOwnDiscount ? `<span class="badge amber">${t('refsUsedOwnDiscount')}</span>` : ''}
        ${goalBadge}
        <span>${t('refsFreeMonth')}: ${claimedBadge}</span>
      </div>
      <h3 class="mt">${t('refsFriendsList')} (${(ref.invitees || []).length})</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${t('nameCol')}</th><th>${t('emailCol')}</th><th>${t('dateCol')}</th></tr></thead>
          <tbody>${inviteeRows || '<tr><td colspan="3" class="muted">' + t('refsNoFriends') + '</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;
}

/* ── Config summary rendering (schema-driven mirror of the customer UI) ───── */
function parseCfgObject(slot) {
  const c = slot.cfg ?? slot.bot_config ?? slot.config ?? slot.botConfig ?? {};
  if (typeof c === 'string') {
    try { return JSON.parse(c); } catch { return {}; }
  }
  return c && typeof c === 'object' && !Array.isArray(c) ? c : {};
}

function getValue(root, path) {
  let cur = root;
  for (const k of path) {
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) cur = cur[k];
    else return undefined;
  }
  return cur;
}

function fetchSchema() {
  if (state.schema) return Promise.resolve(state.schema);
  if (state.schemaPromise) return state.schemaPromise;
  state.schemaPromise = api('/schema')
    .then((d) => {
      state.schema = d.schema;
      return d.schema;
    })
    .catch((e) => {
      state.schemaPromise = null;
      throw e;
    });
  return state.schemaPromise;
}

function formatCfgValue(f, value) {
  switch (f.type) {
    case 'boolean':
      return value ? t('on') : t('off');
    case 'number':
    case 'slider':
      return value == null ? '—' : String(value) + (f.unit ? ' ' + f.unit : '');
    default:
      return value == null || value === '' ? '—' : String(value);
  }
}

function rangeTrack(f, value) {
  if (f.type !== 'slider' && !(f.type === 'number' && f.min != null && f.max != null)) return '';
  if (f.min == null || f.max == null || f.max <= f.min) return '';
  const pct = Math.max(0, Math.min(100, ((Number(value) - f.min) / (f.max - f.min)) * 100));
  return `<div class="range-track"><div class="range-fill" style="width:${pct}%"></div><span class="range-knob" style="left:${pct}%"></span></div>`;
}

function booleanRow(f, value) {
  return `<div class="cfg-bool-row">
    <span class="mini-toggle ${value ? 'on' : ''}"></span>
    <span class="cfg-bool-label">${escapeHtml(f.label)}</span>
    <span class="cfg-bool-val ${value ? 'on' : 'off'}">${value ? t('on') : t('off')}</span>
  </div>`;
}

function fieldCell(f, value) {
  return `<div class="cfg-field-cell">
    <div class="k">${escapeHtml(f.label)}</div>
    <div class="v">${escapeHtml(formatCfgValue(f, value))}</div>
    ${rangeTrack(f, value)}
  </div>`;
}

function ratioRow(rg, path, cfg) {
  const vals = rg.keys.map((k) => Number(getValue(cfg, [...path, k])) || 0);
  const sum = vals.reduce((a, b) => a + b, 0);
  const ok = sum === 100;
  const enabled = rg.enable ? Boolean(getValue(cfg, [...path, rg.enable])) : true;
  return `<div class="ratio-row ${ok ? '' : 'bad'} ${enabled ? '' : 'dim'}">
    <span class="tgl">${rg.enable ? `<span class="mini-toggle ${enabled ? 'on' : ''}"></span>` : '⚡'}</span>
    <span class="name">${escapeHtml(rg.name)}</span>
    ${vals.map((v) => `<span class="val">${v}</span>`).join('')}
    <span class="total ${ok ? 'ok' : 'bad'}">${sum}%</span>
  </div>`;
}

function ratioGrid(rgs, path, cfg) {
  return `<div class="ratio-grid">
    <div class="ratio-row head"><span class="tgl"></span><span class="name">${t('ratioTower')}</span><span class="val">${t('ratioInf')}</span><span class="val">${t('ratioCav')}</span><span class="val">${t('ratioArch')}</span><span class="total">${t('ratioTotal')}</span></div>
    ${rgs.map((rg) => ratioRow(rg, path, cfg)).join('')}
  </div>`;
}

function ratioBadges(path, cfg) {
  const rgs = ratioGroupsIn(path);
  if (!rgs.length) return '';
  return `<div class="ratio-badges">${rgs.map((rg) => {
    const vals = rg.keys.map((k) => Number(getValue(cfg, [...path, k])) || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    return `<span class="badge ${sum === 100 ? 'green' : 'amber'}">${escapeHtml(rg.name)}: ${sum}%</span>`;
  }).join('')}</div>`;
}

function renderCategory(cat, path, cfg) {
  const rgs = ratioGroupsIn(path);
  const isRatioGrid = rgs.length > 1;
  const gridKeys = new Set(rgs.flatMap((r) => r.keys));
  const gridEnableKeys = new Set(rgs.flatMap((r) => (r.enable ? [r.enable] : [])));
  const booleans = (cat.fields ?? []).filter((f) => f.type === 'boolean' && !gridEnableKeys.has(f.key));
  const others = (cat.fields ?? []).filter((f) => f.type !== 'boolean' && (!isRatioGrid || !gridKeys.has(f.key)));

  const html = [];
  if (path.length === 1) {
    html.push(`<h3 class="cfg-cat-title">${cat.icon || '⚙️'} ${escapeHtml(cat.title)}</h3>`);
    if (cat.description) html.push(`<p class="muted">${escapeHtml(cat.description)}</p>`);
  }
  booleans.forEach((f) => html.push(booleanRow(f, getValue(cfg, [...path, f.key]))));
  if (others.length) {
    html.push(`<div class="cfg-fields-grid">${others.map((f) => fieldCell(f, getValue(cfg, [...path, f.key]))).join('')}</div>`);
  }
  if (isRatioGrid) html.push(ratioGrid(rgs, path, cfg));
  for (const g of cat.groups ?? []) {
    html.push(`<div class="cfg-group-card">
      <h4>${g.icon || '▸'} ${escapeHtml(g.title)}</h4>
      ${renderCategory(g, [...path, g.id], cfg)}
      ${ratioBadges([...path, g.id], cfg)}
    </div>`);
  }
  return html.join('');
}

function renderCfgCats() {
  const cats = (state.schema.categories ?? []).map((c) => `
    <button class="cfg-cat ${c.id === state.cfgCatId ? 'active' : ''}" data-action="cfg-cat" data-id="${c.id}">
      <span>${c.icon || '⚙️'}</span><span>${escapeHtml(c.title)}</span>
    </button>`).join('');
  const elm = $('#cfgCats');
  if (elm) elm.innerHTML = cats || '';
}

function renderCfgContent() {
  const cfg = parseCfgObject(state.cfgSlot);
  const cat = (state.schema.categories ?? []).find((c) => c.id === state.cfgCatId);
  const elm = $('#cfgContent');
  if (!elm) return;
  if (!cat) {
    elm.innerHTML = '<p class="muted">' + t('emptySelections') + '</p>';
    return;
  }
  elm.innerHTML = renderCategory(cat, [cat.id], cfg);
}

async function renderSummary(slot, title) {
  let schema;
  try {
    schema = await fetchSchema();
  } catch (e) {
    toast(e.message || String(e), 'error');
    return;
  }
  state.cfgSlot = slot;
  state.cfgTitle = title;
  if (!state.cfgCatId || !(schema.categories ?? []).some((c) => c.id === state.cfgCatId)) {
    state.cfgCatId = (schema.categories[0] ?? {}).id ?? null;
  }
  const raw = JSON.stringify(parseCfgObject(slot), null, 2);
  const overlay = el(`<div class="panel cfg-detail">
    <div class="row">
      <h3 class="grow">${t('slotConfigTitle')} — ${escapeHtml(title)}</h3>
      <button class="btn ghost small" data-action="toggle-raw">${t('viewRaw')}</button>
      <button class="btn ghost small" data-action="close-json">${t('close')}</button>
    </div>
    <div class="cfg-layout mt" id="cfgLayout">
      <aside class="cfg-cats" id="cfgCats"></aside>
      <div class="cfg-content" id="cfgContent"></div>
    </div>
    <pre class="json-view mt hidden" id="cfgRaw" dir="ltr">${escapeHtml(raw)}</pre>
  </div>`);
  $('#view').appendChild(overlay);
  renderCfgCats();
  renderCfgContent();
}

function showSlotConfig(slotId) {
  const s = state.selectedUser.botSlots.find((x) => x.id === slotId);
  if (!s) return;
  renderSummary(s, s.name || s.id);
}
function showCfg(slotId) {
  const c = state.configs.find((x) => x.slot_id === slotId);
  if (!c) return;
  renderSummary(c, (c.username || '') + ' — ' + (c.name || c.slot_id));
}

/* ── Orders ────────────────────────────────────────────── */
async function loadOrders() {
  try {
    state.orders = (await api('/orders')).orders;
    renderOrders();
  } catch (e) { renderError(e); }
}
function renderOrders() {
  const rows = state.orders.map((o) => `
    <tr>
      <td class="mono">${o.id}</td>
      <td>${escapeHtml(o.username)}</td>
      <td dir="ltr">${o.email || '—'}</td>
      <td>${o.plan_name || o.plan_key}</td>
      <td>$${o.amount}</td>
      <td><span class="badge ${o.status === 'completed' ? 'green' : o.status === 'pending' ? 'amber' : 'red'}">${st(o.status)}</span></td>
      <td class="mono" dir="ltr">${o.promo_code || '—'}</td>
      <td class="mono" dir="ltr">${o.referral_code ? '<span class="badge purple" title="' + t('refsRefOrders') + '">REF ' + escapeHtml(o.referral_code) + '</span>' : '—'}</td>
      <td>${o.extra_slot ? t('yes') : '—'}</td>
      <td>${fmtDate(o.created_at)}</td>
    </tr>`).join('');
  $('#view').innerHTML = `
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>${t('idCol')}</th><th>${t('nameCol')}</th><th>${t('emailCol')}</th><th>${t('planCol')}</th><th>${t('priceCol')}</th><th>${t('statusCol')}</th><th>${t('codeCol')}</th><th>${t('refsOrderRef')}</th><th>${t('slotCol')}</th><th>${t('dateCol')}</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="10" class="muted">' + t('noOrders') + '</td></tr>'}</tbody>
      </table>
    </div>`;
}

/* ── Tickets ───────────────────────────────────────────── */
async function loadTickets() {
  try {
    state.tickets = (await api('/tickets')).tickets;
    renderTickets();
  } catch (e) { renderError(e); }
}
function renderTickets() {
  const rows = state.tickets.map((tk) => `
    <tr class="clickable" data-action="ticket" data-id="${tk.id}">
      <td class="mono">#${tk.id}</td>
      <td>${escapeHtml(tk.username)}</td>
      <td>${escapeHtml(tk.subject)}</td>
      <td><span class="badge ${tk.status === 'open' ? 'green' : 'slate'}">${st(tk.status)}</span></td>
      <td>${tk.messages_count || 0}</td>
      <td>${fmtDate(tk.updated_at)}</td>
    </tr>`).join('');
  $('#view').innerHTML = `
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>#</th><th>${t('nameCol')}</th><th>${t('subjectCol')}</th><th>${t('statusCol')}</th><th>${t('messagesCount')}</th><th>${t('lastUpdate')}</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="muted">' + t('noTickets') + '</td></tr>'}</tbody>
      </table>
    </div>`;
}

async function openTicket(id) {
  try {
    state.selectedTicket = await api('/tickets/' + id);
    renderTicketDetail();
  } catch (e) { renderError(e); }
}
function renderTicketDetail() {
  const d = state.selectedTicket;
  const tk = d.ticket;
  const msgs = (d.messages || []).map((m) => `
    <div class="msg-bubble ${m.author === 'staff' ? 'staff' : ''}">
      <div class="msg-head"><span>${m.author === 'staff' ? 'SU8L Staff' : escapeHtml(d.user.username)}</span><span>${fmtDate(m.created_at)}</span></div>
      <div class="msg-body">${escapeHtml(m.body)}</div>
    </div>`).join('');

  $('#view').innerHTML = `
    <button class="btn ghost small back" data-action="back-tickets">${t('backToList')}</button>
    <div class="panel">
      <h3>#${tk.id} — ${escapeHtml(tk.subject)}</h3>
      <div class="row">
        <span class="muted">${t('fromCol')}: ${escapeHtml(d.user.username)} (${d.user.email || '—'})</span>
        <span class="badge ${tk.status === 'open' ? 'green' : 'slate'}">${st(tk.status)}</span>
        <span class="badge purple">${tk.priority}</span>
        <button class="btn ghost small" data-action="ticket-status" data-id="${tk.id}" data-status="${tk.status === 'open' ? 'closed' : 'open'}">
          ${tk.status === 'open' ? t('closeTicket') : t('reopenTicket')}
        </button>
        <button class="btn danger small" data-action="ticket-delete" data-id="${tk.id}">${t('deleteTicket')}</button>
      </div>
    </div>
    <div class="panel">
      <h3>${t('messagesCount')}</h3>
      ${msgs || '<p class="muted">' + t('noMessages') + '</p>'}
      <textarea id="replyBody" class="input mt" rows="3" placeholder="${t('replyPlaceholder')}"></textarea>
      <button class="btn primary mt" id="replyBtn">${t('send')}</button>
    </div>`;
}

/* ── Promos ────────────────────────────────────────────── */
async function loadPromos() {
  try {
    state.promos = (await api('/promos')).promos;
    renderPromos();
  } catch (e) { renderError(e); }
}
function codeChips(codes) {
  return codes.map((c) => `
    <span class="copy-chip mono" dir="ltr">${escapeHtml(c)} <button data-action="copy" data-id="${escapeHtml(c)}">⧉</button></span>`).join(' ');
}
function renderPromos() {
  const rows = state.promos.map((p) => `
    <tr>
      <td class="mono" dir="ltr">${escapeHtml(p.code)}</td>
      <td><span class="badge purple" dir="ltr">-${p.discount}%</span></td>
      <td>${p.max_months ? '<span class="badge blue" dir="ltr">' + p.max_months + ' mo</span>' : '—'}</td>
      <td><span class="badge ${p.status === 'unused' ? 'green' : p.status === 'used' ? 'amber' : 'red'}">${st(p.status)}</span></td>
      <td class="mono">${p.used_by || '—'}</td>
      <td>${fmtDate(p.used_at)}</td>
      <td>${fmtDate(p.created_at)}</td>
      <td>${p.status === 'unused' ? `<button class="btn danger small" data-action="disable-promo" data-id="${p.id}">${t('disablePromo')}</button>` : ''}</td>
    </tr>`).join('');
  $('#view').innerHTML = `
    <div class="panel">
      <h3>${t('genPromosTitle')}</h3>
      <div class="promo-gen">
        <div class="field">
          <label>${t('countLabel')}</label>
          <input id="promoCount" class="input" type="number" min="1" max="100" value="1" style="width:90px" />
        </div>
        <div class="field">
          <label>${t('discountLabel')}</label>
          <input id="promoDiscount" class="input" type="number" min="1" max="100" value="20" style="width:90px" />
        </div>
        <div class="field">
          <label>${t('monthsLabel')}</label>
          <input id="promoMonths" class="input" type="number" min="1" max="24" placeholder="—" style="width:90px" />
        </div>
        <button class="btn success" id="genPromoBtn">${t('generate')}</button>
      </div>
      <div class="row mt" id="promoResult"></div>
    </div>
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>${t('codeCol')}</th><th>${t('discountCol')}</th><th>${t('monthsCol')}</th><th>${t('statusCol')}</th><th>${t('usedByCol')}</th><th>${t('usedAtCol')}</th><th>${t('createdAtCol')}</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" class="muted">' + t('noPromos') + '</td></tr>'}</tbody>
      </table>
    </div>`;
}

/* ── Referrals ─────────────────────────────────────────── */
async function loadReferrals(q) {
  const query = (q || $('#refSearch')?.value || '').trim();
  try {
    state.referrals = (await api('/referrals?q=' + encodeURIComponent(query))).referrals;
    renderReferrals();
  } catch (e) { renderError(e); }
}
function renderReferrals() {
  const rows = state.referrals.map((r) => `
    <tr class="clickable" data-action="ref-user" data-id="${r.referrer_user_id}">
      <td>${escapeHtml(r.referrer_username)}</td>
      <td class="mono" dir="ltr">${escapeHtml(r.referrer_code || '—')}</td>
      <td>${escapeHtml(r.invitee_username)}</td>
      <td dir="ltr">${r.invitee_email || '—'}</td>
      <td>
        <span class="badge ${r.referrer_count >= r.referrer_goal ? 'green' : 'amber'}">${t('refsProgressOf').replace('{n}', r.referrer_count).replace('{goal}', r.referrer_goal)}</span>
        ${r.goal_raised ? `<span class="badge red">${t('refsGoalRaised')}</span>` : ''}
      </td>
      <td>${r.claimed ? `<span class="badge green">${t('refsClaimedYes')}</span>` : `<span class="muted">${t('refsClaimedNo')}</span>`}</td>
      <td>${fmtDate(r.created_at)}</td>
    </tr>`).join('');
  $('#view').innerHTML = `
    <div class="search-row">
      <input id="refSearch" class="input" placeholder="${t('refsSearchPlaceholder')}" value="${escapeHtml(($('#refSearch')?.value || ''))}" />
      <button class="btn ghost" id="refSearchBtn">${t('search')}</button>
    </div>
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>${t('refsReferrer')}</th><th>${t('refsReferrerCode')}</th><th>${t('refsInvitee')}</th><th>${t('emailCol')}</th><th>${t('refsProgress')}</th><th>${t('refsClaimed')}</th><th>${t('refsJoinedAt')}</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7" class="muted">' + t('refsNone') + '</td></tr>'}</tbody>
      </table>
    </div>`;
}

/* ── Configs (customer choices) ────────────────────────── */
async function loadConfigs() {
  try {
    state.configs = (await api('/configs')).configs;
    renderConfigs();
  } catch (e) { renderError(e); }
}
function renderConfigs() {
  const rows = state.configs.map((c) => `
    <tr class="clickable" data-action="cfg" data-id="${c.slot_id}">
      <td class="mono">${c.slot_id}</td>
      <td>${escapeHtml(c.username)}</td>
      <td dir="ltr">${c.email || '—'}</td>
      <td>${escapeHtml(c.name || '')}</td>
      <td>${fmtDate(c.updated_at)}</td>
    </tr>`).join('');
  $('#view').innerHTML = `
    <div class="panel table-wrap">
      <table>
        <thead><tr><th>${t('slotCol')} ID</th><th>${t('nameCol')}</th><th>${t('emailCol')}</th><th>${t('nameCol')}</th><th>${t('lastUpdate')}</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="muted">' + t('noResults') + '</td></tr>'}</tbody>
      </table>
    </div>`;
}

/* ── Helpers ───────────────────────────────────────────── */
function renderError(e) {
  $('#view').innerHTML = `<div class="panel"><p class="err">${escapeHtml(e.message || String(e))}</p></div>`;
}
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function copyText(txt) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(txt);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); resolve(); } catch (e) { reject(e); }
    document.body.removeChild(ta);
  });
}

/* ── Actions ───────────────────────────────────────────── */
async function doAction(name, id, extra, trigger) {
  try {
    if (name === 'user') { await openUser(id); }
    else if (name === 'ref-user') { await openUser(id); }
    else if (name === 'back-users') { state.selectedUser = null; loadUsers(); }
    else if (name === 'grant-sub') {
      const plan = $('#grantPlan').value;
      const cycle = $('#grantCycle').value;
      const body = { planKey: plan, cycle };
      const days = Number($('#grantDays')?.value || 0);
      if (days > 0) body.days = days;
      await api('/users/' + encodeURIComponent(state.selectedUser.user.id) + '/subscriptions', { method: 'POST', body });
      toast(t('grantedSubOk'), 'ok');
      await openUser(state.selectedUser.user.id);
    }
    else if (name === 'revoke-sub') {
      if (!confirm(t('revoke') + ' ' + id + '?')) return;
      await api('/users/' + encodeURIComponent(state.selectedUser.user.id) + '/subscriptions/' + id + '/revoke', { method: 'POST' });
      toast(t('revokedSubOk'), 'ok');
      await openUser(state.selectedUser.user.id);
    }
    else if (name === 'grant-slot') {
      await api('/users/' + encodeURIComponent(state.selectedUser.user.id) + '/extra-slots', { method: 'POST' });
      toast(t('grantedSlotOk'), 'ok');
      await openUser(state.selectedUser.user.id);
    }
    else if (name === 'revoke-slot') {
      if (!confirm(t('remove') + ' ' + id + '?')) return;
      await api('/users/' + encodeURIComponent(state.selectedUser.user.id) + '/extra-slots/' + id, { method: 'DELETE' });
      toast(t('removedSlotOk'), 'ok');
      await openUser(state.selectedUser.user.id);
    }
    else if (name === 'slot') { showSlotConfig(id); }
    else if (name === 'cfg') { showCfg(id); }
    else if (name === 'cfg-cat') { state.cfgCatId = id; renderCfgCats(); renderCfgContent(); }
    else if (name === 'toggle-raw') {
      const layout = $('#cfgLayout');
      const raw = $('#cfgRaw');
      const showingRaw = !raw.classList.contains('hidden');
      layout.classList.toggle('hidden', !showingRaw);
      raw.classList.toggle('hidden', showingRaw);
      trigger.textContent = showingRaw ? t('viewRaw') : t('viewSummary');
    }
    else if (name === 'close-json') { state.cfgCatId = null; trigger.closest('.panel').remove(); }
    else if (name === 'ticket') { await openTicket(id); }
    else if (name === 'back-tickets') { state.selectedTicket = null; loadTickets(); }
    else if (name === 'ticket-status') {
      await api('/tickets/' + id + '/status', { method: 'POST', body: { status: extra } });
      toast(t('statusUpdatedOk'), 'ok');
      await openTicket(id);
    }
    else if (name === 'ticket-delete') {
      if (!confirm(t('deleteTicketConfirm'))) return;
      await api('/tickets/' + id, { method: 'DELETE' });
      toast(t('ticketDeletedOk'), 'ok');
      state.selectedTicket = null;
      loadTickets();
    }
    else if (name === 'reply') {
      const body = $('#replyBody').value.trim();
      if (!body) return toast(t('replyFirst'), 'error');
      await api('/tickets/' + state.selectedTicket.ticket.id + '/messages', { method: 'POST', body: { body } });
      toast(t('replySentOk'), 'ok');
      await openTicket(state.selectedTicket.ticket.id);
    }
    else if (name === 'gen-promos') {
      const n = Math.max(1, Math.min(100, Number($('#promoCount').value || 1)));
      const d = Math.max(1, Math.min(100, Number($('#promoDiscount').value || 20)));
      const monthsRaw = $('#promoMonths').value.trim();
      const months = monthsRaw === '' ? null : Math.max(1, Math.min(24, Number(monthsRaw)));
      const res = await api('/promos', { method: 'POST', body: { count: n, discount: d, months } });
      $('#promoResult').innerHTML = codeChips(res.codes);
      toast(t('copiedOk').replace('{n}', res.codes.length), 'ok');
      loadPromos();
    }
    else if (name === 'copy') {
      try {
        await copyText(id);
        toast(t('copied'), 'ok');
      } catch {
        toast(id, 'ok');
      }
    }
    else if (name === 'disable-promo') {
      if (!confirm(t('disablePromo') + ' ' + id + '?')) return;
      await api('/promos/' + id, { method: 'DELETE' });
      toast(t('disablePromo'), 'ok');
      loadPromos();
    }
    else if (name === 'save-status') {
      const maintenance = $('#statusMaintenance').checked;
      const message = $('#statusMessage').value.trim();
      await api('/status', { method: 'PUT', body: { maintenance, message } });
      toast(t('statusSaved'), 'ok');
      loadStatus();
    }
  } catch (e) {
    toast(e.message || String(e), 'error');
  }
}

/* ── Status / Maintenance ─────────────────────────────── */
async function loadStatus() {
  try {
    const data = await api('/status');
    renderStatus(data);
  } catch (e) { renderError(e); }
}
function renderStatus(data) {
  const on = data.maintenance_mode === 1;
  const msg = data.maintenance_message || '';
  $('#view').innerHTML = `
    <div class="panel" style="max-width:480px;">
      <h3 style="margin-bottom:16px;">${t('statusTabTitle')}</h3>
      <div class="row" style="align-items:center;gap:12px;margin-bottom:16px;">
        <label class="row" style="gap:8px;cursor:pointer;">
          <input type="checkbox" id="statusMaintenance" ${on ? 'checked' : ''} />
          <span>${t('maintenanceLabel')}</span>
        </label>
        <span class="badge ${on ? 'red' : 'green'}" style="margin-left:auto;">${on ? t('maintenanceOn') : t('maintenanceOff')}</span>
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block;margin-bottom:6px;font-size:0.85rem;color:var(--muted);">${t('maintenanceMessage')}</label>
        <textarea id="statusMessage" class="input" rows="3" style="width:100%;resize:vertical;" placeholder="${t('maintenancePlaceholder')}">${escapeHtml(msg)}</textarea>
      </div>
      <div class="row" style="justify-content:flex-end;">
        <button class="btn success" data-action="save-status">${t('saveStatus')}</button>
      </div>
    </div>`;
}

/* ── Events ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  $('#loginBase').value = state.base;
  if (state.token) { showApp(); return; }
  $('#login').classList.remove('hidden');
});

$('#loginBtn').addEventListener('click', login);
$('#loginKey').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
$('#loginLangBtn').addEventListener('click', () => setLang(lang === 'ar' ? 'en' : 'ar'));
$('#langBtn').addEventListener('click', () => setLang(lang === 'ar' ? 'en' : 'ar'));
$('#logoutBtn').addEventListener('click', () => logout(false));
$('#refreshBtn').addEventListener('click', loadView);
$('#notifBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  toggleNotifPanel();
});
document.addEventListener('click', (e) => {
  const panel = $('#notifPanel');
  if (panel && !panel.classList.contains('hidden') && !e.target.closest('.notif-wrap')) {
    panel.classList.add('hidden');
  }
});

document.querySelectorAll('.nav-item').forEach((b) =>
  b.addEventListener('click', () => switchView(b.dataset.view))
);

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  e.preventDefault();
  const id = btn.dataset.id ?? btn.dataset.sub ?? btn.dataset.slot;
  await doAction(btn.dataset.action, id, btn.dataset.status, btn);
});

$('#view').addEventListener('click', (e) => {
  if (e.target.id === 'grantSubBtn') doAction('grant-sub', undefined, undefined, e.target);
  if (e.target.id === 'replyBtn') doAction('reply', undefined, undefined, e.target);
  if (e.target.id === 'genPromoBtn') doAction('gen-promos', undefined, undefined, e.target);
  if (e.target.id === 'createUserBtn') showCreateUserModal();
  if (e.target.id === 'refSearchBtn') loadReferrals();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'userSearch') loadUsers();
  if (e.key === 'Enter' && e.target.id === 'refSearch') loadReferrals();
});

window.notifNavigate = notifNavigate;
window.toggleDone = toggleDone;
window.notifMarkAllDone = notifMarkAllDone;
