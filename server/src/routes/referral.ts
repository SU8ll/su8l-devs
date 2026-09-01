import { Router } from 'express';
import { config } from '../config.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import {
  countReferrals,
  getOrCreateReferralCode,
  getReferralCodeOwner,
  getReferralRewardRow,
  getReferrerDiscountLog,
  getUser,
  listReferrals,
} from '../db.js';
import { getHighestTier } from '../plans.js';
import { resolveAvatarUrl } from '../services/avatars.js';
import { grantFreeEliteMonth } from '../services/orders.js';

const router = Router();

export const REFERRAL_DISCOUNT = 8;
export const REFERRAL_GOAL_DEFAULT = 5;
export const REFERRAL_GOAL_DISCOUNTED = 7;

/** @returns the app base URL used to build the shareable friend link. */
export function referralSignupUrl(code: string): string {
  return `${config.appUrl}${config.appUrl.endsWith('/') ? '' : '/'}register?ref=${encodeURIComponent(code)}`;
}

/**
 * The free-months goal is dynamic:
 *  - If the referrer uses their own 8% discount BEFORE reaching the original
 *    5-referral goal, the goal is raised from 5 to 7.
 *  - If they reached 5/5 before ever using the discount, the goal stays 5.
 */
export function resolveFreeMonthGoal(
  referralCount: number,
  discountLog?: { referral_count: number } | undefined
): number {
  // Discount was used BEFORE the user completed 5 real referrals → goal becomes 7.
  if (discountLog && discountLog.referral_count < REFERRAL_GOAL_DEFAULT) {
    return REFERRAL_GOAL_DISCOUNTED;
  }
  return REFERRAL_GOAL_DEFAULT;
}

// GET /api/referral — my code, signups count, reward status, invitee list
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const code = (await getOrCreateReferralCode(req.user.id)).code;
  const referrals = await listReferrals(req.user.id);
  const reward = await getReferralRewardRow(req.user.id);
  const discountLog = await getReferrerDiscountLog(req.user.id);
  const elite = getHighestTier();

  const invitees = await Promise.all(
    referrals.map(async (r) => {
      const u = await getUser(r.invitee_user_id);
      return {
        username: u?.username ?? 'unknown',
        avatar: u ? resolveAvatarUrl(u.avatar) : null,
        joinedAt: r.created_at,
      };
    })
  );

  const count = referrals.length;
  const goal = resolveFreeMonthGoal(count, discountLog);
  const eligible = count >= goal;
  const claimed = reward?.awarded != null;

  res.json({
    code,
    shareUrl: referralSignupUrl(code),
    discount: REFERRAL_DISCOUNT,
    freeMonthThreshold: goal,
    freePlanName: elite.name,
    count,
    // A referral only "counts" toward the free month once the invitee buys Elite,
    // so the remaining count is goal - count (not relative to registered signups).
    referralsRemaining: Math.max(0, goal - count),
    goal,
    eligible,
    claimed,
    canClaim: eligible && !claimed,
    reward: reward
      ? { referralsEarned: reward.referrals_earned, awarded: reward.awarded }
      : { referralsEarned: 0, awarded: null },
    invitees,
  });
});

// POST /api/referral/claim — the referrer taps "Claim my free month" once they
// reach the dynamic goal (5, or 7 if they used their discount early). Grants a
// free month of the highest tier and marks the reward so it can't be claimed again.
router.post('/claim', requireAuth, async (req: AuthedRequest, res) => {
  const count = await countReferrals(req.user.id);
  const discountLog = await getReferrerDiscountLog(req.user.id);
  const goal = resolveFreeMonthGoal(count, discountLog);
  if (count < goal) {
    return res.status(400).json({ error: 'not_enough_referrals', goal });
  }
  const existing = await getReferralRewardRow(req.user.id);
  if (existing?.awarded) {
    return res.status(409).json({ error: 'already_claimed' });
  }

  await grantFreeEliteMonth(req.user.id, count);

  return res.json({ ok: true, freePlanName: getHighestTier().name });
});

// GET /api/referral/validate?ref=CODE — lightweight public check that a code is
// real, so the checkout UI can truthfully show the 8% discount before paying.
router.get('/validate', async (req, res) => {
  const code = String(req.query.ref ?? '').trim().toUpperCase();
  if (!code) return res.json({ valid: false });
  const owner = await getReferralCodeOwner(code);
  res.json({ valid: !!owner, discount: REFERRAL_DISCOUNT });
});

export default router;
