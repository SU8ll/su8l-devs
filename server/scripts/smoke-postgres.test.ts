import assert from 'node:assert';

const { initDb, pool, createUser, addAccount, insertOrder, getEffectiveSlots,
  getSubscriptions, createTicket, addTicketMessage, getTicket, ensureBotSlots,
  recordUptime, uptimeSince, getPromoByCode, insertPromoCode } = await import('../src/db.js');
const { fulfillOrder } = await import('../src/services/orders.js');

await initDb();

const UID = 'smoke-user-1';
await pool.query("DELETE FROM promo_codes WHERE created_by = 'test'");
await pool.query(`DELETE FROM uptime_checks WHERE checked_at >= (now() - interval '30 minutes')::text`);
await pool.query('DELETE FROM extra_slots WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM bot_slots WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM subscriptions WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM orders WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM ticket_messages WHERE ticket_id IN (SELECT id FROM tickets WHERE user_id = $1)', [UID]);
await pool.query('DELETE FROM tickets WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM accounts WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM users WHERE id = $1', [UID]);

const u = await createUser({ id: UID, username: 'Smoke Tester', email: 'smoke@su8l.test', locale: 'en' });
assert.strictEqual(u.id, UID);
await addAccount({ user_id: UID, provider: 'discord', provider_id: '111111111111', access_token: 'tok', refresh_token: null, expires_at: null });

// Plan order -> fulfillment activates the Elite subscription (6 base slots)
await insertOrder({ id: 'SU8L-SMOKE1', user_id: UID, plan_key: 'elite', plan_name: 'Elite', cycle: 'monthly', amount: 22, currency: 'USD', promo_code: null, extra_slot: 0, paypal_order_id: 'PP-1' });
const done = await fulfillOrder('SU8L-SMOKE1', 'cap-1');
assert.strictEqual(done, true);
const subs = await getSubscriptions(UID);
assert.strictEqual(subs.length, 1);
assert.strictEqual(subs[0]!.status, 'active');

let slots = await getEffectiveSlots(UID);
assert.strictEqual(slots.base, 6, 'elite base slots');
assert.strictEqual(slots.active, true);

// Extra-slot purchase -> +1
await insertOrder({ id: 'SU8L-SMOKE2', user_id: UID, plan_key: null, plan_name: null, cycle: null, amount: 15, currency: 'USD', promo_code: null, extra_slot: 1, paypal_order_id: 'PP-2' });
await fulfillOrder('SU8L-SMOKE2', 'cap-2');
slots = await getEffectiveSlots(UID);
assert.strictEqual(slots.extra, 1, 'one extra slot');
assert.strictEqual(slots.total, 7, '6 base + 1 extra');

// Promo code path
await insertPromoCode('SU8L-AAAA-BBBB-CCCC-DEVs', 'test');
const promo = await getPromoByCode('SU8L-aaaa-bbbb-cccc-devs');
assert.ok(promo, 'case-insensitive promo lookup');
assert.strictEqual(promo!.status, 'unused');

// Tickets
const t = await createTicket({ userId: UID, subject: 'Need help', body: 'Hi', priority: 'high' });
assert.ok(t.id > 0);
const msg = await addTicketMessage(t.id, 'user', 'more details');
assert.strictEqual(msg.author, 'user');
const stored = await getTicket(t.id);
assert.ok(stored);

// Bot slots
const b = await ensureBotSlots(UID, 7);
assert.strictEqual(b.length, 7, '7 slots materialized');

// Uptime
await recordUptime(true, 42);
await recordUptime(false, null);
const since = await uptimeSince(60_000);
assert.strictEqual(since.checks, 2);
assert.strictEqual(since.ok, 1);

console.log('PASS: full async Postgres layer smoke test (users, subs, orders, promo, tickets, slots, uptime)');

// Cleanup
await pool.query('DELETE FROM extra_slots WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM bot_slots WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM subscriptions WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM orders WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM ticket_messages WHERE ticket_id IN (SELECT id FROM tickets WHERE user_id = $1)', [UID]);
await pool.query('DELETE FROM tickets WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM accounts WHERE user_id = $1', [UID]);
await pool.query('DELETE FROM users WHERE id = $1', [UID]);
await pool.query(`DELETE FROM uptime_checks WHERE checked_at >= (now() - interval '5 minutes')::text`);
await pool.query('DELETE FROM promo_codes WHERE created_by = $1', ['test']);
await pool.end();
