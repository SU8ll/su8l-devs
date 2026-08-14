import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { rmSync } from 'node:fs';
import jwt from 'jsonwebtoken';

const PORT = 4101;
const BOT_PORT = 4102;
const BASE = `http://localhost:${PORT}`;
const SECRET = 'http-smoke-secret';
const BOT_KEY = 'http-bot-key';
const DB_PATH = './data/test_http.db';

rmSync(DB_PATH, { force: true });

// Mock Discord bot: records every /dispatch payload the API sends so we can
// assert the Cloud Configurator DM and role-grant contracts without a real bot.
const receivedDispatches = [];
const mockBot = createServer(async (req, res) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  receivedDispatches.push({ type: body.type, body, key: req.headers['x-bot-key'] });
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
});
await new Promise((resolve) => mockBot.listen(BOT_PORT, resolve));

const server = spawn(process.execPath, ['server/dist/index.js'], {
  env: {
    ...process.env,
    PORT: String(PORT),
    APP_URL: 'http://localhost:5173',
    API_URL: `http://localhost:${PORT}`,
    JWT_SECRET: SECRET,
    DB_PATH,
    BOT_API_KEY: BOT_KEY,
    BOT_CALLBACK_URL: `http://localhost:${BOT_PORT}`,
    PAYPAL_CLIENT_ID: 'dummy',
    PAYPAL_CLIENT_SECRET: 'dummy',
    PAYPAL_MODE: 'sandbox',
    OWNER_WHATSAPP: '15551234567',
    UPTIME_TARGET_URL: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let serverOut = '';
server.stdout.on('data', (d) => (serverOut += d.toString()));
server.stderr.on('data', (d) => (serverOut += d.toString()));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, cond) => {
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  if (!cond) process.exitCode = 1;
};

async function waitForHealth() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return true;
    } catch {}
    await sleep(250);
  }
  return false;
}

