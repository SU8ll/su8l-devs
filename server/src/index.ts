import app from './app.js';
import { config } from './config.js';
import { initDb, pruneOldChatMessages } from './db.js';
import { startUptimeChecker } from './services/uptime.js';
import { attachChatSocket } from './services/chatHub.js';

async function main(): Promise<void> {
  try {
    await initDb();
  } catch (err) {
    console.error('[SU8L API] failed to connect to Postgres — check DATABASE_URL');
    console.error(err);
    process.exit(1);
  }

  startUptimeChecker();

  // Auto-prune chat every 6 hours to keep mobile light (as requested).
  const CHAT_PRUNE_MS = 6 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      const n = await pruneOldChatMessages();
      if (n > 0) console.log(`[chat] pruned ${n} messages older than 6h`);
    } catch (e) {
      console.error('[chat] prune failed', e);
    }
  }, CHAT_PRUNE_MS);
  setTimeout(async () => { try { await pruneOldChatMessages(); } catch {} }, 60_000);

  const server = app.listen(config.port, () => {
    console.log(`[SU8L API] listening on :${config.port} (${config.paypal.mode} mode)`);
  });

  // Real-time global chat on the same HTTP server (WebSocket upgrade path /ws).
  attachChatSocket(server);
}

void main();
