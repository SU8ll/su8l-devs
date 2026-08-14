import { Router } from 'express';
import { PLANS } from '../plans.js';

const router = Router();

// GET /api/plans — public plan catalog (includes highest-tier flag for promo UI)
router.get('/', (_req, res) => {
  res.json({
    plans: PLANS.map((p) => ({
      key: p.key,
      name: p.name,
      tagline: p.tagline,
      monthly: p.monthly,
      yearly: p.yearly,
      slots: p.slots,
      badge: p.badge ?? null,
      isHighestTier: !!p.isHighestTier,
      features: p.features,
    })),
    currency: 'USD',
  });
});

export default router;