async function req(path, { method = 'GET', body, token, botKey } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Cookie = `su8l_session=${token}`;
  if (botKey) headers['x-bot-key'] = botKey;
  const res = await fetch(`${BASE}${path}`, {
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

try {
  check('server boots', await waitForHealth());

  // public endpoints
  const health = await req('/health');
  check('GET /health 200', health.status === 200);

  const plans = await req('/api/plans');
  const elite = plans.data?.plans?.find((p) => p.isHighestTier);
  const starter = plans.data?.plans?.find((p) => p.key === 'starter');
  check('GET /api/plans exposes exactly two plans', plans.data?.plans?.length === 2);
  check('elite priced at $45/mo', !!elite && elite.monthly === 45 && elite.yearly === 45 * 12);
  check('starter priced at $35/mo', !!starter && starter.monthly === 35 && starter.yearly === 35 * 12);
  check('plans response does not expose extra slot price', plans.data?.extraSlotPrice === undefined);

  // bot promo endpoint guards
  const promoNoKey = await req('/api/bot/promo', { method: 'POST' });
  check('bot promo rejects missing key', promoNoKey.status === 401);
  const promo = await req('/api/bot/promo', { method: 'POST', botKey: BOT_KEY });
  const code = promo.data?.code;
  check('bot promo mints SU8L-…-DEVs', typeof code === 'string' && /^SU8L-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-DEVs$/.test(code));

  // auth guard
  const meAnon = await req('/api/auth/me');
  check('auth /me rejects anonymous', meAnon.status === 401);

  // seed user + session (with a linked Discord account for dispatch identity)
  process.env.DB_PATH = DB_PATH;
  const db = await import('../server/dist/db.js');
  const user = db.createUser({ id: 'usr_http', username: 'HTTP Tester', email: 'http@test.co' });
  db.addAccount({ user_id: user.id, provider: 'discord', provider_id: '100200300400500' });
  const token = jwt.sign({ sub: user.id }, SECRET, { expiresIn: '30d' });
  const me = await req('/api/auth/me', { token });
  check('auth /me with valid session', me.status === 200 && me.data?.username === 'HTTP Tester');

  // checkout guards (fail before touching PayPal)
  const badPromo = await req('/api/checkout/create', {
    method: 'POST',
    token,
    body: { planKey: 'elite', cycle: 'monthly', promoCode: 'SU8L-INVALID-INVALID-INVAL-DEVs' },
  });
  check('checkout rejects invalid promo', badPromo.status === 400);

  const lowTierPromo = await req('/api/checkout/create', {
    method: 'POST',
    token,
    body: { planKey: 'starter', cycle: 'monthly', promoCode: code },
  });
  check('checkout rejects promo on non-elite plan', lowTierPromo.status === 400);

  const extraNoSub = await req('/api/checkout/create', {
    method: 'POST',
    token,
    body: { extraSlot: true },
  });
  check('extra slot blocked without active sub', extraNoSub.status === 403);

  // promo validation endpoint (auth required)
  const valOk = await req('/api/checkout/validate-promo', { method: 'POST', token, body: { promoCode: code } });
  check('validate-promo accepts fresh code', valOk.data?.valid === true && valOk.data?.forcedPrice === 25);

  // create order directly in DB (simulates a PayPal-approved order), then fire the webhook
  const orderId = `SU8L-HTTPTEST01`;
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
    paypal_order_id: 'PAYPAL-HTTP-WEBHOOK-1',
  });

  const webhookPayload = {
    id: 'wh_1',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: { custom_id: orderId, id: 'CAP_HTTP_1', status: 'COMPLETED' },
  };
  const wh = await fetch(`${BASE}/api/webhooks/paypal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  });
  const whBody = await wh.json();
  check('webhook acknowledged', wh.status === 200 && whBody.received === true);

  await sleep(300);

  // order must now be completed and visible via the public success-screen endpoint
  const orderRes = await req(`/api/checkout/orders/${orderId}`);
  check('order completed via webhook', orderRes.status === 200 && orderRes.data?.status === 'completed');
  check('success payload has plan + discord username', orderRes.data?.plan === 'Elite' && orderRes.data?.discordUsername === 'HTTP Tester');
  check('success payload includes owner whatsapp', orderRes.data?.whatsapp === '15551234567');

  // promo consumed + conflict protection for second order
  const valAgain = await req('/api/checkout/validate-promo', { method: 'POST', token, body: { promoCode: code } });
  check('promo invalid after consumption', valAgain.data?.valid === false);

  const dashboard = await req('/api/dashboard', { token });
  check('dashboard shows active elite sub', dashboard.data?.activeSubscriptions === 1);
  check('dashboard effective slots = 6', dashboard.data?.slots?.total === 6);
  check('dashboard extra slot purchasable now', dashboard.data?.canBuyExtraSlot === true);

  // role-grant dispatch must fire from fulfillment (webhook path above)
  await sleep(250);
  const grantDispatch = receivedDispatches.find((d) => d.type === 'grant_role');
  check(
    'role grant dispatched after fulfillment',
    !!grantDispatch &&
      grantDispatch.body?.discordId === '100200300400500' &&
      grantDispatch.body?.plan === 'Elite' &&
      grantDispatch.key === BOT_KEY
  );

  // cloud configurator over HTTP
  const cc = await req('/api/dashboard/cloud-config', { token });
  check(
    'cloud-config GET returns defaults + option lists',
    cc.status === 200 &&
      cc.data?.options?.formations?.length > 0 &&
      cc.data?.options?.boostDurations?.length > 0 &&
      cc.data?.config?.island?.islandName === 'My Island'
  );
  check(
    'cloud-config reports linked discord identity',
    cc.data?.discord?.id === '100200300400500' && cc.data?.discord?.username === 'HTTP Tester'
  );

  const fullConfig = {
    island: { islandName: 'Nebula Prime', instanceEnabled: true },
    gathering: {
      enableGatherResources: true,
      marchSlots: 6,
      tileLevelMin: 4,
      tileLevelMax: 18,
      formation: 'Vanguard',
      strategy: 'Aggressive',
      ironPriority: 75,
      includeAllianceTiles: true,
      gatherWithoutBoostHero: true,
      boost: { activateBeforeGather: true, duration: '4h', gemCost: 250, autoBuy: true },
    },
    connection: { reconnectDelay: 7, reconnectDelayOther: 15 },
  };
  const ccSave = await req('/api/dashboard/cloud-config', { method: 'PUT', token, body: fullConfig });
  check('cloud-config PUT saves', ccSave.status === 200 && ccSave.data?.ok === true);
  check('cloud-config PUT reports discord dispatch', ccSave.data?.dispatched === true);

  const ccBack = await req('/api/dashboard/cloud-config', { token });
  check(
    'cloud-config reads back saved values',
    ccBack.data?.config?.island?.islandName === 'Nebula Prime' &&
      ccBack.data?.config?.gathering?.marchSlots === 6 &&
      ccBack.data?.config?.gathering?.ironPriority === 75 &&
      ccBack.data?.config?.gathering?.boost?.autoBuy === true
  );

  const ccBad = await req('/api/dashboard/cloud-config', {
    method: 'PUT',
    token,
    body: { ...fullConfig, gathering: { ...fullConfig.gathering, tileLevelMin: 25, tileLevelMax: 3 } },
  });
  check('cloud-config PUT rejects min>max', ccBad.status === 400);
  const ccBadEnum = await req('/api/dashboard/cloud-config', {
    method: 'PUT',
    token,
    body: { ...fullConfig, gathering: { ...fullConfig.gathering, formation: 'Zerg' } },
  });
  check('cloud-config PUT rejects bad enum', ccBadEnum.status === 400);

  await sleep(250);
  const dmDispatch = receivedDispatches.find((d) => d.type === 'cloud_config');
  check('bot received cloud_config dispatch', !!dmDispatch);
  check(
    'dispatch includes discord name + id',
    dmDispatch?.body?.discordUsername === 'HTTP Tester' && dmDispatch?.body?.discordId === '100200300400500'
  );
  check(
    'dispatch message is the compiled summary',
    dmDispatch?.body?.message?.includes('Iron priority') &&
      dmDispatch?.body?.message?.includes('75%') &&
      dmDispatch?.body?.message?.includes('HTTP Tester')
  );
  check('dispatch guarded by bot key', dmDispatch?.key === BOT_KEY);

  // tickets over HTTP
  const tk = await req('/api/tickets', {
    method: 'POST',
    token,
    body: { subject: 'HTTP ticket', body: 'testing', priority: 'high' },
  });
  check('ticket created over HTTP', tk.status === 201 && tk.data?.ticket?.id > 0);
  const tkl = await req('/api/tickets', { token });
  check('tickets list over HTTP', tkl.data?.tickets?.length === 1);

  // cloud-config persistence via direct GET
  const cfgFinal = await req('/api/dashboard/cloud-config', { token });
  check('cloud-config persists across requests', cfgFinal.data?.config?.gathering?.marchSlots === 6);
} finally {
  server.kill('SIGKILL');
  mockBot.close();
}

console.log('\n── HTTP SMOKE TEST RESULTS ──');
for (const r of results) console.log(r);
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`);
if (process.exitCode) console.log('\n── SERVER OUTPUT ──\n' + serverOut);
