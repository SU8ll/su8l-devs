import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import { capturePayPalOrder, createPayPalOrder } from '../lib/paypal.js';
import { generateOrderId } from '../lib/ids.js';
import {
  CURRENCY,
  DEFAULT_PROMO_DISCOUNT,
  EXTRA_SLOT_PRICE,
  getHighestTier,
  getPlan,
  promoPrice,
} from '../plans.js';
import {
  getOrder,
  getOrderByPaypalId,
  getPromoByCode,
  getUser,
  hasActiveBaseSubscription,
  insertOrder,
  markOrderDenied,
} from '../db.js';
import { fulfillOrder } from '../services/orders.js';
import { resolveAvatarUrl } from '../services/avatars.js';

const router = Router();

const createSchema = z.object({
  planKey: z.string().trim().optional(),
  cycle: z.enum(['monthly', 'yearly']).optional(),
  promoCode: z.string().trim().max(64).optional().nullable(),
  extraSlot: z.boolean().optional().default(false),
});

const captureSchema = z.object({ paypalOrderId: z.string().min(1) });
const promoValidateSchema = z.object({ promoCode: z.string().trim().min(1).max(64) });

// POST /api/checkout/create — create a PayPal order (plan or extra slot)
router.post('/create', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid request', detail: parsed.error.flatten() });
  const { planKey, cycle, promoCode, extraSlot } = parsed.data;

  let amount: number;
  let description: string;
  let plan: ReturnType<typeof getPlan>;
  let appliedPromo: string | null = null;
  let finalCycle: 'monthly' | 'yearly' | null = null;
  let finalPlanKey: string | null = null;
  let finalPlanName: string | null = null;

  if (extraSlot) {
    if (!(await hasActiveBaseSubscription(req.user.id))) {
      return res.status(403).json({ error: 'extra slot requires an active base subscription' });
    }
    amount = EXTRA_SLOT_PRICE;
    description = 'Permanent Extra Account Slot (+1 bot slot)';
  } else {
    if (!planKey || !cycle) return res.status(400).json({ error: 'planKey and cycle are required' });
    plan = getPlan(planKey);
    if (!plan) return res.status(400).json({ error: 'unknown plan' });

    finalCycle = cycle;
    finalPlanKey = plan.key;
    finalPlanName = plan.name;

    if (promoCode) {
      const normalized = promoCode.trim();
      if (!plan.isHighestTier) {
        return res.status(400).json({ error: 'promo codes apply only to the Elite (highest tier) plan' });
      }
      const promo = await getPromoByCode(normalized);
      if (!promo || promo.status !== 'unused') {
        return res.status(400).json({ error: 'invalid or already used promo code' });
      }
      appliedPromo = normalized;
      amount = promoPrice(plan, cycle, promo.discount ?? DEFAULT_PROMO_DISCOUNT);
      description = `${plan.name} Cloud Bot Service (promo ${promo.discount ?? DEFAULT_PROMO_DISCOUNT}% applied)`;
    } else {
      amount = cycle === 'yearly' ? plan.yearly : plan.monthly;
      description = `${plan.name} Cloud Bot Service`;
    }
  }

  const orderId = generateOrderId();
  try {
    // A 100%-off promo makes the amount $0. PayPal cannot create an order with
    // value "0.00", so bypass PayPal entirely: record the order and fulfill it
    // immediately (consumes the promo + activates the subscription).
    if (amount <= 0) {
      await insertOrder({
        id: orderId,
        user_id: req.user.id,
        plan_key: finalPlanKey,
        plan_name: finalPlanName,
        cycle: finalCycle,
        amount: 0,
        currency: CURRENCY,
        promo_code: appliedPromo,
        extra_slot: extraSlot ? 1 : 0,
        paypal_order_id: null,
      });
      await fulfillOrder(orderId, null);
      return res.json({
        orderId,
        paypalOrderId: '',
        approvalUrl: '',
        amount: 0,
        currency: CURRENCY,
        extraSlot: !!extraSlot,
        promoApplied: !!appliedPromo,
        free: true,
      });
    }

    const pp = await createPayPalOrder({
      referenceId: `ref_${orderId}`,
      orderId,
      description,
      amount,
      currency: CURRENCY,
      returnUrl: `${config.appUrl}/checkout/return`,
      cancelUrl: `${config.appUrl}/checkout/cancel`,
    });

    await insertOrder({
      id: orderId,
      user_id: req.user.id,
      plan_key: finalPlanKey,
      plan_name: finalPlanName,
      cycle: finalCycle,
      amount,
      currency: CURRENCY,
      promo_code: appliedPromo,
      extra_slot: extraSlot ? 1 : 0,
      paypal_order_id: pp.id,
    });

    return res.json({
      orderId,
      paypalOrderId: pp.id,
      approvalUrl: pp.approvalUrl,
      amount,
      currency: CURRENCY,
      extraSlot: !!extraSlot,
      promoApplied: !!appliedPromo,
    });
  } catch (err) {
    console.error('[checkout:create]', err);
    return res.status(502).json({ error: 'failed to create payment with PayPal' });
  }
});

