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
  getProduct,
  promoPrice,
} from '../plans.js';
import {
  countReferrals,
  getOrder,
  getOrderByPaypalId,
  getOrCreateReferralCode,
  getPromoByCode,
  getUser,
  getReferralCodeOwner,
  getUserReferralRef,
  setUserReferralRef,
  hasActiveBaseSubscription,
  insertOrder,
  logReferrerDiscount,
  markOrderDenied,
} from '../db.js';
import { fulfillOrder } from '../services/orders.js';
import { resolveAvatarUrl } from '../services/avatars.js';
import { REFERRAL_DISCOUNT as REFERRAL_DISCOUNT_8 } from './referral.js';

const router = Router();

const createSchema = z.object({
  planKey: z.string().trim().optional(),
  cycle: z.enum(['monthly', 'yearly']).optional(),
  promoCode: z.string().trim().max(64).optional().nullable(),
  extraSlot: z.boolean().optional().default(false),
  cloudHosting: z.boolean().optional().default(false),
  refCode: z.string().trim().max(16).optional().nullable(),
});

const captureSchema = z.object({ paypalOrderId: z.string().min(1) });
const promoValidateSchema = z.object({ promoCode: z.string().trim().min(1).max(64) });

// POST /api/checkout/create — create a PayPal order (plan or extra slot)
router.post('/create', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid request', detail: parsed.error.flatten() });
  const { planKey, cycle, promoCode, extraSlot, cloudHosting, refCode } = parsed.data;

  // Resolve the friend referral code from the explicit body param OR the cookie
  // that was set when the user signed up via a friend's link.
  let referralCode: string | null = refCode?.trim() ? refCode.trim().toUpperCase() : null;
  if (!referralCode) {
    const cookieRef = (req.cookies as Record<string, string> | undefined)?.['su8l_ref'];
    if (cookieRef && typeof cookieRef === 'string' && cookieRef.trim()) {
      referralCode = cookieRef.trim().toUpperCase();
    }
  }
  if (!referralCode) {
    // Fallback to the code persisted on the ACCOUNT at signup (survives any
    // login/device/browser; third-party cookies are blocked cross-origin).
    const acctRef = await getUserReferralRef(req.user.id);
    if (acctRef) referralCode = acctRef;
  }
  // The code must belong to a real user (it may be your own code, which grants
  // YOU the referrer's 8% discount instead of counting a new referral).
  const referralOwner = referralCode ? await getReferralCodeOwner(referralCode) : undefined;
  if (referralCode && !referralOwner) {
    referralCode = null;
  }
  const isOwnCode = !!referralCode && !!referralOwner && referralOwner.user_id === req.user.id;
  // Persist a valid friend referral code on the account so it survives even if
  // the browser/cookie/localStorage clears later — enables the fulfill fallback.
  if (referralCode && !isOwnCode && referralOwner && referralOwner.user_id !== req.user.id) {
    await setUserReferralRef(req.user.id, referralCode);
  }
  console.log(`[referral:create] user=${req.user.id} bodyRef=${JSON.stringify(refCode)} finalRef=${referralCode} owner=${referralOwner?.user_id} isOwn=${isOwnCode}`);

  let amount: number;
  let description: string;
  let plan: ReturnType<typeof getPlan>;
  let appliedPromo: string | null = null;
  let appliedReferral: string | null = null;
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

    // Check if it's a product (one-time purchase)
    const product = getProduct(planKey);
    if (product) {
      amount = product.price + (cloudHosting ? 8 : 0);
      description = cloudHosting ? `${product.name} + Cloud Hosting ($8/mo)` : product.name;
      finalPlanKey = product.key;
      finalPlanName = cloudHosting ? `${product.name} + Cloud Hosting` : product.name;
    } else {
      plan = getPlan(planKey);
      if (!plan) return res.status(400).json({ error: 'unknown plan' });

      finalCycle = cycle;
      finalPlanKey = plan.key;
      finalPlanName = plan.name;

      // Referral discount: 8% off the Elite (highest tier) plan ONLY. It never
      // applies to products, extra slots, or the Starter plan.
      let referralDiscount = 0;
      if (!referralCode && plan.isHighestTier) {
        // Auto-apply the user's own referral code so they get 8% off Elite as
        // a perk for being a referrer (link owner), without needing to enter it.
        const ownCode = await getOrCreateReferralCode(req.user.id);
        if (ownCode?.code) {
          referralCode = ownCode.code;
          // isOwnCode will be set correctly below (owner matches self).
        }
      }
      if (referralCode && plan.isHighestTier) {
        referralDiscount = REFERRAL_DISCOUNT_8;
        appliedReferral = referralCode;
        console.log(`[referral:create] applying 8% to user=${req.user.id} plan=${planKey} ref=${referralCode}`);
        // If the referrer used their OWN code (their 8% discount) before
        // completing the original 5-referral goal, this raises their free-month
        // goal from 5 to 7. Log it once (idempotent) with the count at that time.
        if (isOwnCode) {
          const currentCount = await countReferrals(req.user.id);
          await logReferrerDiscount(req.user.id, currentCount);
        }
      }

      if (promoCode && referralDiscount > 0) {
        // Combination is normally forbidden, but we allow it when the promo is a
        // 100%-off code. Only the owner/admin can create 100% codes (panel), so
        // this is a safe way for the owner to test the referral flow for free
        // without opening an exploit for regular customers.
        const normalizedPromo = promoCode.trim();
        const promoCombined = await getPromoByCode(normalizedPromo);
        const isOwnerFreeCode = !!promoCombined && promoCombined.discount === 100;
        if (!isOwnerFreeCode) {
          return res.status(400).json({ error: 'referral and promo codes cannot be combined' });
        }
      }

      const combiningOwnerFreePromo = !!promoCode && referralDiscount > 0;
      if (referralDiscount > 0 && !combiningOwnerFreePromo) {
        amount = Math.round((cycle === 'yearly' ? plan.yearly : plan.monthly) * (100 - referralDiscount) / 100);
        description = `${plan.name} Cloud Bot Service (friend referral ${referralDiscount}% applied)`;
      } else if (promoCode) {
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
        referral_code: appliedReferral,
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
      referral_code: appliedReferral,
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
