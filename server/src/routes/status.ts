import { Router } from 'express';
import { getStatusSummary, runProbe, uptimeDaily } from '../services/uptime.js';
import { getSiteStatus } from '../db.js';

const router = Router();

// GET /api/status/summary — current status + uptime percentages + maintenance
router.get('/summary', async (_req, res) => {
  const [summary, siteStatus] = await Promise.all([getStatusSummary(), getSiteStatus()]);
  res.json({ ...summary, ...siteStatus });
});

// GET /api/status/live — force a fresh probe and return results
router.get('/live', async (_req, res) => {
  try {
    const check = await runProbe();
    const [summary, siteStatus] = await Promise.all([getStatusSummary(), getSiteStatus()]);
    res.json({ ...summary, ...siteStatus, lastCheck: check });
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
