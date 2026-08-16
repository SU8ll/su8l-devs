import { Router } from 'express';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import {
  ensureBotSlots,
  getBotSlot,
  getBotSlotConfig,
  getEffectiveSlots,
  getExtraSlotCount,
  getSubscriptions,
  hasActiveBaseSubscription,
  ownsExtraSlot,
  renameBotSlot,
  setBotSlotConfig,
} from '../db.js';
import { getStatusSummary } from '../services/uptime.js';
import { resolveAvatarUrl } from '../services/avatars.js';
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
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const subscriptions = await getSubscriptions(req.user.id);
  const active = subscriptions.filter((s) => s.status === 'active');
  const slots = await getEffectiveSlots(req.user.id);
  const extraSlots = await getExtraSlotCount(req.user.id);

  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      avatar: resolveAvatarUrl(req.user.avatar),
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
    canBuyExtraSlot: (await hasActiveBaseSubscription(req.user.id)) && !(await ownsExtraSlot(req.user.id)),
    ownsExtraSlot: await ownsExtraSlot(req.user.id),
    extraSlotPrice: 15,
    status: await getStatusSummary(),
  });
});

// GET /api/dashboard/slots — the user's bot-slot (account) list
router.get('/slots', requireAuth, async (req: AuthedRequest, res) => {
  const slotsInfo = await getEffectiveSlots(req.user.id);
  const slots = slotsInfo.total > 0 ? await ensureBotSlots(req.user.id, slotsInfo.total) : [];
  res.json({
    total: slotsInfo.total,
    activeSlotId: slots[0]?.id ?? null,
    slots: slots.map((s) => ({ id: s.id, name: s.name })),
  });
});

// PUT /api/dashboard/slots/:id/name — rename a bot slot (account)
router.put('/slots/:id/name', requireAuth, async (req: AuthedRequest, res) => {
  const slotId = req.params.id;
  if (!slotId) return res.status(400).json({ error: 'invalid slot id' });
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 60) {
    return res.status(400).json({ error: 'invalid name' });
  }
  const slot = await getBotSlot(slotId, req.user.id);
  if (!slot) return res.status(404).json({ error: 'slot not found' });
  await renameBotSlot(slotId, req.user.id, name);
  res.json({ ok: true, slot: { id: slot.id, name } });
});

// GET /api/dashboard/cloud-config — the Cloud Configurator state + option lists
// for one bot slot (defaults to the user's first slot).
router.get('/cloud-config', requireAuth, async (req: AuthedRequest, res) => {
  const slotsInfo = await getEffectiveSlots(req.user.id);
  const slots = slotsInfo.total > 0 ? await ensureBotSlots(req.user.id, slotsInfo.total) : [];
  const requested = typeof req.query.slotId === 'string' ? req.query.slotId : undefined;
  const active = (requested ? slots.find((s) => s.id === requested) : undefined) ?? slots[0] ?? null;
  const config = active ? normalizeCloudConfig(await getBotSlotConfig(active.id)) : ({} as CloudConfig);
  const identity = await getDiscordIdentity(req.user.id);
  res.json({
    config,
    schema: MASTER_SCHEMA,
    locked: slotsInfo.total === 0,
    discord: identity
      ? { username: identity.discordUsername, id: identity.discordId }
      : null,
    slots: slots.map((s) => ({ id: s.id, name: s.name })),
    activeSlotId: active ? active.id : null,
  });
});

// PUT /api/dashboard/cloud-config — validate, persist, then dispatch to the
// owner's Discord DM via the bot. Config is saved even if the DM dispatch
// fails (the bot may be restarting); the response reports dispatch status so
// the UI can warn without blocking the save.
router.put('/cloud-config', requireAuth, async (req: AuthedRequest, res) => {
  // Accept `{ config, slotId }` (new) or a bare config payload (legacy).
  const raw =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body) && 'config' in req.body
      ? (req.body as { config: unknown }).config
      : req.body;
  const parsed = cloudConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid config', detail: parsed.error.flatten() });
  }
  const issues = cloudConfigIssues(parsed.data);
  if (issues.length > 0) {
    return res.status(400).json({ error: 'invalid config', detail: issues });
  }

  const slotsInfo = await getEffectiveSlots(req.user.id);
  if (slotsInfo.total === 0) {
    return res.status(403).json({ error: 'no active slots' });
  }
  const slots = await ensureBotSlots(req.user.id, slotsInfo.total);
  const requested =
    req.body && typeof req.body === 'object' && typeof (req.body as { slotId?: unknown }).slotId === 'string'
      ? (req.body as { slotId: string }).slotId
      : undefined;
  const slot = (requested ? slots.find((s) => s.id === requested) : undefined) ?? slots[0]!;

  const config = parsed.data as CloudConfig;
  await setBotSlotConfig(slot.id, config as unknown as Record<string, unknown>);

  let dispatched = false;
  let dispatchReason: string | undefined;
  const identity = await getDiscordIdentity(req.user.id);
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
    config: normalizeCloudConfig(await getBotSlotConfig(slot.id)),
    activeSlotId: slot.id,
    dispatched,
    dispatchReason,
  });
});

export default router;
