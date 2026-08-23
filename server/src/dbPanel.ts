import {
  pool,
  getUser,
  getAccounts,
  getSubscriptions,
  activateSubscription,
  insertExtraSlot,
  listAllTickets,
  getTicket,
  listTicketMessages,
  addTicketMessage,
  setTicketStatus,
  listBotSlots,
  getBotSlotConfig,
  withTransaction,
  nowIso,
  subscriptionDisplayStatus,
} from './db.js';
import { getPlan, planCycleMonths } from './plans.js';
import { generatePromoCode } from './lib/ids.js';
import { FLAT_SCHEMA } from './cloudSchema.js';

/**
 * Renders a stored bot_config JSON into a readable, schema-labelled list so the
 * admin panel can show the customer's selections without knowing the schema.
 */
export function summarizeBotConfig(cfgInput: unknown): { group: string; label: string; value: string }[] {
  let cfg: unknown = {};
  if (typeof cfgInput === 'string') {
    try { cfg = JSON.parse(cfgInput); } catch { cfg = {}; }
  } else if (cfgInput !== null && typeof cfgInput === 'object') {
    cfg = cfgInput;
  }
  const out: { group: string; label: string; value: string }[] = [];
  const walk = (node: unknown, path: string[]): void => {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) {
      const key = path.join('.');
      const f = FLAT_SCHEMA[key];
      out.push({
        group: path.slice(0, -1).join(' / ') || '—',
        label: f?.label ?? key,
        value: typeof node === 'boolean' ? (node ? 'true' : 'false') : String(node ?? ''),
      });
      return;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, [...path, k]);
  };
  walk(cfg, []);
  return out;
}

async function q1<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
  const res = await pool.query(sql, params);
  return res.rows[0] as T | undefined;
}

export async function panelStats() {
  const now = Date.now();
  const s = {
    users: ((await q1<{ n: string }>('SELECT COUNT(*)::bigint AS n FROM users'))?.n ?? '0'),
    activeSubs: (
      (await q1<{ n: string }>(
        `SELECT COUNT(*)::bigint AS n FROM subscriptions WHERE status = 'active' AND (current_period_end IS NULL OR current_period_end > $1)`,
        now
      ))?.n ?? '0'
    ),
    orders: ((await q1<{ n: string }>('SELECT COUNT(*)::bigint AS n FROM orders'))?.n ?? '0'),
    revenue: (
      (await q1<{ s: string | null }>(
        `SELECT COALESCE(SUM(amount), 0) AS s FROM orders WHERE status = 'completed'`
      ))?.s ?? '0'
    ),
    revenuePending: (
      (await q1<{ s: string | null }>(
        `SELECT COALESCE(SUM(amount), 0) AS s FROM orders WHERE status = 'pending'`
      ))?.s ?? '0'
    ),
    ticketsOpen: (
      (await q1<{ n: string }>(`SELECT COUNT(*)::bigint AS n FROM tickets WHERE status = 'open'`))?.n ?? '0'
    ),
    promoCount: (
      (await q1<{ n: string }>(`SELECT COUNT(*)::bigint AS n FROM promo_codes WHERE status = 'unused'`))?.n ?? '0'
    ),
    extraSlots: ((await q1<{ n: string }>('SELECT COUNT(*)::bigint AS n FROM extra_slots'))?.n ?? '0'),
    configs: (
      (await q1<{ n: string }>(
        `SELECT COUNT(*)::bigint AS n FROM bot_slots WHERE bot_config IS NOT NULL AND bot_config <> '{}'`
      ))?.n ?? '0'
    ),
  };
  return {
    ...s,
    users: Number(s.users),
    activeSubs: Number(s.activeSubs),
    orders: Number(s.orders),
    revenue: Number(s.revenue),
    revenuePending: Number(s.revenuePending),
    ticketsOpen: Number(s.ticketsOpen),
    promoCount: Number(s.promoCount),
    extraSlots: Number(s.extraSlots),
    configs: Number(s.configs),
  };
}

