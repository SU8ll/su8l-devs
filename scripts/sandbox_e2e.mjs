#!/usr/bin/env node
/**
 * Real PayPal Sandbox end-to-end test — RUNBOOK-DRIVEN.
 *
 * Prereqs (see docs/paypal-sandbox-e2e.md):
 *   1. Real sandbox Client ID/Secret in server/.env
 *   2. The API server running (npm run start -w @su8l/server)
 *   3. The web app reachable at APP_URL (localhost is fine)
 *   4. A PayPal sandbox PERSONAL (buyer) account you can log into
 *
 * Flow: mints a promo via the bot endpoint -> creates a real PayPal order for
 * the Elite plan with that promo -> prints the approval URL -> you approve it
 * in a browser with the sandbox buyer -> this script polls until the webhook /
 * server-side capture fulfills the order, then verifies the full chain.
 *
 * Usage: node scripts/sandbox_e2e.mjs
 */
import { existsSync, readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';

const envFile = './server/.env';
function loadEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

const env = { ...loadEnv(envFile), ...process.env };
const API = (env.API_URL || 'http://localhost:4000').replace(/\/$/, '');
const DB_PATH = env.DB_PATH || './data/su8l.db';
const JWT_SECRET = env.JWT_SECRET || '';

if (!JWT_SECRET || JWT_SECRET.includes('change-me')) {
  console.error('✖ Set a real JWT_SECRET in server/.env before running the sandbox test.');
  process.exit(1);
}
if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
  console.error('✖ PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are missing in server/.env.');
  process.exit(1);
}

const results = [];
const check = (name, cond, extra = '') => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`);
  if (!cond) process.exitCode = 1;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiReq(path, { method = 'GET', body, token, botKey } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Cookie = `su8l_session=${token}`;
  if (botKey) headers['x-bot-key'] = botKey;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

// 1) sanity: is the server up?
let health;
try {
  health = await apiReq('/health');
} catch {
  console.error('✖ Cannot reach the API. Start it with: npm run start -w @su8l/server');
  process.exit(1);
}
check('API reachable', health.status === 200);

// 2) seed a fresh sandbox test user + session
process.env.DB_PATH = DB_PATH;
const db = await import('../server/dist/db.js');
const USER_ID = 'usr_sandbox_e2e';
db.run(`DELETE FROM users WHERE id = ?`, USER_ID);
const user = db.createUser({
  id: USER_ID,
  email: 'sandbox-e2e@test.co',
  username: 'Sandbox Tester',
  avatar: null,
});
const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '30m' });

// 3) mint a promo through the real bot endpoint (guarded by BOT_API_KEY)
const promoRes = await apiReq('/api/bot/promo', { method: 'POST', botKey: env.BOT_API_KEY });
const code = promoRes.data?.code;
check('promo minted via /api/bot/promo', promoRes.status === 201 && /^SU8L-[A-Z0-9-]{12,}-DEVs$/.test(code ?? ''), `(${code ?? 'none'})`);

// 4) create a REAL PayPal order for Elite with the promo (expects $25)
const create = await apiReq('/api/checkout/create', {
  method: 'POST',
  token,
  body: { planKey: 'elite', cycle: 'monthly', promoCode: code },
});
check(
  'PayPal sandbox order created (Elite + promo)',
  create.status === 200 && !!create.data?.paypalOrderId && !!create.data?.approvalUrl,
  `(${create.status})`
);
if (create.status !== 200) {
  console.error('  detail:', JSON.stringify(create.data));
}
check('promo forced price to $25', create.data?.amount === 25);

const { orderId, paypalOrderId, approvalUrl } = create.data ?? {};

if (orderId && approvalUrl) {
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('  👉 OPEN THIS URL IN YOUR BROWSER:');
  console.log(`  ${approvalUrl}`);
  console.log('────────────────────────────────────────────────────────────');
  console.log('  Sign in with your SANDBOX PERSONAL (buyer) account.');
  console.log('  Approve the payment. You will be redirected back to the app');
  console.log('  (server-side capture) and/or the webhook fulfills the order.');
  console.log('  This script polls for up to 6 minutes…\n');

  let done = false;
  let order = null;
  for (let i = 0; i < 144 && !done; i++) {
    await sleep(2500);
    const res = await apiReq(`/api/checkout/orders/${orderId}`);
    if (res.status === 200) {
      order = res.data;
      if (order.status === 'completed') done = true;
    }
  }

  check('order reached completed status', done && order?.status === 'completed');
  check('success payload shows Elite + $25', order?.plan === 'Elite' && order?.amount === 25);
  check('success payload carries buyer Discord identity', order?.discordUsername === 'Sandbox Tester');
  check('success payload includes owner WhatsApp', typeof order?.whatsapp === 'string');
}

// 5) verify fulfillment side effects: subscription active + promo consumed
const dash = await apiReq('/api/dashboard', { token });
check('dashboard shows active Elite subscription', dash.data?.activeSubscriptions === 1);
check('effective slots = 6', dash.data?.slots?.total === 6);
check('extra slot is purchasable now', dash.data?.canBuyExtraSlot === true);

const stats = await apiReq('/api/bot/promo/stats', { botKey: env.BOT_API_KEY });
const promoUsed = db.getPromoByCode(code);
check('promo consumed after capture', stats.data?.used >= 1 && promoUsed?.status === 'used');

// 6) bonus: a second order with the same code must be rejected at checkout
const reuse = await apiReq('/api/checkout/create', {
  method: 'POST',
  token,
  body: { planKey: 'elite', cycle: 'monthly', promoCode: code },
});
check('reusing consumed promo is rejected', reuse.status === 400);

// cleanup test user so a re-run is clean
db.run(`DELETE FROM accounts WHERE user_id = ?`, USER_ID);
db.run(`DELETE FROM subscriptions WHERE user_id = ?`, USER_ID);
db.run(`DELETE FROM orders WHERE user_id = ?`, USER_ID);
db.run(`DELETE FROM users WHERE id = ?`, USER_ID);

console.log('\n── SANDBOX E2E RESULTS ──');
for (const r of results) console.log(r);
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
if (process.exitCode) {
  console.log('\nTroubleshooting: check the server log, the sandbox webhook, and PayPal app scopes.');
}
