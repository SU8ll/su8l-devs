import { Router } from 'express';
import { config } from '../config.js';
import { generatePromoCode } from '../lib/ids.js';
import { all, insertPromoCode } from '../db.js';

const router = Router();

// POST /api/bot/promo — generates a promo code. Guarded by the shared BOT_API_KEY.
// Owner-locking lives in the Discord bot command itself (interaction.user.id check).
router.post('/promo', (req, res) => {
  const key = req.headers['x-bot-key'] ?? req.headers['x-api-key'];
  if (!key || key !== config.botApiKey) {
    return res.status(401).json({ error: 'invalid bot key' });
  }
  const code = generatePromoCode();
  insertPromoCode(code, 'bot');
  res.status(201).json({
    code,
    status: 'unused',
    note: 'This code forces the Elite (highest tier) plan to $25/month. The $15 Extra Account Slot is never discounted.',
  });
});

// GET /api/bot/promo/stats — how many codes remain unused
router.get('/promo/stats', (req, res) => {
  const key = req.headers['x-bot-key'] ?? req.headers['x-api-key'];
  if (!key || key !== config.botApiKey) {
    return res.status(401).json({ error: 'invalid bot key' });
  }
  const rows = all<{ status: string; n: number }>(
    `SELECT status, COUNT(*) AS n FROM promo_codes GROUP BY status`
  );
  const stats = { unused: 0, used: 0 };
  for (const r of rows) stats[r.status as 'unused'] = Number(r.n);
  res.json(stats);
});

export default router;
