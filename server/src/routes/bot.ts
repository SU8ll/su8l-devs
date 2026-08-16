import { Router } from 'express';
import { config } from '../config.js';
import { generatePromoCode } from '../lib/ids.js';
import { all, insertPromoCode } from '../db.js';

const router = Router();

// POST /api/bot/promo — generates a promo code. Guarded by the shared BOT_API_KEY.
// Optional body { discount } sets the percent discount (1-100, default 20).
router.post('/promo', async (req, res) => {
  const key = req.headers['x-bot-key'] ?? req.headers['x-api-key'];
  if (!key || key !== config.botApiKey) {
    return res.status(401).json({ error: 'invalid bot key' });
  }
  let discount = 20;
  if (req.body && typeof req.body.discount === 'number') {
    discount = Math.max(1, Math.min(100, Math.round(req.body.discount)));
  }
  const code = generatePromoCode();
  await insertPromoCode(code, 'bot', discount);
  res.status(201).json({
    code,
    discount,
    status: 'unused',
    note: `This code gives ${discount}% off the Elite (highest tier) plan. The $15 Extra Account Slot is never discounted.`,
  });
});

// GET /api/bot/promo/stats — how many codes remain unused
router.get('/promo/stats', async (req, res) => {
  const key = req.headers['x-bot-key'] ?? req.headers['x-api-key'];
  if (!key || key !== config.botApiKey) {
    return res.status(401).json({ error: 'invalid bot key' });
  }
  const rows = await all<{ status: string; n: number }>(
    `SELECT status, COUNT(*) AS n FROM promo_codes GROUP BY status`
  );
  const stats = { unused: 0, used: 0 };
  for (const r of rows) stats[r.status as 'unused'] = Number(r.n);
  res.json(stats);
});

export default router;
