import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID, scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import axios from 'axios';
import { config } from '../config.js';
import { clearSessionCookie, setSessionCookie, signSession, requireAuth, type AuthedRequest } from '../lib/auth.js';
import { upsertOAuthUser } from '../services/auth.js';
import { resolveAvatarUrl } from '../services/avatars.js';
import {
  get,
  getEffectiveSlots,
  getSubscriptions,
  getExtraSlotCount,
  findUserByEmail,
  findUserByUsername,
  findUserByEmailOrUsername,
  nowIso,
  run,
} from '../db.js';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return derived.toString('hex') === hash;
}

const router = Router();

const STATE_TTL = '10m';

function makeState(provider: string): string {
  return jwt.sign({ n: randomUUID(), p: provider }, config.jwtSecret, { expiresIn: STATE_TTL });
}

function verifyState(state: string, provider: string): boolean {
  try {
    const payload = jwt.verify(state, config.jwtSecret) as { p?: string };
    return payload.p === provider;
  } catch {
    return false;
  }
}

function redirectUri(provider: string): string {
  return `${config.apiUrl}/api/auth/${provider}/callback`;
}

// ── Discord ──────────────────────────────────────────────────────────────────

router.get('/discord', (_req, res) => {
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    response_type: 'code',
    redirect_uri: redirectUri('discord'),
    scope: 'identify email',
    state: makeState('discord'),
  });
  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

router.get('/discord/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code || !state || !verifyState(String(state), 'discord')) {
    return res.redirect(`${config.appUrl}/login?error=oauth_denied`);
  }
  try {
    const tokenRes = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: config.discord.clientId,
        client_secret: config.discord.clientSecret,
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri('discord'),
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const accessToken = tokenRes.data.access_token as string;
    const me = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const d = me.data as {
      id: string;
      username: string;
      global_name?: string;
      email?: string;
      avatar?: string;
      locale?: string;
    };
    const user = await upsertOAuthUser({
      provider: 'discord',
      providerId: d.id,
      email: d.email ?? null,
      username: d.global_name || d.username || d.id,
      accessToken,
      locale: d.locale,
    });
    const token = signSession(user.id);
    setSessionCookie(res, token);
    return res.redirect(`${config.appUrl}/auth/callback#token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[auth:discord]', err);
    return res.redirect(`${config.appUrl}/login?error=oauth_failed`);
  }
});

// ── Google (fallback) ────────────────────────────────────────────────────────

router.get('/google', (_req, res) => {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: redirectUri('google'),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    state: makeState('google'),
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code || !state || !verifyState(String(state), 'google')) {
    return res.redirect(`${config.appUrl}/login?error=oauth_denied`);
  }
  try {
    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        code: String(code),
        grant_type: 'authorization_code',
        redirect_uri: redirectUri('google'),
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const accessToken = tokenRes.data.access_token as string;
    const me = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const g = me.data as { id: string; name?: string; email?: string; picture?: string };
    const user = await upsertOAuthUser({
      provider: 'google',
      providerId: g.id,
      email: g.email ?? null,
      username: g.name || g.email?.split('@')[0] || g.id,
      accessToken,
    });
    const token = signSession(user.id);
    setSessionCookie(res, token);
    return res.redirect(`${config.appUrl}/auth/callback#token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[auth:google]', err);
    return res.redirect(`${config.appUrl}/login?error=oauth_failed`);
  }
});

// ── Facebook (fallback) ──────────────────────────────────────────────────────

router.get('/facebook', (_req, res) => {
  const params = new URLSearchParams({
    client_id: config.facebook.clientId,
    redirect_uri: redirectUri('facebook'),
    state: makeState('facebook'),
    scope: 'email,public_profile',
  });
  res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`);
});

router.get('/facebook/callback', async (req, res) => {
  const { code, state, error } = req.query;
  if (error || !code || !state || !verifyState(String(state), 'facebook')) {
    return res.redirect(`${config.appUrl}/login?error=oauth_denied`);
  }
  try {
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: config.facebook.clientId,
        client_secret: config.facebook.clientSecret,
        code: String(code),
        redirect_uri: redirectUri('facebook'),
      },
    });
    const accessToken = tokenRes.data.access_token as string;
    const me = await axios.get('https://graph.facebook.com/v19.0/me', {
      params: { fields: 'id,name,email,picture.type(large)' },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const f = me.data as { id: string; name?: string; email?: string; picture?: { data?: { url?: string } } };
    const user = await upsertOAuthUser({
      provider: 'facebook',
      providerId: f.id,
      email: f.email ?? null,
      username: f.name || f.email?.split('@')[0] || f.id,
      accessToken,
    });
    const token = signSession(user.id);
    setSessionCookie(res, token);
    return res.redirect(`${config.appUrl}/auth/callback#token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[auth:facebook]', err);
    return res.redirect(`${config.appUrl}/login?error=oauth_failed`);
  }
});

