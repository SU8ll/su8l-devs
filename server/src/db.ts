import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';
import { getPlan, planCycleMonths, type Plan } from './plans.js';

mkdirSync(dirname(config.dbPath), { recursive: true });

const db = new DatabaseSync(config.dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA busy_timeout = 5000;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  username TEXT NOT NULL,
  avatar TEXT,
  locale TEXT DEFAULT 'en',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE(provider, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_email_lookup ON users(email);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_key TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  cycle TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_key TEXT,
  plan_name TEXT,
  cycle TEXT,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  promo_code TEXT,
  promo_conflict INTEGER NOT NULL DEFAULT 0,
  extra_slot INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'created',
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_paypal ON orders(paypal_order_id);

CREATE TABLE IF NOT EXISTS promo_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'unused',
  used_by TEXT,
  used_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_promo_status ON promo_codes(status);

CREATE TABLE IF NOT EXISTS extra_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  order_id TEXT,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_extra_user ON extra_slots(user_id);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tmsg_ticket ON ticket_messages(ticket_id);

CREATE TABLE IF NOT EXISTS uptime_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ok INTEGER NOT NULL,
  latency_ms INTEGER,
  checked_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_uptime_time ON uptime_checks(checked_at);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id TEXT PRIMARY KEY,
  bot_config TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);
`);

export type SqlValue = string | number | bigint | null | Uint8Array;

export function run(sql: string, ...params: SqlValue[]): { changes: number; lastInsertRowid: number | bigint } {
  return db.prepare(sql).run(...params) as { changes: number; lastInsertRowid: number | bigint };
}

export function get<T>(sql: string, ...params: SqlValue[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function all<T>(sql: string, ...params: SqlValue[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function withTransaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export const nowIso = () => new Date().toISOString();
export const nowEpoch = () => Date.now();

// ── Users / Accounts ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string | null;
  username: string;
  avatar: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  provider: string;
  provider_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
}

export function getUser(id: string): User | undefined {
  return get<User>('SELECT * FROM users WHERE id = ?', id);
}

export function findUserByAccount(provider: string, providerId: string): User | undefined {
  const acc = get<Account>('SELECT * FROM accounts WHERE provider = ? AND provider_id = ?', provider, providerId);
  return acc ? getUser(acc.user_id) : undefined;
}

export function getAccounts(userId: string): Account[] {
  return all<Account>('SELECT * FROM accounts WHERE user_id = ?', userId);
}

export function findUserByEmail(email: string): User | undefined {
  if (!email) return undefined;
  return get<User>('SELECT * FROM users WHERE email = ? COLLATE NOCASE', email);
}

export function createUser(data: {
  id: string;
  email?: string | null;
  username: string;
  avatar?: string | null;
  locale?: string;
}): User {
  const ts = nowIso();
  run(
    'INSERT INTO users (id, email, username, avatar, locale, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    data.id,
    data.email ?? null,
    data.username,
    data.avatar ?? null,
    data.locale ?? 'en',
    ts,
    ts
  );
  return getUser(data.id)!;
}

export function updateUser(id: string, patch: { email?: string | null; username?: string; avatar?: string | null; locale?: string }): void {
  const u = getUser(id);
  if (!u) return;
  run(
    'UPDATE users SET email = ?, username = ?, avatar = ?, locale = ?, updated_at = ? WHERE id = ?',
    patch.email !== undefined ? patch.email : u.email,
    patch.username ?? u.username,
    patch.avatar !== undefined ? patch.avatar : u.avatar,
    patch.locale ?? u.locale,
    nowIso(),
    id
  );
}

export function addAccount(data: Omit<Account, 'id'>): Account {
  const id = `acc_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  run(
    'INSERT OR IGNORE INTO accounts (id, user_id, provider, provider_id, access_token, refresh_token, expires_at, created_at) VALUES (?,?,?,?,?,?,?,?)',
    id,
    data.user_id,
    data.provider,
    data.provider_id,
    data.access_token ?? null,
    data.refresh_token ?? null,
    data.expires_at ?? null,
    nowIso()
  );
  return get<Account>('SELECT * FROM accounts WHERE id = ?', id)!;
}

