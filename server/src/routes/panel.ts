import { Router, type Request, type Response, type NextFunction } from 'express';
import { config } from '../config.js';
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
  panelListPromos,
  panelCreatePromos,
  panelDisablePromo,
  panelListConfigs,
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
  const { planKey, cycle } = (req.body ?? {}) as { planKey?: string; cycle?: string };
  if (!planKey || (cycle !== 'monthly' && cycle !== 'yearly')) {
    return bad(res, 'planKey and cycle are required');
  }
  try {
    const sub = await panelGrantSubscription(req.params.id, planKey, cycle);
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
  await panelReplyTicket(ticketId, body.trim());
  res.json({ ok: true });
});

router.post('/tickets/:id/status', async (req, res) => {
  const ticketId = Number(req.params.id);
  const { status } = (req.body ?? {}) as { status?: string };
  if (!Number.isInteger(ticketId)) return bad(res, 'invalid_ticket_id');
  if (status !== 'open' && status !== 'closed') return bad(res, 'status must be open or closed');
  await panelSetTicketStatus(ticketId, status);
  res.json({ ok: true });
});

router.get('/promos', async (_req, res) => {
  res.json({ promos: await panelListPromos() });
});

router.post('/promos', async (req, res) => {
  const { count } = (req.body ?? {}) as { count?: number };
  const n = Number(count ?? 1);
  if (!Number.isInteger(n) || n < 1 || n > 100) return bad(res, 'count must be 1..100');
  const created = await panelCreatePromos(n);
  res.json({ ok: true, codes: created.map((c) => c.code) });
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

export default router;
