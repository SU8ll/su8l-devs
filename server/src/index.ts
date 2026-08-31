import app from './app.js';
import { config } from './config.js';
import { initDb } from './db.js';
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

  const server = app.listen(config.port, () => {
    console.log(`[SU8L API] listening on :${config.port} (${config.paypal.mode} mode)`);
  });

  // Real-time global chat on the same HTTP server (WebSocket upgrade path /ws).
  attachChatSocket(server);
}

void main();
