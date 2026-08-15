import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import {
  addTicketMessage,
  createTicket,
  getAccounts,
  getTicket,
  listAllTickets,
  listTicketMessages,
  listTickets,
  setTicketStatus,
} from '../db.js';
import { config } from '../config.js';

const router = Router();

async function isStaff(userId: string): Promise<boolean> {
  const discordIds = (await getAccounts(userId)).filter((a) => a.provider === 'discord').map((a) => a.provider_id);
  return discordIds.some((id) => config.staffDiscordIds.includes(id));
}

const createSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(4000),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});

const messageSchema = z.object({ body: z.string().trim().min(1).max(4000) });
const statusSchema = z.object({ status: z.enum(['open', 'closed']) });

// GET /api/tickets — my tickets
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  res.json({ tickets: await listTickets(req.user.id) });
});

// POST /api/tickets — open a ticket
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid request', detail: parsed.error.flatten() });
  const ticket = await createTicket({
    userId: req.user.id,
    subject: parsed.data.subject,
    body: parsed.data.body,
    priority: parsed.data.priority,
  });
  res.status(201).json({ ticket });
});

// GET /api/tickets/:id — ticket + messages (owner or staff)
router.get('/:id(\\d+)', requireAuth, async (req: AuthedRequest, res) => {
  const ticket = await getTicket(Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: 'ticket not found' });
  if (ticket.user_id !== req.user.id && !(await isStaff(req.user.id))) return res.status(403).json({ error: 'forbidden' });
  res.json({ ticket, messages: await listTicketMessages(ticket.id), staff: await isStaff(req.user.id) });
});

// POST /api/tickets/:id/messages — reply (owner or staff)
router.post('/:id(\\d+)/messages', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid request' });
  const ticket = await getTicket(Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: 'ticket not found' });
  if (ticket.status === 'closed') return res.status(400).json({ error: 'ticket is closed' });
  if (ticket.user_id !== req.user.id && !(await isStaff(req.user.id))) return res.status(403).json({ error: 'forbidden' });
  const author = (await isStaff(req.user.id)) ? 'staff' : 'user';
  const message = await addTicketMessage(ticket.id, author, parsed.data.body);
  res.status(201).json({ message });
});

// POST /api/tickets/:id/status — close / reopen (owner or staff)
router.post('/:id(\\d+)/status', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid request' });
  const ticket = await getTicket(Number(req.params.id));
  if (!ticket) return res.status(404).json({ error: 'ticket not found' });
  if (ticket.user_id !== req.user.id && !(await isStaff(req.user.id))) return res.status(403).json({ error: 'forbidden' });
  await setTicketStatus(ticket.id, parsed.data.status);
  res.json({ ok: true, status: parsed.data.status });
});

// Staff-only: GET /api/tickets/all
router.get('/all', requireAuth, async (req: AuthedRequest, res) => {
  if (!(await isStaff(req.user.id))) return res.status(403).json({ error: 'staff only' });
  res.json({ tickets: await listAllTickets() });
});

export default router;
