import { mkdirSync, rmSync } from 'node:fs';

process.env.DB_PATH = './data/test_smoke.db';
process.env.JWT_SECRET = 'smoke-test-secret';
process.env.BOT_API_KEY = 'smoke-bot-key';
process.env.OWNER_WHATSAPP = '15551234567';

rmSync('./data/test_smoke.db', { force: true });
mkdirSync('./data', { recursive: true });

const db = await import('../server/dist/db.js');
const { fulfillOrder } = await import('../server/dist/services/orders.js');
const { generatePromoCode, generateOrderId } = await import('../server/dist/lib/ids.js');

const results = [];
const check = (name, cond) => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) process.exitCode = 1;
};

// seed a user
const user = db.createUser({ id: 'usr_test', username: 'Tester', email: 't@t.co' });
check('user created', !!user);

// 1) promo lifecycle: generate -> unused -> used via fulfillOrder
const code = generatePromoCode();
db.insertPromoCode(code, 'bot');
check('promo format SU8L-XXXX-XXXX-XXXX-DEVs', /^SU8L-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-DEVs$/.test(code));
check('promo starts unused', db.getPromoByCode(code)?.status === 'unused');

// 2) order with promo, fulfill -> promo consumed + subscription active (single txn)
const orderId = generateOrderId();
db.insertOrder({
  id: orderId,
  user_id: user.id,
  plan_key: 'elite',
  plan_name: 'Elite',
  cycle: 'monthly',
  amount: 25,
  currency: 'USD',
  promo_code: code,
  extra_slot: 0,
  paypal_order_id: `PAYPAL-${orderId}`,
});

const ok = fulfillOrder(orderId, 'CAP_1');
check('fulfill returns true', ok === true);
const orderAfter = db.getOrder(orderId);
check('order completed', orderAfter?.status === 'completed');
check('promo mutated to used', db.getPromoByCode(code)?.status === 'used');
const subs = db.getSubscriptions(user.id);
check('subscription activated', subs.some((s) => s.plan_key === 'elite' && s.status === 'active'));
check('effective slots = 6', db.getEffectiveSlots(user.id).total === 6);

// 3) idempotency: replay fulfill (webhook + capture race) must NOT double activate
const subsBefore = db.getSubscriptions(user.id).length;
const ok2 = fulfillOrder(orderId, 'CAP_2');
check('replay is idempotent', ok2 === true);
check('no duplicate subscription', db.getSubscriptions(user.id).length === subsBefore);
check('capture id not overwritten by stale replay', db.getOrder(orderId)?.paypal_capture_id === 'CAP_1');

// 4) second order reusing the same promo must hit promo_conflict path
const orderId2 = generateOrderId();
db.insertOrder({
  id: orderId2,
  user_id: user.id,
  plan_key: 'elite',
  plan_name: 'Elite',
  cycle: 'monthly',
  amount: 25,
  currency: 'USD',
  promo_code: code,
  extra_slot: 0,
  paypal_order_id: `PAYPAL-${orderId2}`,
});
fulfillOrder(orderId2, 'CAP_3');
check('reused promo flagged as conflict', db.getOrder(orderId2)?.promo_conflict === 1);
check('promo still single-use', db.getPromoByCode(code)?.status === 'used');

// 5) promo unused check works for validation
const code2 = generatePromoCode();
db.insertPromoCode(code2, 'bot');
check('promoIsUnused true for fresh code', db.promoIsUnused(code2) === true);
check('promoIsUnused false for used code', db.promoIsUnused(code) === false);

// 6) extra slot upsell: requires active base sub (server enforces) + adds +1
db.insertExtraSlot(user.id, orderId, 15);
const slots = db.getEffectiveSlots(user.id);
check('extra slot adds +1 (total 7)', slots.total === 7 && slots.extra === 1);

// 7) extra slot only counts while base sub active
db.run(`UPDATE subscriptions SET status = 'expired' WHERE user_id = ?`, user.id);
const slotsExpired = db.getEffectiveSlots(user.id);
check('no slots when base sub expired', slotsExpired.active === false && slotsExpired.total === 0);

