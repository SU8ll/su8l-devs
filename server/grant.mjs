import { getPlan } from './dist/plans.js';
import { withTransaction, activateSubscription, getSubscriptions, getEffectiveSlots } from './dist/db.js';

const userId = 'usr_7621ba1c783e4d939ea0';
const plan = getPlan('elite');

const sub = withTransaction(() =>
  activateSubscription({ userId, plan: plan, cycle: 'yearly', amount: plan.yearly })
);

console.log('Granted:', JSON.stringify(sub));
console.log('Effective slots:', JSON.stringify(getEffectiveSlots(userId)));