// ── Subscriptions ───────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  user_id: string;
  plan_key: string;
  plan_name: string;
  cycle: 'monthly' | 'yearly';
  amount: number;
  status: 'active' | 'cancelled' | 'expired';
  current_period_end: number | null;
  created_at: string;
  updated_at: string;
}

export function getSubscriptions(userId: string): Subscription[] {
  return all<Subscription>('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC', userId);
}

export function getActiveSubscriptions(userId: string): Subscription[] {
  const now = nowEpoch();
  return all<Subscription>(
    `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND (current_period_end IS NULL OR current_period_end > ?) ORDER BY created_at DESC`,
    userId,
    now
  );
}

export function hasActiveBaseSubscription(userId: string): boolean {
  return getActiveSubscriptions(userId).length > 0;
}

export function activateSubscription(data: {
  userId: string;
  plan: Plan;
  cycle: 'monthly' | 'yearly';
  amount: number;
}): Subscription {
  // Caller must wrap in `withTransaction` (fulfillOrder does). No nested BEGIN.
  const existing = getActiveSubscriptions(data.userId).find((s) => s.plan_key === data.plan.key);
  if (existing) {
    const base = Math.max(existing.current_period_end ?? nowEpoch(), nowEpoch());
    const end = base + planCycleMonths(data.cycle) * 30 * 24 * 60 * 60 * 1000;
    run(
      `UPDATE subscriptions SET amount = ?, current_period_end = ?, status = 'active', updated_at = ? WHERE id = ?`,
      data.amount,
      end,
      nowIso(),
      existing.id
    );
    return get<Subscription>('SELECT * FROM subscriptions WHERE id = ?', existing.id)!;
  }
  const id = `sub_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  const end = nowEpoch() + planCycleMonths(data.cycle) * 30 * 24 * 60 * 60 * 1000;
  const ts = nowIso();
  run(
    `INSERT INTO subscriptions (id, user_id, plan_key, plan_name, cycle, amount, status, current_period_end, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    id,
    data.userId,
    data.plan.key,
    data.plan.name,
    data.cycle,
    data.amount,
    'active',
    end,
    ts,
    ts
  );
  return get<Subscription>('SELECT * FROM subscriptions WHERE id = ?', id)!;
}

export function getEffectiveSlots(userId: string): { base: number; extra: number; total: number; active: boolean } {
  const active = getActiveSubscriptions(userId);
  let planSlots = 0;
  for (const s of active) {
    const plan = getPlan(s.plan_key);
    if (plan && plan.slots > planSlots) planSlots = plan.slots;
  }
  const extra = getExtraSlotCount(userId);
  return {
    base: planSlots,
    extra,
    total: active.length > 0 ? planSlots + extra : 0,
    active: active.length > 0,
  };
}

// ── Orders ──────────────────────────────────────────────────────────────────

export interface Order {
  id: string;
  user_id: string;
  plan_key: string | null;
  plan_name: string | null;
  cycle: 'monthly' | 'yearly' | null;
  amount: number;
  currency: string;
  promo_code: string | null;
  promo_conflict: number;
  extra_slot: number;
  status: 'created' | 'approved' | 'captured' | 'completed' | 'denied';
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  created_at: string;
  updated_at: string;
}

export function insertOrder(
  o: Omit<Order, 'status' | 'promo_conflict' | 'paypal_capture_id' | 'created_at' | 'updated_at'>
): Order {
  const ts = nowIso();
  run(
    `INSERT INTO orders (id, user_id, plan_key, plan_name, cycle, amount, currency, promo_code, extra_slot, status, paypal_order_id, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,'created',?,?,?)`,
    o.id,
    o.user_id,
    o.plan_key,
    o.plan_name,
    o.cycle,
    o.amount,
    o.currency,
    o.promo_code,
    o.extra_slot,
    o.paypal_order_id,
    ts,
    ts
  );
  return get<Order>('SELECT * FROM orders WHERE id = ?', o.id)!;
}

export function getOrder(id: string): Order | undefined {
  return get<Order>('SELECT * FROM orders WHERE id = ?', id);
}

export function getOrderByPaypalId(paypalOrderId: string): Order | undefined {
  return get<Order>('SELECT * FROM orders WHERE paypal_order_id = ?', paypalOrderId);
}

