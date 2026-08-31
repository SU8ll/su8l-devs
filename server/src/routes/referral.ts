import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import {
  countReferrals,
  getOrCreateReferralCode,
  getReferralReward,
  listReferrals,
  getUser,
} from '../db.js';
import { getHighestTier } from '../plans.js';
import { resolveAvatarUrl } from '../services/avatars.js';

const router = Router();

export const REFERRAL_DISCOUNT = 8;

/** @returns the app base URL used to build the shareable friend link. */
export function referralSignupUrl(code: string): string {
  return `${config.appUrl}${config.appUrl.endsWith('/') ? '' : '/'}register?ref=${encodeURIComponent(code)}`;
}

// GET /api/referral — my code, signups count, reward status, invitee list
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const code = (await getOrCreateReferralCode(req.user.id)).code;
  const referrals = await listReferrals(req.user.id);
  const reward = await getReferralReward(req.user.id);
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

  res.json({
    code,
    shareUrl: referralSignupUrl(code),
    discount: REFERRAL_DISCOUNT,
    freeMonthThreshold: 3,
    freePlanName: elite.name,
    count: referrals.length,
    referralsRemaining: Math.max(0, 3 - referrals.length),
    reward: reward
      ? { referralsEarned: reward.referrals_earned, awarded: reward.awarded }
      : { referralsEarned: 0, awarded: null },
    invitees,
  });
});

export default router;
