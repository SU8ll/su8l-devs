import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import checkoutRoutes from './routes/checkout.js';
import webhookRoutes from './routes/webhooks.js';
import dashboardRoutes from './routes/dashboard.js';
import ticketRoutes from './routes/tickets.js';
import statusRoutes from './routes/status.js';
import planRoutes from './routes/plans.js';
import botRoutes from './routes/bot.js';

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = new Set<string>([config.appUrl, ...config.corsOrigins].map((o) => o.replace(/\/$/, '')));

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (PayPal webhooks, curl, uptime probes) send no Origin.
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin.replace(/\/$/, ''))) return callback(null, true);
      return callback(new Error('CORS not allowed for this origin'));
    },
    credentials: true,
  })
);
app.use(cookieParser());

// Webhooks must run BEFORE express.json so the raw JSON body is preserved
// for PayPal signature verification.
app.use('/api/webhooks', webhookRoutes);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'SU8L DEVs API', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/bot', botRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'internal server error' });
});

export default app;
