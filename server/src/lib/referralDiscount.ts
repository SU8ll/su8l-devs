import {
  countReferrals,
  getOrCreateReferralCode,
  getReferralCodeOwner,
  getUser,
  getUserReferralRef,
} from '../db.js';
import { getPlan } from '../plans.js';

export const REFERRAL_DISCOUNT = 8;

export interface ReferralDiscountResult {
  apply: boolean;
  own: boolean;
  discount: number;
  /** The referral code that produces the discount (null when none applies). */
  code: string | null;
  /** Display name of the person behind the code (friend/you). */
  referrerName: string | null;
}

/**
 * SINGLE source of truth for the Elite referral discount. Used by BOTH the
 * checkout UI (GET /api/referral/checkout) and order creation
 * (POST /api/checkout/create) so the shown price always equals the charged one.
 *
 * Rules
 *   - Elite (highest tier) only — never products, extra slots or Starter.
 *   - Friend ref from the current URL (?ref=CODE) wins, else the code bound to
 *     the ACCOUNT at signup → invitee gets 8% and the referrer gets credit.
 *   - No friend ref: the referrer/link-owner perk applies automatically once
 *     they have at least ONE real referral (someone who paid Elite from their
 *     link). A brand-new account with no real referral gets NOTHING.
 *   - Never trusts browser cookies/localStorage (stale codes leak between
 *     accounts on the same browser).
 */
export async function computeReferralDiscount(opts: {
  userId: string;
  refCode?: string | null;
  planKey: string;
}): Promise<ReferralDiscountResult> {
  const plan = getPlan(opts.planKey);
  if (!plan?.isHighestTier) {
    return { apply: false, own: false, discount: 0, code: null, referrerName: null };
  }

  let code = opts.refCode?.trim() ? opts.refCode.trim().toUpperCase() : null;
  if (!code) code = await getUserReferralRef(opts.userId);

  // No friend ref anywhere: the link-owner perk needs a real referral first.
  if (!code) {
    const ownCount = await countReferrals(opts.userId);
    if (ownCount >= 1) {
      const ownCode = await getOrCreateReferralCode(opts.userId);
      if (ownCode?.code) code = ownCode.code;
    }
  }
  if (!code) return { apply: false, own: false, discount: 0, code: null, referrerName: null };

  const owner = await getReferralCodeOwner(code);
  if (!owner) return { apply: false, own: false, discount: 0, code: null, referrerName: null };

  const own = owner.user_id === opts.userId;
  if (own) {
    // Own code on a fresh account with no real referral → no discount.
    const count = await countReferrals(opts.userId);
    if (count < 1) return { apply: false, own: false, discount: 0, code: null, referrerName: null };
    const me = await getUser(opts.userId);
    return { apply: true, own: true, discount: REFERRAL_DISCOUNT, code, referrerName: me?.username ?? 'You' };
  }

  const friendName = await getUser(owner.user_id);
  return { apply: true, own: false, discount: REFERRAL_DISCOUNT, code, referrerName: friendName?.username ?? 'Friend' };
}