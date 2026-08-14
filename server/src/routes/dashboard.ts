import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import {
  getBotConfig,
  getEffectiveSlots,
  getExtraSlotCount,
  getSubscriptions,
  hasActiveBaseSubscription,
  ownsExtraSlot,
  setBotConfig,
} from '../db.js';
import { getStatusSummary } from '../services/uptime.js';
import {
  MASTER_SCHEMA,
  cloudConfigIssues,
  cloudConfigSchema,
  compileCloudConfig,
  normalizeCloudConfig,
  type CloudConfig,
} from '../botConfig.js';
import { dispatchToBot, getDiscordIdentity } from '../services/dispatch.js';

const router = Router();

// GET /api/dashboard — full summary for the customer dashboard
router.get('/', requireAuth, (req: AuthedRequest, res) => {
  const subscriptions = getSubscriptions(req.user.id);
  const active = subscriptions.filter((s) => s.status === 'active');
  const slots = getEffectiveSlots(req.user.id);
  const extraSlots = getExtraSlotCount(req.user.id);

  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      avatar: req.user.avatar,
      email: req.user.email,
    },
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      planKey: s.plan_key,
      planName: s.plan_name,
      cycle: s.cycle,
      amount: s.amount,
      status: s.status,
      currentPeriodEnd: s.current_period_end,
    })),
    activeSubscriptions: active.length,
    slots,
    extraSlots,
    canBuyExtraSlot: hasActiveBaseSubscription(req.user.id) && !ownsExtraSlot(req.user.id),
    ownsExtraSlot: ownsExtraSlot(req.user.id),
    extraSlotPrice: 15,
    status: getStatusSummary(),
  });
});

// GET /api/dashboard/cloud-config — the Cloud Configurator state + option lists
router.get('/cloud-config', requireAuth, (req: AuthedRequest, res) => {
  const stored = getBotConfig(req.user.id);
  const config = normalizeCloudConfig(stored);
  const slots = getEffectiveSlots(req.user.id);
  const identity = getDiscordIdentity(req.user.id);
  res.json({
    config,
    schema: MASTER_SCHEMA,
    slotsAvailable: slots.total,
    locked: slots.total === 0,
    discord: identity
      ? { username: identity.discordUsername, id: identity.discordId }
      : null,
  });
});

// PUT /api/dashboard/cloud-config — validate, persist, then dispatch to the
// owner's Discord DM via the bot. Config is saved even if the DM dispatch
// fails (the bot may be restarting); the response reports dispatch status so
// the UI can warn without blocking the save.
router.put('/cloud-config', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = cloudConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid config', detail: parsed.error.flatten() });
  }
  const issues = cloudConfigIssues(parsed.data);
  if (issues.length > 0) {
    return res.status(400).json({ error: 'invalid config', detail: issues });
  }

  const config = parsed.data as CloudConfig;
  setBotConfig(req.user.id, config as unknown as Record<string, unknown>);

  let dispatched = false;
  let dispatchReason: string | undefined;
  const identity = getDiscordIdentity(req.user.id);
  if (identity) {
    const result = await dispatchToBot({
      type: 'cloud_config',
      discordUsername: identity.discordUsername,
      discordId: identity.discordId,
      message: compileCloudConfig(config, identity),
    });
    dispatched = result.dispatched;
    dispatchReason = result.reason;
  }

  res.json({
    ok: true,
    config: normalizeCloudConfig(getBotConfig(req.user.id)),
    dispatched,
    dispatchReason,
  });
});

export default router;
