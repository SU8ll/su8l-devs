import {
  activateSubscription,
  getOrder,
  getPromoByCode,
  insertExtraSlot,
  markOrderCompleted,
  markOrderPromoConflict,
  markPromoUsed,
  withTransaction,
} from '../db.js';
import { dispatchToBot, getDiscordIdentity } from './dispatch.js';

/**
 * Single idempotent fulfillment entry point. Called from BOTH the PayPal
 * webhook handler and the /checkout/capture route.
 *
 * Promo-code consumption and subscription/extra-slot activation happen inside
 * ONE `BEGIN IMMEDIATE` transaction. SQLite's single-writer lock serializes
 * concurrent transactions, so a promo code can never be consumed twice even
 * if two captures race.
 */
export function fulfillOrder(orderId: string, captureId: string | null): boolean {
  const order = getOrder(orderId);
  if (!order) return false;
  if (order.status === 'completed') return true;

  const completed = withTransaction(() => {
    const fresh = getOrder(orderId);
    if (!fresh || fresh.status === 'completed') return true;

    if (fresh.promo_code) {
      const promo = getPromoByCode(fresh.promo_code);
      if (promo && promo.status === 'unused') {
        markPromoUsed(fresh.promo_code, fresh.user_id);
      } else {
        markOrderPromoConflict(fresh.id);
      }
    }

    if (fresh.extra_slot) {
      insertExtraSlot(fresh.user_id, fresh.id, fresh.amount);
    } else if (fresh.plan_key && fresh.cycle) {
      const plan = { key: fresh.plan_key, name: fresh.plan_name ?? fresh.plan_key };
      activateSubscription({
        userId: fresh.user_id,
        plan: plan as Parameters<typeof activateSubscription>[0]['plan'],
        cycle: fresh.cycle,
        amount: fresh.amount,
      });
    }

    markOrderCompleted(fresh.id, captureId);
    return true;
  });

  if (completed) {
    // Best-effort Discord role grant for the paying customer. Fire-and-forget:
    // fulfillment must never fail because the bot is momentarily unreachable.
    const identity = getDiscordIdentity(order.user_id);
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

export function promoConflictDetected(orderId: string): boolean {
  const order = getOrder(orderId);
  if (!order || !order.promo_code) return false;
  // After fulfillment the promo row is 'used'; conflict means it was ALREADY
  // used by someone else (or by this user) before this order consumed it.
  return order.promo_conflict === 1;
}
