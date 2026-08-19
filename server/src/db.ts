import { Pool, types } from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { config } from './config.js';
import { getPlan, planCycleMonths, type Plan } from './plans.js';

// Postgres returns BIGINT columns (ids, epoch ms) as strings by default.
// Parse them back to JS numbers so the rest of the code sees numbers.
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1700, (v) => Number(v));

// Hosted Postgres (Supabase/Neon) uses TLS. `sslmode=require` in the connection
// string makes newer pg treat the cert as verify-full, which fails on their
// self-signed chain — so strip the param and enable TLS explicitly instead.
const rawDbUrl = config.databaseUrl;
const sslModeMatch = /[?&]sslmode=[^&]*/.exec(rawDbUrl);
export const pool = new Pool({
  connectionString: sslModeMatch
    ? rawDbUrl.replace(/([?&])sslmode=[^&]*/, (_m, q) => (q === '?' ? '?' : '')).replace(/\?&/, '?').replace(/[?&]$/, '')
    : rawDbUrl,
  ssl: sslModeMatch ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// ── Transaction context ────────────────────────────────────────────────────────
// `withTransaction` borrows ONE client from the pool and runs its callback inside
// `BEGIN`/`COMMIT` on that client. The query helpers read the ALS store so every
// query issued inside the callback participates in the same transaction — this
// is what lets a promo code be consumed exactly once under racing webhooks.

interface TxnStore {
  client: import('pg').PoolClient;
}
const txnStore = new AsyncLocalStorage<TxnStore>();

export async function initDb(): Promise<void> {
  await pool.query(`
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
  expires_at BIGINT,
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
  amount DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end BIGINT,
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
  amount DOUBLE PRECISION NOT NULL,
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
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'unused',
  discount INTEGER NOT NULL DEFAULT 20,
  max_months INTEGER,
  used_by TEXT,
  used_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_promo_status ON promo_codes(status);
-- Migrations for tables created before these columns existed.
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS discount INTEGER NOT NULL DEFAULT 20;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS max_months INTEGER;

CREATE TABLE IF NOT EXISTS extra_slots (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_id TEXT,
  amount DOUBLE PRECISION NOT NULL,
  created_at TEXT NOT NULL
);
-- The UNIQUE partial index is the hard invariant: one paid order can NEVER
-- grant more than a single extra slot, even if a capture + webhook race.
CREATE UNIQUE INDEX IF NOT EXISTS idx_extra_slots_order ON extra_slots(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_extra_user ON extra_slots(user_id);

CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tmsg_ticket ON ticket_messages(ticket_id);

CREATE TABLE IF NOT EXISTS uptime_checks (
  id SERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS bot_slots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  bot_config TEXT NOT NULL DEFAULT '{}',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bot_slots_user ON bot_slots(user_id);

-- Password-based auth: nullable column for email/password users.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
-- Only create the unique index if no duplicate emails exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_users_email_unique') THEN
    -- Skip if duplicates would violate the constraint.
    IF (SELECT COUNT(*) FROM (SELECT LOWER(email) e FROM users WHERE email IS NOT NULL GROUP BY LOWER(email) HAVING COUNT(*) > 1) x) = 0 THEN
      CREATE UNIQUE INDEX idx_users_email_unique ON users(LOWER(email)) WHERE email IS NOT NULL;
    END IF;
  END IF;
END $$;
`);
}

export type SqlValue = string | number | bigint | boolean | null | Uint8Array;

// pg uses $1..$n placeholders; convert the SQLite-style ? markers per query.
function toPg(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function pickConn() {
  return txnStore.getStore()?.client ?? pool;
}

export async function run(sql: string, ...params: SqlValue[]): Promise<{ changes: number }> {
  const r = await pickConn().query(toPg(sql), params);
  return { changes: r.rowCount ?? 0 };
}

export async function get<T>(sql: string, ...params: SqlValue[]): Promise<T | undefined> {
  const r = await pickConn().query(toPg(sql), params);
  return r.rows[0] as T | undefined;
}

export async function all<T>(sql: string, ...params: SqlValue[]): Promise<T[]> {
  const r = await pickConn().query(toPg(sql), params);
  return r.rows as T[];
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await txnStore.run({ client }, () => fn());
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
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

export function getUser(id: string): Promise<User | undefined> {
  return get<User>('SELECT * FROM users WHERE id = ?', id);
}

export async function findUserByAccount(provider: string, providerId: string): Promise<User | undefined> {
  const acc = await get<Account>('SELECT * FROM accounts WHERE provider = ? AND provider_id = ?', provider, providerId);
  return acc ? getUser(acc.user_id) : undefined;
}

export function getAccounts(userId: string): Promise<Account[]> {
  return all<Account>('SELECT * FROM accounts WHERE user_id = ?', userId);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  if (!email) return undefined;
  return get<User>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', email);
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  if (!username) return undefined;
  return get<User>('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', username);
}

export async function findUserByEmailOrUsername(identifier: string): Promise<User | undefined> {
  if (!identifier) return undefined;
  const byEmail = await get<User>('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', identifier);
  if (byEmail) return byEmail;
  return get<User>('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', identifier);
}

export async function createUser(data: {
  id: string;
  email?: string | null;
  username: string;
  avatar?: string | null;
  locale?: string;
}): Promise<User> {
  const ts = nowIso();
  await run(
    'INSERT INTO users (id, email, username, avatar, locale, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
    data.id,
    data.email ?? null,
    data.username,
    data.avatar ?? null,
    data.locale ?? 'en',
    ts,
    ts
  );
  return (await getUser(data.id))!;
}

export async function updateUser(id: string, patch: { email?: string | null; username?: string; avatar?: string | null; locale?: string }): Promise<void> {
  const u = await getUser(id);
  if (!u) return;
  await run(
    'UPDATE users SET email = ?, username = ?, avatar = ?, locale = ?, updated_at = ? WHERE id = ?',
    patch.email !== undefined ? patch.email : u.email,
    patch.username ?? u.username,
    patch.avatar !== undefined ? patch.avatar : u.avatar,
    patch.locale ?? u.locale,
    nowIso(),
    id
  );
}

export async function addAccount(data: Omit<Account, 'id'>): Promise<Account> {
  const id = `acc_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  await run(
    'INSERT INTO accounts (id, user_id, provider, provider_id, access_token, refresh_token, expires_at, created_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING',
    id,
    data.user_id,
    data.provider,
    data.provider_id,
    data.access_token ?? null,
    data.refresh_token ?? null,
    data.expires_at ?? null,
    nowIso()
  );
  const acc =
    (await get<Account>('SELECT * FROM accounts WHERE id = ?', id)) ??
    (await get<Account>('SELECT * FROM accounts WHERE provider = ? AND provider_id = ?', data.provider, data.provider_id));
  return acc!;
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

export function getSubscriptions(userId: string): Promise<Subscription[]> {
  return all<Subscription>('SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC', userId);
}

export async function getActiveSubscriptions(userId: string): Promise<Subscription[]> {
  const now = nowEpoch();
  return all<Subscription>(
    `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' AND (current_period_end IS NULL OR current_period_end > ?) ORDER BY created_at DESC`,
    userId,
    now
  );
}

/** True when the subscription row is still within its paid period. */
export function isActiveSubscription(s: Pick<Subscription, 'status' | 'current_period_end'>): boolean {
  return s.status === 'active' && (s.current_period_end === null || s.current_period_end > nowEpoch());
}

/** Status to SHOW in UIs: a row still marked 'active' in the DB but past its
 *  period end is rendered as 'expired' so it never looks like a live plan. */
export function subscriptionDisplayStatus(s: Pick<Subscription, 'status' | 'current_period_end'>): Subscription['status'] {
  if (s.status === 'active' && s.current_period_end !== null && s.current_period_end <= nowEpoch()) {
    return 'expired';
  }
  return s.status;
}

export async function hasActiveBaseSubscription(userId: string): Promise<boolean> {
  return (await getActiveSubscriptions(userId)).length > 0;
}

export async function activateSubscription(data: {
  userId: string;
  plan: Plan;
  cycle: 'monthly' | 'yearly';
  amount: number;
  durationMs?: number;
  maxMonths?: number;
}): Promise<Subscription> {
  // Caller must wrap in `withTransaction` (fulfillOrder does). No nested BEGIN.
  const existing = (await getActiveSubscriptions(data.userId)).find((s) => s.plan_key === data.plan.key);
  let end: number;
  if (data.durationMs !== undefined) {
    // Manual admin grant: set the exact remaining period from now.
    end = nowEpoch() + data.durationMs;
  } else {
    // Automatic purchase/renewal: extend from the current period end.
    end =
      Math.max(existing?.current_period_end ?? nowEpoch(), nowEpoch()) +
      planCycleMonths(data.cycle) * 30 * 24 * 60 * 60 * 1000;
    // Promo-coded orders may cap how long the discount lasts (e.g. a 100%-off
    // code grants at most `maxMonths` of the subscription, then full price
    // resumes). Never shrink an already-paid period below the natural end.
    if (data.maxMonths !== undefined) {
      const cap = nowEpoch() + data.maxMonths * 30 * 24 * 60 * 60 * 1000;
      end = Math.min(end, Math.max(cap, existing?.current_period_end ?? 0));
    }
  }
  if (existing) {
    await run(
      `UPDATE subscriptions SET amount = ?, current_period_end = ?, status = 'active', updated_at = ? WHERE id = ?`,
      data.amount,
      end,
      nowIso(),
      existing.id
    );
    return (await get<Subscription>('SELECT * FROM subscriptions WHERE id = ?', existing.id))!;
  }
  // A new activation replaces any same-plan row that already ended (or was
  // cancelled) so the user never holds two records of the same plan.
  await run(
    `UPDATE subscriptions SET status = 'expired', updated_at = ?
      WHERE user_id = ? AND plan_key = ? AND status = 'active'
        AND current_period_end IS NOT NULL AND current_period_end <= ?`,
    nowIso(),
    data.userId,
    data.plan.key,
    nowEpoch()
  );
  const id = `sub_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  const ts = nowIso();
  await run(
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
  return (await get<Subscription>('SELECT * FROM subscriptions WHERE id = ?', id))!;
}

export async function getEffectiveSlots(userId: string): Promise<{ base: number; extra: number; total: number; active: boolean }> {
  const active = await getActiveSubscriptions(userId);
  let planSlots = 0;
  for (const s of active) {
    const plan = getPlan(s.plan_key);
    if (plan && plan.slots > planSlots) planSlots = plan.slots;
  }
  const extra = await getExtraSlotCount(userId);
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

export async function insertOrder(
  o: Omit<Order, 'status' | 'promo_conflict' | 'paypal_capture_id' | 'created_at' | 'updated_at'>
): Promise<Order> {
  const ts = nowIso();
  await run(
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
  return (await get<Order>('SELECT * FROM orders WHERE id = ?', o.id))!;
}

export function getOrder(id: string): Promise<Order | undefined> {
  return get<Order>('SELECT * FROM orders WHERE id = ?', id);
}

export function getOrderByPaypalId(paypalOrderId: string): Promise<Order | undefined> {
  return get<Order>('SELECT * FROM orders WHERE paypal_order_id = ?', paypalOrderId);
}

export async function setOrderPaypalId(id: string, paypalOrderId: string): Promise<void> {
  await run(`UPDATE orders SET paypal_order_id = ?, updated_at = ? WHERE id = ?`, paypalOrderId, nowIso(), id);
}

export async function markOrderCompleted(id: string, captureId: string | null): Promise<void> {
  await run(`UPDATE orders SET status = 'completed', paypal_capture_id = ?, updated_at = ? WHERE id = ?`, captureId, nowIso(), id);
}

export async function markOrderDenied(id: string): Promise<void> {
  await run(`UPDATE orders SET status = 'denied', updated_at = ? WHERE id = ?`, nowIso(), id);
}

export async function markOrderPromoConflict(id: string): Promise<void> {
  await run(`UPDATE orders SET promo_conflict = 1, updated_at = ? WHERE id = ?`, nowIso(), id);
}

// ── Promo Codes ─────────────────────────────────────────────────────────────

export interface PromoCode {
  id: number;
  code: string;
  status: 'unused' | 'used' | 'disabled';
  discount: number;
  max_months: number | null;
  used_by: string | null;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
}

export async function insertPromoCode(code: string, createdBy: string, discount = 20, maxMonths: number | null = null): Promise<PromoCode> {
  const ts = nowIso();
  await run('INSERT INTO promo_codes (code, status, discount, max_months, used_by, used_at, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)',
    code, 'unused', discount, maxMonths, null, null, createdBy, ts);
  return (await get<PromoCode>('SELECT * FROM promo_codes WHERE code = ?', code))!;
}

export function getPromoByCode(code: string): Promise<PromoCode | undefined> {
  // Case-insensitive exact match so the literal "DEVs" suffix matches any casing.
  return get<PromoCode>('SELECT * FROM promo_codes WHERE LOWER(code) = LOWER(?)', code.trim());
}

export async function promoIsUnused(code: string): Promise<boolean> {
  const p = await getPromoByCode(code);
  return !!p && p.status === 'unused';
}

/**
 * Mutates a promo code to 'used' INSIDE the caller's transaction.
 * Must only be called from within `withTransaction`, which serializes the
 * mutation on a single pooled connection so the code can never be consumed twice.
 */
export async function markPromoUsed(code: string, userId: string): Promise<void> {
  await run(`UPDATE promo_codes SET status = 'used', used_by = ?, used_at = ? WHERE LOWER(code) = LOWER(?) AND status = 'unused'`,
    userId, nowIso(), code.trim());
}

export async function promoWasConsumedInTxn(code: string, userId: string): Promise<boolean> {
  const p = await getPromoByCode(code);
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

export async function insertExtraSlot(userId: string, orderId: string | null, amount: number): Promise<void> {
  // ON CONFLICT DO NOTHING + the UNIQUE(order_id) partial index guarantees this
  // grants AT MOST +1 slot per order, even on duplicate fulfillments.
  await run('INSERT INTO extra_slots (user_id, order_id, amount, created_at) VALUES (?,?,?,?) ON CONFLICT DO NOTHING',
    userId, orderId, amount, nowIso());
}

export async function getExtraSlotCount(userId: string): Promise<number> {
  const r = await get<{ n: number }>('SELECT COUNT(*) AS n FROM extra_slots WHERE user_id = ?', userId);
  return r ? Number(r.n) : 0;
}

export async function ownsExtraSlot(userId: string): Promise<boolean> {
  return (await getExtraSlotCount(userId)) > 0;
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

export function listTickets(userId: string): Promise<Ticket[]> {
  return all<Ticket>(
    `SELECT t.*,
            (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS messages_count,
            (SELECT m.author FROM ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.id DESC LIMIT 1) AS last_message_author
       FROM tickets t WHERE t.user_id = ? ORDER BY t.updated_at DESC`,
    userId
  );
}

export function getTicket(id: number): Promise<Ticket | undefined> {
  return get<Ticket>('SELECT * FROM tickets WHERE id = ?', id);
}

export async function createTicket(data: { userId: string; subject: string; body: string; priority: string }): Promise<Ticket> {
  const ts = nowIso();
  const inserted = await get<{ id: number }>(
    `INSERT INTO tickets (user_id, subject, status, priority, created_at, updated_at) VALUES (?,?,?,?,?,?) RETURNING id`,
    data.userId, data.subject, 'open', data.priority, ts, ts
  );
  const ticketId = inserted!.id;
  await run('INSERT INTO ticket_messages (ticket_id, author, body, created_at) VALUES (?,?,?,?)',
    ticketId, 'user', data.body, ts);
  return (await getTicket(ticketId))!;
}

export function listTicketMessages(ticketId: number): Promise<TicketMessage[]> {
  return all<TicketMessage>('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC', ticketId);
}

export async function addTicketMessage(ticketId: number, author: 'user' | 'staff', body: string): Promise<TicketMessage> {
  const ts = nowIso();
  await run('INSERT INTO ticket_messages (ticket_id, author, body, created_at) VALUES (?,?,?,?)', ticketId, author, body, ts);
  await run(`UPDATE tickets SET updated_at = ?, status = CASE WHEN ? = 'user' AND status = 'closed' THEN 'open' ELSE status END WHERE id = ?`,
    ts, author, ticketId);
  return (await all<TicketMessage>('SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 1', ticketId))[0]!;
}

export async function setTicketStatus(ticketId: number, status: 'open' | 'closed'): Promise<void> {
  await run(`UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?`, status, nowIso(), ticketId);
}

export async function listAllTickets(limit = 100): Promise<Ticket[]> {
  return all<Ticket>('SELECT * FROM tickets ORDER BY updated_at DESC LIMIT ?', limit);
}

// ── Uptime ──────────────────────────────────────────────────────────────────

export interface UptimeCheck {
  id: number;
  ok: number;
  latency_ms: number | null;
  checked_at: string;
}

export async function recordUptime(ok: boolean, latencyMs: number | null): Promise<void> {
  await run('INSERT INTO uptime_checks (ok, latency_ms, checked_at) VALUES (?,?,?)',
    ok ? 1 : 0, latencyMs, nowIso());
}

export async function latestUptime(): Promise<UptimeCheck | undefined> {
  return get<UptimeCheck>('SELECT * FROM uptime_checks ORDER BY checked_at DESC LIMIT 1');
}

export async function uptimeSince(msAgo: number): Promise<{ checks: number; ok: number; samples: UptimeCheck[] }> {
  const since = new Date(Date.now() - msAgo).toISOString();
  const rows = await all<UptimeCheck>('SELECT * FROM uptime_checks WHERE checked_at >= ? ORDER BY checked_at ASC', since);
  const ok = rows.filter((r) => r.ok === 1).length;
  return { checks: rows.length, ok, samples: rows };
}

export async function uptimeDaily(days = 30): Promise<{ day: string; ok: number; total: number; latency: number | null }[]> {
  const rows = (await uptimeSince(days * 24 * 60 * 60 * 1000)).samples;
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

export async function pruneUptime(beforeMs: number): Promise<void> {
  await run('DELETE FROM uptime_checks WHERE checked_at < ?', new Date(Date.now() - beforeMs).toISOString());
}

// ── User settings (bot panel config) ────────────────────────────────────────

export async function getBotConfig(userId: string): Promise<Record<string, unknown>> {
  const r = await get<{ bot_config: string }>('SELECT bot_config FROM user_settings WHERE user_id = ?', userId);
  try {
    return r ? (JSON.parse(r.bot_config) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function setBotConfig(userId: string, cfg: Record<string, unknown>): Promise<void> {
  await run(
    `INSERT INTO user_settings (user_id, bot_config, updated_at) VALUES (?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET bot_config = excluded.bot_config, updated_at = excluded.updated_at`,
    userId,
    JSON.stringify(cfg),
    nowIso()
  );
}

// ── Bot slots (multi-account config contexts) ───────────────────────────────

export interface BotSlot {
  id: string;
  user_id: string;
  name: string;
  bot_config: string;
  sort: number;
  created_at: string;
  updated_at: string;
}

function makeSlotId(): string {
  return `slot_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

export function listBotSlots(userId: string): Promise<BotSlot[]> {
  return all<BotSlot>('SELECT * FROM bot_slots WHERE user_id = ? ORDER BY sort ASC, created_at ASC', userId);
}

export function getBotSlot(slotId: string, userId: string): Promise<BotSlot | undefined> {
  return get<BotSlot>('SELECT * FROM bot_slots WHERE id = ? AND user_id = ?', slotId, userId);
}

/**
 * Guarantees the user has exactly `count` slots. The first slot inherits the
 * legacy single-config stored in `user_settings.bot_config`, so existing users
 * keep their settings after the multi-slot migration. Missing slots are
 * created with default names.
 */
export async function ensureBotSlots(userId: string, count: number): Promise<BotSlot[]> {
  let existing = await listBotSlots(userId);
  if (existing.length === 0) {
    const legacy = await getBotConfig(userId);
    const ts = nowIso();
    await run(
      'INSERT INTO bot_slots (id, user_id, name, bot_config, sort, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
      makeSlotId(), userId, 'Slot 1', JSON.stringify(legacy), 0, ts, ts
    );
  }
  let slots = await listBotSlots(userId);
  while (slots.length < count) {
    const ts = nowIso();
    await run(
      'INSERT INTO bot_slots (id, user_id, name, bot_config, sort, created_at, updated_at) VALUES (?,?,?,?,?,?,?)',
      makeSlotId(), userId, `Slot ${slots.length + 1}`, '{}', slots.length, ts, ts
    );
    slots = await listBotSlots(userId);
  }
  return slots;
}

export async function renameBotSlot(slotId: string, userId: string, name: string): Promise<void> {
  await run('UPDATE bot_slots SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?', name, nowIso(), slotId, userId);
}

export async function getBotSlotConfig(slotId: string): Promise<Record<string, unknown>> {
  const r = await get<{ bot_config: string }>('SELECT bot_config FROM bot_slots WHERE id = ?', slotId);
  try {
    return r ? (JSON.parse(r.bot_config) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function setBotSlotConfig(slotId: string, cfg: Record<string, unknown>): Promise<void> {
  await run('UPDATE bot_slots SET bot_config = ?, updated_at = ? WHERE id = ?', JSON.stringify(cfg), nowIso(), slotId);
}