export function setOrderPaypalId(id: string, paypalOrderId: string): void {
  run(`UPDATE orders SET paypal_order_id = ?, updated_at = ? WHERE id = ?`, paypalOrderId, nowIso(), id);
}

export function markOrderCompleted(id: string, captureId: string | null): void {
  run(`UPDATE orders SET status = 'completed', paypal_capture_id = ?, updated_at = ? WHERE id = ?`, captureId, nowIso(), id);
}

export function markOrderDenied(id: string): void {
  run(`UPDATE orders SET status = 'denied', updated_at = ? WHERE id = ?`, nowIso(), id);
}

export function markOrderPromoConflict(id: string): void {
  run(`UPDATE orders SET promo_conflict = 1, updated_at = ? WHERE id = ?`, nowIso(), id);
}

// ── Promo Codes ─────────────────────────────────────────────────────────────

export interface PromoCode {
  id: number;
  code: string;
  status: 'unused' | 'used';
  used_by: string | null;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
}

export function insertPromoCode(code: string, createdBy: string): PromoCode {
  const ts = nowIso();
  run('INSERT INTO promo_codes (code, status, used_by, used_at, created_by, created_at) VALUES (?,?,?,?,?,?)',
    code, 'unused', null, null, createdBy, ts);
  return get<PromoCode>('SELECT * FROM promo_codes WHERE code = ?', code)!;
}

export function getPromoByCode(code: string): PromoCode | undefined {
  // COLLATE NOCASE so the literal "DEVs" suffix matches any casing a user types.
  return get<PromoCode>('SELECT * FROM promo_codes WHERE code = ? COLLATE NOCASE', code.trim());
}

export function promoIsUnused(code: string): boolean {
  const p = getPromoByCode(code);
  return !!p && p.status === 'unused';
}

/**
 * Mutates a promo code to 'used' INSIDE the caller's transaction.
 * Must only be called from within `withTransaction` (BEGIN IMMEDIATE), which
 * serializes concurrent writers so the code can never be double-consumed.
 */
export function markPromoUsed(code: string, userId: string): void {
  run(`UPDATE promo_codes SET status = 'used', used_by = ?, used_at = ? WHERE code = ? COLLATE NOCASE AND status = 'unused'`,
    userId, nowIso(), code.trim());
}

export function promoWasConsumedInTxn(code: string, userId: string): boolean {
  const p = getPromoByCode(code);
  return !!p && p.status === 'used' && p.used_by === userId;
}

// ── Extra Slots (permanent upsell) ──────────────────────────────────────────

export interface ExtraSlot {
  id: number;
  user_id: string;
  order_id: string | null;
  amount: number;
  created_at: string;
}

export function insertExtraSlot(userId: string, orderId: string | null, amount: number): void {
  run('INSERT INTO extra_slots (user_id, order_id, amount, created_at) VALUES (?,?,?,?)',
    userId, orderId, amount, nowIso());
}

export function getExtraSlotCount(userId: string): number {
  const r = get<{ n: number }>('SELECT COUNT(*) AS n FROM extra_slots WHERE user_id = ?', userId);
  return r ? Number(r.n) : 0;
}

export function ownsExtraSlot(userId: string): boolean {
  return getExtraSlotCount(userId) > 0;
}

// ── Tickets ─────────────────────────────────────────────────────────────────

export interface Ticket {
  id: number;
  user_id: string;
  subject: string;
  status: 'open' | 'answered' | 'closed';
  priority: 'low' | 'normal' | 'high';
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  author: 'user' | 'staff';
  body: string;
  created_at: string;
}

export function listTickets(userId: string): Ticket[] {
  return all<Ticket>('SELECT * FROM tickets WHERE user_id = ? ORDER BY updated_at DESC', userId);
}

export function getTicket(id: number): Ticket | undefined {
  return get<Ticket>('SELECT * FROM tickets WHERE id = ?', id);
}

