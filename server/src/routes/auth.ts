import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import { config } from '../config.js';
import { clearSessionCookie, setSessionCookie, signSession, requireAuth, type AuthedRequest } from '../lib/auth.js';
import { discordAvatarUrl, upsertOAuthUser } from '../services/auth.js';
import { getEffectiveSlots, getSubscriptions, getExtraSlotCount } from '../db.js';

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
      avatar: discordAvatarUrl(d.id, d.avatar),
      accessToken,
      locale: d.locale,
    });
    setSessionCookie(res, signSession(user.id));
    return res.redirect(`${config.appUrl}/dashboard`);
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
      avatar: g.picture ?? null,
      accessToken,
    });
    setSessionCookie(res, signSession(user.id));
    return res.redirect(`${config.appUrl}/dashboard`);
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
      avatar: f.picture?.data?.url ?? null,
      accessToken,
    });
    setSessionCookie(res, signSession(user.id));
    return res.redirect(`${config.appUrl}/dashboard`);
  } catch (err) {
    console.error('[auth:facebook]', err);
    return res.redirect(`${config.appUrl}/login?error=oauth_failed`);
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
    avatar: null,
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
    avatar: req.user.avatar,
    email: req.user.email,
    locale: req.user.locale,
    slots,
    subscriptions: (await getSubscriptions(req.user.id)).length,
    extraSlots: await getExtraSlotCount(req.user.id),
  });
});

export default router;