export async function panelSearchUsers(q: string, limit = 50) {
  const needle = `%${q}%`;
  const res = await pool.query(
    `SELECT id, email, username, avatar, locale, created_at
       FROM users
      WHERE id ILIKE $1 OR email ILIKE $1 OR username ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [needle, limit]
  );
  return res.rows;
}

export async function panelUserDetail(userId: string) {
  const user = await getUser(userId);
  if (!user) return null;
  const [accounts, subscriptions, orders, extraSlots, botSlots] = await Promise.all([
    getAccounts(userId),
    (await getSubscriptions(userId)).map((s) => ({ ...s, status: subscriptionDisplayStatus(s) })),
    pool.query(
      `SELECT o.*, u.username AS user_username FROM orders o JOIN users u ON u.id = o.user_id WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
      [userId]
    ),
    pool.query(`SELECT * FROM extra_slots WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
    listBotSlots(userId),
  ]);
  const slotConfigs = await Promise.all(
    botSlots.map(async (s) => {
      const cfg = await getBotSlotConfig(s.id);
      return { ...s, cfg, summary: summarizeBotConfig(cfg) };
    })
  );
  return {
    user,
    accounts,
    subscriptions,
    orders: orders.rows,
    extraSlots: extraSlots.rows,
    botSlots: slotConfigs,
  };
}

export async function panelGrantSubscription(userId: string, planKey: string, cycle: 'monthly' | 'yearly', days?: number) {
  const plan = getPlan(planKey);
  if (!plan) throw new Error('unknown plan');
  return withTransaction(() =>
    activateSubscription({
      userId,
      plan,
      cycle,
      amount: 0,
      durationMs: days && Number.isFinite(days) && days > 0 ? days * 24 * 60 * 60 * 1000 : undefined,
    })
  );
}

export async function panelRevokeSubscription(userId: string, subId: string) {
  await pool.query(
    `UPDATE subscriptions SET status = 'cancelled', updated_at = $1 WHERE id = $2 AND user_id = $3`,
    [nowIso(), subId, userId]
  );
}

export async function panelGrantExtraSlot(userId: string) {
  return insertExtraSlot(userId, null, 0);
}

export async function panelRevokeExtraSlot(userId: string, slotId: number) {
  await pool.query(`DELETE FROM extra_slots WHERE id = $1 AND user_id = $2`, [slotId, userId]);
}

export async function panelListOrders(status?: string) {
  const res = await pool.query(
    `SELECT o.*, u.username, u.email
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE ($1::text IS NULL OR o.status = $1)
      ORDER BY o.created_at DESC
      LIMIT 300`,
    [status || null]
  );
  return res.rows;
}

export async function panelListTickets(limit = 200) {
  const res = await pool.query(
    `SELECT tk.*, u.username, u.email,
            (SELECT COUNT(*)::int FROM ticket_messages tm WHERE tm.ticket_id = tk.id) AS messages_count,
            (SELECT tm.author FROM ticket_messages tm WHERE tm.ticket_id = tk.id ORDER BY tm.id DESC LIMIT 1) AS last_message_author
       FROM tickets tk JOIN users u ON u.id = tk.user_id
      ORDER BY (tk.status = 'open') DESC, tk.updated_at DESC
      LIMIT $1`,
    [limit]
  );
  return res.rows;
}

export async function panelTicketDetail(ticketId: number) {
  const ticket = await getTicket(ticketId);
  if (!ticket) return null;
  const user = await getUser(ticket.user_id);
  const messages = await listTicketMessages(ticketId);
  return { ticket, user, messages };
}

export async function panelReplyTicket(ticketId: number, body: string) {
  await addTicketMessage(ticketId, 'staff', body);
  await pool.query(`UPDATE tickets SET status = 'open', updated_at = $1 WHERE id = $2`, [nowIso(), ticketId]);
}

export function panelSetTicketStatus(ticketId: number, status: 'open' | 'closed') {
  return setTicketStatus(ticketId, status);
}

export async function panelDeleteTicket(ticketId: number): Promise<void> {
  await withTransaction(async () => {
    await pool.query('DELETE FROM ticket_messages WHERE ticket_id = $1', [ticketId]);
    await pool.query('DELETE FROM tickets WHERE id = $1', [ticketId]);
  });
}

export async function panelListPromos() {
  const res = await pool.query(
    `SELECT p.*,
            (SELECT COUNT(*)::int FROM orders o WHERE o.promo_code = p.code) AS used_orders
       FROM promo_codes p
      ORDER BY p.created_at DESC
      LIMIT 300`
  );
  return res.rows;
}

export async function panelCreatePromos(count: number, discount = 20, maxMonths: number | null = null) {
  const safeDiscount = Math.max(1, Math.min(100, Math.round(discount)));
  const safeMonths = maxMonths === null || maxMonths === undefined ? null : Math.max(1, Math.min(24, Math.round(maxMonths)));
  const created = [];
  for (let i = 0; i < count; i++) {
    const code = generatePromoCode();
    const res = await pool.query(
      `INSERT INTO promo_codes (code, status, discount, max_months, used_by, used_at, created_by, created_at)
       VALUES ($1, 'unused', $2, $3, NULL, NULL, 'admin', $4)
       RETURNING *`,
      [code, safeDiscount, safeMonths, nowIso()]
    );
    created.push(res.rows[0]);
  }
  return created;
}

export async function panelDisablePromo(id: number) {
  await pool.query(`UPDATE promo_codes SET status = 'disabled' WHERE id = $1`, [id]);
}

export async function panelListConfigs(limit = 100) {
  const res = await pool.query(
    `SELECT bs.id AS slot_id, bs.user_id, bs.name, bs.bot_config, bs.sort, bs.updated_at,
            u.username, u.email
       FROM bot_slots bs JOIN users u ON u.id = bs.user_id
      WHERE bs.bot_config IS NOT NULL AND bs.bot_config <> '{}'
      ORDER BY bs.updated_at DESC
      LIMIT $1`,
    [limit]
  );
  return res.rows.map((r) => ({ ...r, summary: summarizeBotConfig(r.bot_config) }));
}

// Kept for parity with the tickets export list; used by the admin panel router.
export { listAllTickets };

export async function panelConfigChanges(since?: string) {
  const where = since ? `WHERE bs.updated_at > $1` : '';
  const params = since ? [since] : [];
  const res = await pool.query(
    `SELECT bs.id AS slot_id, bs.name, bs.updated_at, u.username, u.email
       FROM bot_slots bs JOIN users u ON u.id = bs.user_id
       ${where}
       ORDER BY bs.updated_at DESC
       LIMIT 50`,
    params
  );
  return res.rows;
}

export const panelPlanOptions = ['starter', 'elite'].map((key) => ({
  key,
  months: planCycleMonths('monthly'),
}));
