import assert from 'node:assert';

// Requires a running Postgres. Point DATABASE_URL at a scratch database:
//   $env:DATABASE_URL='postgres://postgres:postgres@localhost:5432/su8l_test'; npx tsx scripts/verify-slot-increment.test.ts
const { initDb, insertExtraSlot, getExtraSlotCount, getEffectiveSlots } = await import('../src/db.js');

await initDb();

const USER = 'test-user-1';

// Clean slate for this user
const { pool } = await import('../src/db.js');
await pool.query('DELETE FROM extra_slots WHERE user_id = $1', [USER]);

const before = await getExtraSlotCount(USER);
assert.strictEqual(before, 0, 'baseline must be 0');

await insertExtraSlot(USER, 'order-1', 15);
assert.strictEqual(await getExtraSlotCount(USER), 1, '1 purchase => +1 slot');

await insertExtraSlot(USER, 'order-1', 15);
assert.strictEqual(await getExtraSlotCount(USER), 1, 'duplicate fulfillment of same order must NOT add another slot');

await insertExtraSlot(USER, 'order-2', 15);
assert.strictEqual(await getExtraSlotCount(USER), 2, '2 distinct purchases => exactly +2 slots');

const slots = await getEffectiveSlots(USER);
assert.strictEqual(slots.extra, 2, 'getEffectiveSlots.extra must match count');

console.log('PASS: extra-slot increment is exactly +1 per purchase (idempotent per order)');
console.log('getEffectiveSlots:', JSON.stringify(slots));

await pool.query('DELETE FROM extra_slots WHERE user_id = $1', [USER]);
await pool.end();
