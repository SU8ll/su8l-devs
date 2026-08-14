import { all, get } from './dist/db.js';
const users = all('SELECT id, email, username, locale, created_at FROM users ORDER BY created_at DESC');
console.log('USERS:');
for (const u of users) {
  const subs = all('SELECT plan_key, plan_name, cycle, amount, status, current_period_end, created_at FROM subscriptions WHERE user_id = ?', u.id);
  const extras = get('SELECT COUNT(*) AS n FROM extra_slots WHERE user_id = ?', u.id);
  const accs = all('SELECT provider, provider_id FROM accounts WHERE user_id = ?', u.id);
  console.log(JSON.stringify({ ...u, accounts: accs, subs, extraSlots: extras?.n ?? 0 }));
}
