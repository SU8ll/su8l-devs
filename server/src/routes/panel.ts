import { Router, type Request, type Response, type NextFunction } from 'express';
import { config } from '../config.js';
import { MASTER_SCHEMA, SCHEMA_VERSION } from '../cloudSchema.js';
import { openSse } from '../lib/sse.js';
import { emitTicketEvent, subscribeTickets } from '../lib/ticketBus.js';
import { getSiteStatus, setSiteStatus } from '../db.js';
import {
  panelStats,
  panelSearchUsers,
  panelUserDetail,
  panelGrantSubscription,
  panelRevokeSubscription,
  panelGrantExtraSlot,
  panelRevokeExtraSlot,
  panelListOrders,
  panelListTickets,
  panelTicketDetail,
  panelReplyTicket,
  panelSetTicketStatus,
  panelDeleteTicket,
  panelListPromos,
  panelCreatePromos,
  panelDisablePromo,
  panelListConfigs,
  panelConfigChanges,
  panelReferrals,
} from '../dbPanel.js';

const router = Router();

function requirePanel(req: Request, res: Response, next: NextFunction) {
  const key = config.adminKey;
  if (!key) {
    return res.status(503).json({ error: 'admin_key_not_configured' });
  }
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${key}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

function bad(res: Response, message: string, status = 400) {
  return res.status(status).json({ error: message });
}

// POST /api/panel/login — verify the admin key and return it as the token.
router.post('/login', (req, res) => {
  const key = config.adminKey;
  if (!key) return res.status(503).json({ error: 'admin_key_not_configured' });
  const { password } = (req.body ?? {}) as { password?: string };
  if (!password || password !== key) return res.status(401).json({ error: 'invalid_key' });
  return res.json({ ok: true, token: key });
});

router.use(requirePanel);

router.get('/schema', (_req, res) => {
  res.json({ schema: MASTER_SCHEMA, version: SCHEMA_VERSION });
});

router.get('/stats', async (_req, res) => {
  res.json(await panelStats());
});

router.get('/users', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  res.json({ users: await panelSearchUsers(q) });
});

router.get('/users/:id', async (req, res) => {
  const detail = await panelUserDetail(req.params.id);
  if (!detail) return bad(res, 'user_not_found', 404);
  res.json(detail);
});

router.post('/users/:id/subscriptions', async (req, res) => {
  const { planKey, cycle, days } = (req.body ?? {}) as { planKey?: string; cycle?: string; days?: number };
  if (!planKey || (cycle !== 'monthly' && cycle !== 'yearly')) {
    return bad(res, 'planKey and cycle are required');
  }
  let daysNum: number | undefined;
  if (days !== undefined) {
    daysNum = Number(days);
    if (!Number.isInteger(daysNum) || daysNum < 1 || daysNum > 3650) {
      return bad(res, 'days must be an integer 1..3650');
    }
  }
  try {
    const sub = await panelGrantSubscription(req.params.id, planKey, cycle, daysNum);
    res.json({ ok: true, subscription: sub });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'grant_failed' });
  }
});

router.post('/users/:id/subscriptions/:subId/revoke', async (req, res) => {
  await panelRevokeSubscription(req.params.id, req.params.subId);
  res.json({ ok: true });
});

router.post('/users/:id/extra-slots', async (req, res) => {
  await panelGrantExtraSlot(req.params.id);
  res.json({ ok: true });
});

router.delete('/users/:id/extra-slots/:slotId', async (req, res) => {
  const slotId = Number(req.params.slotId);
  if (!Number.isInteger(slotId)) return bad(res, 'invalid_slot_id');
  await panelRevokeExtraSlot(req.params.id, slotId);
  res.json({ ok: true });
});

router.get('/orders', async (req, res) => {
  const status = String(req.query.status ?? '').trim() || undefined;
  res.json({ orders: await panelListOrders(status) });
});

router.get('/tickets', async (_req, res) => {
  res.json({ tickets: await panelListTickets() });
});

// GET /api/panel/tickets/stream — live events for ALL tickets (admin).
// Must be declared before /tickets/:id so 'stream' is not captured as :id.
router.get('/tickets/stream', (req, res) => {
  const sse = openSse(req, res);
  const unsubscribe = subscribeTickets((evt) => sse.send(evt));
  res.on('close', unsubscribe);
});

