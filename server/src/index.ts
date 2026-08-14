import app from './app.js';
import { config } from './config.js';
import { startUptimeChecker } from './services/uptime.js';

startUptimeChecker();

app.listen(config.port, () => {
  console.log(`[SU8L API] listening on :${config.port} (${config.paypal.mode} mode)`);
});