// ── Email / Username + Password Auth ────────────────────────────────────────

router.post('/test-ping', async (_req, res) => {
  try {
    const hash = await hashPassword('test123');
    const ok = await verifyPassword('test123', hash);
    const user = await findUserByEmail('test@test.com');
    res.json({ ok: true, method: 'email-password-auth', hashWorks: ok, dbQuery: user !== undefined });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body as Record<string, unknown>;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'email, username and password are required' });
    }

    const passwordHash = await hashPassword(String(password));
    const userId = `usr_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const ts = nowIso();

    await run(
      'INSERT INTO users (id, email, username, password_hash, avatar, locale, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
      userId,
      String(email).toLowerCase().trim(),
      String(username).trim(),
      passwordHash,
      null,
      'en',
      ts,
      ts
    );

    const token = signSession(userId);
    setSessionCookie(res, token);
    return res.json({ ok: true, token, userId });
  } catch (err) {
    console.error('[auth:register]', err);
    return res.status(500).json({ error: 'internal server error', detail: String(err) });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body as {
      identifier?: string;
      password?: string;
    };

    if (!identifier || !password) {
      return res.status(400).json({ error: 'identifier and password are required' });
    }

    const user = await findUserByEmailOrUsername(identifier);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch password_hash separately (not in User type)
    const row = await get<{ password_hash: string | null }>(
      'SELECT password_hash FROM users WHERE id = ?',
      user.id
    );
    if (!row?.password_hash) {
      return res.status(401).json({ error: 'This account uses social login only' });
    }

    const valid = await verifyPassword(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signSession(user.id);
    setSessionCookie(res, token);
    return res.json({ ok: true, token });
  } catch (err) {
    console.error('[auth:login]', err);
    return res.status(500).json({ error: 'internal server error', detail: String(err) });
  }
});

// ── Admin: create a user with email/password ──────────────────────────────

router.post('/create-user', async (req, res) => {
  try {
    // Only allow if ADMIN_API_KEY is set and matches
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ') || authHeader.slice(7) !== config.adminKey) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { email, username, password } = req.body as {
      email?: string;
      username?: string;
      password?: string;
    };

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'email, username and password are required' });
    }

    const existingEmail = await findUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const ts = nowIso();

    await run(
      'INSERT INTO users (id, email, username, password_hash, avatar, locale, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
      userId,
      email.toLowerCase().trim(),
      username.trim(),
      passwordHash,
      null,
      'en',
      ts,
      ts
    );

    return res.json({ ok: true, userId, email, username });
  } catch (err) {
    console.error('[auth:create-user]', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// ── Dev-only login (disabled in production) ─────────────────────────────────

router.get('/dev-login', async (_req, res) => {
  if (config.isProd) return res.status(404).json({ error: 'not found' });
  const user = await upsertOAuthUser({
    provider: 'dev',
    providerId: 'dev',
    email: 'dev@su8l.test',
    username: 'Test User',
    locale: 'en',
  });
  setSessionCookie(res, signSession(user.id));
  return res.redirect(`${config.appUrl}/dashboard`);
});

// ── Session ──────────────────────────────────────────────────────────────────

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const slots = await getEffectiveSlots(req.user.id);
  res.json({
    id: req.user.id,
    username: req.user.username,
    avatar: resolveAvatarUrl(req.user.avatar),
    email: req.user.email,
    locale: req.user.locale,
    slots,
    subscriptions: (await getSubscriptions(req.user.id)).length,
    extraSlots: await getExtraSlotCount(req.user.id),
  });
});

export default router;