// 8) bot config persistence
db.setBotConfig(user.id, { islandName: 'Nebula', reconnectDelay: 5, reconnectDelayOther: 10 });
const cfg = db.getBotConfig(user.id);
check('bot config persisted', cfg.islandName === 'Nebula' && cfg.reconnectDelay === 5);

// 8b) Cloud Configurator — normalization, validation, DM compilation
const {
  DEFAULT_CLOUD_CONFIG,
  cloudConfigIssues,
  cloudConfigSchema,
  compileCloudConfig,
  normalizeCloudConfig,
} = await import('../server/dist/botConfig.js');

check(
  'cloud config defaults for fresh user',
  JSON.stringify(normalizeCloudConfig({})) === JSON.stringify(DEFAULT_CLOUD_CONFIG)
);

const legacy = normalizeCloudConfig({
  islandName: 'Nebula Prime',
  panelEnabled: false,
  reconnectDelay: 7,
  reconnectDelayOther: 15,
});
check(
  'legacy flat keys migrate to canonical shape',
  legacy.island.islandName === 'Nebula Prime' &&
    legacy.island.instanceEnabled === false &&
    legacy.connection.reconnectDelay === 7 &&
    legacy.connection.reconnectDelayOther === 15
);

const full = {
  island: { islandName: 'Nebula', instanceEnabled: true },
  gathering: {
    enableGatherResources: true,
    marchSlots: 4,
    tileLevelMin: 3,
    tileLevelMax: 12,
    formation: 'Offensive',
    strategy: 'Aggressive',
    ironPriority: 80,
    includeAllianceTiles: true,
    gatherWithoutBoostHero: true,
    boost: { activateBeforeGather: true, duration: '4h', gemCost: 200, autoBuy: true },
  },
  connection: { reconnectDelay: 6, reconnectDelayOther: 12 },
};
check('cloud config schema accepts full config', cloudConfigSchema.safeParse(full).success === true);

const bad = cloudConfigSchema.safeParse({
  ...full,
  gathering: { ...full.gathering, tileLevelMin: 20, tileLevelMax: 5 },
});
check(
  'min>max flagged by cloudConfigIssues',
  bad.success === true && cloudConfigIssues(bad.data).length === 1
);

check(
  'schema rejects unknown formation enum',
  cloudConfigSchema.safeParse({ ...full, gathering: { ...full.gathering, formation: 'NotAFormation' } }).success === false
);
check(
  'schema rejects out-of-range iron priority',
  cloudConfigSchema.safeParse({ ...full, gathering: { ...full.gathering, ironPriority: 150 } }).success === false
);

const compiled = compileCloudConfig(full, { discordUsername: 'Tester', discordId: 'DISC-123' });
check('DM compile includes discord name + id', compiled.includes('Tester') && compiled.includes('DISC-123'));
check(
  'DM compile includes key fields',
  compiled.includes('Iron priority') &&
    compiled.includes('80%') &&
    compiled.includes('4h') &&
    compiled.includes('Auto-buy') &&
    compiled.includes('March slots') &&
    compiled.includes('daily in-game reset')
);

// 9) tickets CRUD
const tk = db.createTicket({ userId: user.id, subject: 'Test', body: 'hello', priority: 'high' });
db.addTicketMessage(tk.id, 'staff', 'we are on it');
check('ticket created + staff reply', db.listTicketMessages(tk.id).length === 2);
db.setTicketStatus(tk.id, 'closed');
check('ticket closed', db.getTicket(tk.id)?.status === 'closed');

// 10) uptime
db.recordUptime(true, 120);
db.recordUptime(true, 130);
db.recordUptime(false, 500);
check('uptime recorded', db.latestUptime()?.ok === 0);
const daily = db.uptimeDaily(30);
check('uptime daily aggregation', daily.length === 30 && daily[daily.length - 1].total === 3);

console.log('\n── SMOKE TEST RESULTS ──');
for (const r of results) console.log(r);
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
