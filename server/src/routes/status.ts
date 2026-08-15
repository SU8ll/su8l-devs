import { Router } from 'express';
import { getStatusSummary, runProbe, uptimeDaily } from '../services/uptime.js';

const router = Router();

// GET /api/status/summary — current status + uptime percentages
router.get('/summary', async (_req, res) => {
  res.json(await getStatusSummary());
});

// GET /api/status/live — force a fresh probe and return results
router.get('/live', async (_req, res) => {
  try {
    const check = await runProbe();
    res.json({ ...(await getStatusSummary()), lastCheck: check });
  } catch {
    res.status(500).json({ error: 'probe failed' });
  }
});

// GET /api/status/history?days=30 — per-day uptime history for the chart
router.get('/history', async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days || 30), 1), 60);
  res.json({ days, history: await uptimeDaily(days) });
});

export default router;