router.get('/tickets/:id', async (req, res) => {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId)) return bad(res, 'invalid_ticket_id');
  const detail = await panelTicketDetail(ticketId);
  if (!detail) return bad(res, 'ticket_not_found', 404);
  res.json(detail);
});

router.post('/tickets/:id/messages', async (req, res) => {
  const ticketId = Number(req.params.id);
  const { body } = (req.body ?? {}) as { body?: string };
  if (!Number.isInteger(ticketId)) return bad(res, 'invalid_ticket_id');
  if (!body || !body.trim()) return bad(res, 'body is required');
  const detail = await panelTicketDetail(ticketId);
  if (!detail) return bad(res, 'ticket_not_found', 404);
  await panelReplyTicket(ticketId, body.trim());
  emitTicketEvent({
    type: 'message',
    ticketId,
    userId: detail.ticket.user_id,
    author: 'staff',
    subject: detail.ticket.subject,
  });
  res.json({ ok: true });
});

router.post('/tickets/:id/status', async (req, res) => {
  const ticketId = Number(req.params.id);
  const { status } = (req.body ?? {}) as { status?: string };
  if (!Number.isInteger(ticketId)) return bad(res, 'invalid_ticket_id');
  if (status !== 'open' && status !== 'closed') return bad(res, 'status must be open or closed');
  const detail = await panelTicketDetail(ticketId);
  if (!detail) return bad(res, 'ticket_not_found', 404);
  await panelSetTicketStatus(ticketId, status);
  emitTicketEvent({ type: 'status', ticketId, userId: detail.ticket.user_id, status });
  res.json({ ok: true });
});

router.delete('/tickets/:id', async (req, res) => {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId)) return bad(res, 'invalid_ticket_id');
  const detail = await panelTicketDetail(ticketId);
  if (!detail) return bad(res, 'ticket_not_found', 404);
  await panelDeleteTicket(ticketId);
  emitTicketEvent({ type: 'deleted', ticketId, userId: detail.ticket.user_id });
  res.json({ ok: true });
});

router.get('/promos', async (_req, res) => {
  res.json({ promos: await panelListPromos() });
});

router.post('/promos', async (req, res) => {
  const { count, discount, months } = (req.body ?? {}) as { count?: number; discount?: number; months?: number | string };
  const n = Number(count ?? 1);
  if (!Number.isInteger(n) || n < 1 || n > 100) return bad(res, 'count must be 1..100');
  const d = discount === undefined ? 20 : Number(discount);
  if (!Number.isInteger(d) || d < 1 || d > 100) return bad(res, 'discount must be 1..100');
  let m: number | null = null;
  if (months !== undefined && months !== null && months !== '') {
    m = Number(months);
    if (!Number.isInteger(m) || m < 1 || m > 24) return bad(res, 'months must be 1..24');
  }
  const created = await panelCreatePromos(n, d, m);
  res.json({ ok: true, discount: d, months: m, codes: created.map((c) => c.code) });
});

router.delete('/promos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return bad(res, 'invalid_promo_id');
  await panelDisablePromo(id);
  res.json({ ok: true });
});

router.get('/configs', async (_req, res) => {
  res.json({ configs: await panelListConfigs() });
});

// GET /api/panel/config-changes — recent bot-slot config changes since a timestamp.
router.get('/config-changes', async (req, res) => {
  const since = String(req.query.since ?? '').trim();
  const changes = await panelConfigChanges(since || undefined);
  res.json({ changes });
});

// GET /api/panel/referrals?q= — referral relationships + referrer progress/rewards
router.get('/referrals', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  res.json({ referrals: await panelReferrals(q) });
});

// GET /api/panel/status — get current site status
router.get('/status', async (_req, res) => {
  const status = await getSiteStatus();
  res.json(status);
});

// PUT /api/panel/status — set maintenance mode
router.put('/status', async (req, res) => {
  const { maintenance, message } = req.body ?? {};
  if (typeof maintenance !== 'boolean') {
    return res.status(400).json({ error: 'maintenance must be boolean' });
  }
  await setSiteStatus(maintenance, typeof message === 'string' ? message : '');
  res.json({ ok: true });
});

export default router;
