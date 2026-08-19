import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  cookieName: 'su8l_session',
  // Secret key that grants access to the desktop admin panel API (/api/panel).
  adminKey: process.env.ADMIN_API_KEY || '',
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/su8l',
  // Comma-separated list of additional allowed CORS origins (e.g. the Vercel URL).
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  isProd: process.env.NODE_ENV === 'production',

  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID || '',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
  },

  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    mode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
  },

  ownerWhatsApp: process.env.OWNER_WHATSAPP || '',
  ownerDiscordId: process.env.OWNER_DISCORD_ID || '',
  botApiKey: process.env.BOT_API_KEY || '',
  // Base URL of the Discord bot's HTTP callback (used to dispatch DM / role actions)
  botCallbackUrl: process.env.BOT_CALLBACK_URL || '',
  staffDiscordIds: (process.env.STAFF_DISCORD_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  uptimeTarget: process.env.UPTIME_TARGET_URL || '',
  uptimeIntervalMs: Number(process.env.UPTIME_INTERVAL_MS || 60000),
} as const;

export const PAYPAL_BASE =
  config.paypal.mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