export function createTicket(data: { userId: string; subject: string; body: string; priority: string }): Ticket {
  const ts = nowIso();
  const r = run(
    `INSERT INTO tickets (user_id, subject, status, priority, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
    data.userId, data.subject, 'open', data.priority, ts, ts
  );
  run('INSERT INTO ticket_messages (ticket_id, author, body, created_at) VALUES (?,?,?,?)',
    Number(r.lastInsertRowid), 'user', data.body, ts);
  return getTicket(Number(r.lastInsertRowid))!;
}

export function listTicketMessages(ticketId: number): TicketMessage[] {
  return all<TicketMessage>('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC', ticketId);
}

export function addTicketMessage(ticketId: number, author: 'user' | 'staff', body: string): TicketMessage {
  const ts = nowIso();
  run('INSERT INTO ticket_messages (ticket_id, author, body, created_at) VALUES (?,?,?,?)', ticketId, author, body, ts);
  run(`UPDATE tickets SET updated_at = ?, status = CASE WHEN ? = 'user' AND status = 'closed' THEN 'open' ELSE status END WHERE id = ?`,
    ts, author, ticketId);
  return all<TicketMessage>('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 1', ticketId)[0]!;
}

export function setTicketStatus(ticketId: number, status: 'open' | 'closed'): void {
  run(`UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?`, status, nowIso(), ticketId);
}

export function listAllTickets(limit = 100): Ticket[] {
  return all<Ticket>('SELECT * FROM tickets ORDER BY updated_at DESC LIMIT ?', limit);
}

// ── Uptime ──────────────────────────────────────────────────────────────────

export interface UptimeCheck {
  id: number;
  ok: number;
  latency_ms: number | null;
  checked_at: string;
}

export function recordUptime(ok: boolean, latencyMs: number | null): void {
  run('INSERT INTO uptime_checks (ok, latency_ms, checked_at) VALUES (?,?,?)',
    ok ? 1 : 0, latencyMs, nowIso());
}

export function latestUptime(): UptimeCheck | undefined {
  return get<UptimeCheck>('SELECT * FROM uptime_checks ORDER BY checked_at DESC LIMIT 1');
}

export function uptimeSince(msAgo: number): { checks: number; ok: number; samples: UptimeCheck[] } {
  const since = new Date(Date.now() - msAgo).toISOString();
  const rows = all<UptimeCheck>('SELECT * FROM uptime_checks WHERE checked_at >= ? ORDER BY checked_at ASC', since);
  const ok = rows.filter((r) => r.ok === 1).length;
  return { checks: rows.length, ok, samples: rows };
}

export function uptimeDaily(days = 30): { day: string; ok: number; total: number; latency: number | null }[] {
  const rows = uptimeSince(days * 24 * 60 * 60 * 1000).samples;
  const map = new Map<string, { ok: number; total: number; latSum: number; latN: number }>();
  for (const r of rows) {
    const day = r.checked_at.slice(0, 10);
    const e = map.get(day) ?? { ok: 0, total: 0, latSum: 0, latN: 0 };
    e.total++;
    if (r.ok === 1) e.ok++;
    if (r.latency_ms != null) {
      e.latSum += r.latency_ms;
      e.latN++;
    }
    map.set(day, e);
  }
  const out: { day: string; ok: number; total: number; latency: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const e = map.get(d);
    out.push({
      day: d,
      ok: e?.ok ?? 0,
      total: e?.total ?? 0,
      latency: e && e.latN > 0 ? Math.round(e.latSum / e.latN) : null,
    });
  }
  return out;
}

export function pruneUptime(beforeMs: number): void {
  run('DELETE FROM uptime_checks WHERE checked_at < ?', new Date(Date.now() - beforeMs).toISOString());
}

// ── User settings (bot panel config) ────────────────────────────────────────

export function getBotConfig(userId: string): Record<string, unknown> {
  const r = get<{ bot_config: string }>('SELECT bot_config FROM user_settings WHERE user_id = ?', userId);
  try {
    return r ? (JSON.parse(r.bot_config) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function setBotConfig(userId: string, cfg: Record<string, unknown>): void {
  run(
    `INSERT INTO user_settings (user_id, bot_config, updated_at) VALUES (?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET bot_config = excluded.bot_config, updated_at = excluded.updated_at`,
    userId,
    JSON.stringify(cfg),
    nowIso()
  );
}
