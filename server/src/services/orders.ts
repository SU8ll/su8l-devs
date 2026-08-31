import {
  activateSubscription,
  countReferrals,
  getOrder,
  getPromoByCode,
  getReferralCodeOwner,
  getReferralRewardRow,
  hasReferralByInvitee,
  insertExtraSlot,
  insertReferral,
  markOrderCompleted,
  markOrderPromoConflict,
  markPromoUsed,
  nowIso,
  setReferralReward,
  withTransaction,
} from '../db.js';
import { getHighestTier, planCycleMonths } from '../plans.js';
import { dispatchToBot, getDiscordIdentity } from './dispatch.js';

/**
 * Single idempotent fulfillment entry point. Called from BOTH the PayPal
 * webhook handler and the /checkout/capture route.
 *
 * Promo-code consumption and subscription/extra-slot activation happen inside
 * ONE `BEGIN`/`COMMIT` transaction on a single pooled Postgres connection, so
 * a promo code can never be consumed twice even if two captures race.
 */
export async function fulfillOrder(orderId: string, captureId: string | null): Promise<boolean> {
  const order = await getOrder(orderId);
  if (!order) return false;
  if (order.status === 'completed') return true;

  const completed = await withTransaction(async () => {
    const fresh = await getOrder(orderId);
    if (!fresh || fresh.status === 'completed') return true;

    if (fresh.promo_code) {
      const promo = await getPromoByCode(fresh.promo_code);
      if (promo && promo.status === 'unused') {
        await markPromoUsed(fresh.promo_code, fresh.user_id);
      } else {
        await markOrderPromoConflict(fresh.id);
      }
    }

    if (fresh.extra_slot) {
      await insertExtraSlot(fresh.user_id, fresh.id, fresh.amount);
    } else if (fresh.plan_key && fresh.cycle) {
      const plan = { key: fresh.plan_key, name: fresh.plan_name ?? fresh.plan_key };
      // If the promo caps the subscription length (max_months), pass it through
      // so a 100%-off code grants at most that many months, then full price.
      let maxMonths: number | undefined;
      if (fresh.promo_code) {
        const promo = await getPromoByCode(fresh.promo_code);
        if (promo?.max_months) maxMonths = promo.max_months;
      }
      await activateSubscription({
        userId: fresh.user_id,
        plan: plan as Parameters<typeof activateSubscription>[0]['plan'],
        cycle: fresh.cycle,
        amount: fresh.amount,
        maxMonths,
      });

      // ── Friend referral recording ─────────────────────────────────────────
      // A referral is counted ONLY on the invitee's first paid Elite order
      // (highest tier). We record it here, inside the transaction, so it can
      // never be double-counted, and we immediately grant the referrer a free
      // Elite month when they reach 3 new subscribers.
      if (fresh.referral_code) {
        const owner = await getReferralCodeOwner(fresh.referral_code);
        const elite = getHighestTier();
        const isEliteOrder = fresh.plan_key === elite.key;
        const alreadyCounted = await hasExistingReferral(fresh.user_id);
        if (owner && isEliteOrder && !alreadyCounted) {
          await insertReferral({
            referrerUserId: owner.user_id,
            inviteeUserId: fresh.user_id,
            eliteOrderId: fresh.id,
          });
          await grantFreeMonthWhenEligible(owner.user_id);
        }
      }
    }

    await markOrderCompleted(fresh.id, captureId);
    return true;
  });

  if (completed) {
    // Best-effort Discord role grant for the paying customer. Fire-and-forget:
    // fulfillment must never fail because the bot is momentarily unreachable.
    const identity = await getDiscordIdentity(order.user_id);
    if (identity) {
      void dispatchToBot({
        type: 'grant_role',
        discordId: identity.discordId,
        username: identity.discordUsername,
        plan: order.plan_name ?? 'Permanent Extra Account Slot',
        orderId: order.id,
      });
    }
  }

  return completed;
}

export async function promoConflictDetected(orderId: string): Promise<boolean> {
  const order = await getOrder(orderId);
  if (!order || !order.promo_code) return false;
  // After fulfillment the promo row is 'used'; conflict means it was ALREADY
  // used by someone else (or by this user) before this order consumed it.
  return order.promo_conflict === 1;
}

async function hasExistingReferral(inviteeUserId: string): Promise<boolean> {
  return hasReferralByInvitee(inviteeUserId);
}

/**
 * Records the referral and, once the referrer has brought in 3 NEW Elite
 * subscribers, grants them a free month of the highest tier. Idempotent: the
 * reward is only written once (tracked in referral_rewards). Must be called
 * inside the `withTransaction` from fulfillOrder.
 */
async function grantFreeMonthWhenEligible(referrerUserId: string): Promise<void> {
  const count = await countReferrals(referrerUserId);
  if (count < 3) return;

  const existingReward = await getReferralRewardRow(referrerUserId);
  if (existingReward?.awarded) return; // already rewarded in a prior run

  const elite = getHighestTier();
  await activateSubscription({
    userId: referrerUserId,
    plan: elite,
    cycle: 'monthly',
    amount: 0,
    durationMs: planCycleMonths('monthly') * 30 * 24 * 60 * 60 * 1000,
  });
  // Track how many referrals earned this reward so the UI can show progress.
  await setReferralReward(referrerUserId, count, nowIso());
}
