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
      await activateSubscription({
        userId: fresh.user_id,
        plan: plan as Parameters<typeof activateSubscription>[0]['plan'],
        cycle: fresh.cycle,
        amount: fresh.amount,
      });
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