// POST /api/checkout/capture — server-side capture after PayPal approval
router.post('/capture', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = captureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid request' });
  const { paypalOrderId } = parsed.data;

  const order = await getOrderByPaypalId(paypalOrderId);
  if (!order) return res.status(404).json({ error: 'order not found' });
  if (order.user_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });

  if (order.status === 'completed') {
    return res.json({ orderId: order.id, status: 'completed', already: true });
  }

  try {
    const cap = await capturePayPalOrder(paypalOrderId);
    if (cap.captureStatus === 'COMPLETED') {
      await fulfillOrder(order.id, cap.captureId);
      const updated = (await getOrder(order.id))!;
      return res.json({
        orderId: order.id,
        status: updated.status === 'completed' ? 'completed' : cap.status,
        conflict: updated.promo_conflict === 1,
      });
    }
    await markOrderDenied(order.id);
    return res.status(402).json({ error: 'payment not completed', paypalStatus: cap.captureStatus ?? cap.status });
  } catch (err) {
    console.error('[checkout:capture]', err);
    return res.status(422).json({ error: 'capture failed — order may not be approved yet' });
  }
});

// POST /api/checkout/validate-promo — live promo check for the checkout UI
router.post('/validate-promo', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = promoValidateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid request' });
  const code = parsed.data.promoCode.trim();
  const promo = await getPromoByCode(code);
  if (!promo || promo.status !== 'unused') {
    return res.json({ valid: false, message: 'Invalid or already used promo code.' });
  }
  const elite = getHighestTier();
  const discount = promo.discount ?? DEFAULT_PROMO_DISCOUNT;
  return res.json({
    valid: true,
    plan: elite.name,
    discount,
    maxMonths: promo.max_months,
    monthlyPrice: promoPrice(elite, 'monthly', discount),
    yearlyPrice: promoPrice(elite, 'yearly', discount),
    message: `Promo applied — ${elite.name} is now $${promoPrice(elite, 'monthly', discount)}/month (${discount}% off).`,
  });
});

// GET /api/checkout/orders/:id — public order summary for the Success screen
router.get('/orders/:id', async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'order not found' });
  const u = await getUser(order.user_id);
  return res.json({
    id: order.id,
    status: order.status,
    plan: order.plan_name ?? 'Permanent Extra Account Slot',
    amount: order.amount,
    currency: order.currency,
    extraSlot: order.extra_slot === 1,
    discordUsername: u?.username ?? null,
    discordAvatar: u ? resolveAvatarUrl(u.avatar) : null,
    createdAt: order.created_at,
    whatsapp: config.ownerWhatsApp,
  });
});

export default router;
