import { Router } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import {
  findUserByUsername,
  getChatMessage,
  getChatPreference,
  getUser,
  hasChatEntitlement,
  insertChatMessage,
  listChatMessages,
  setChatPreference,
  updateUser,
} from '../db.js';
import { resolveAvatarUrl } from '../services/avatars.js';
import { chatActiveCount, emitChatMessage, type ChatMessagePayload } from '../services/chatHub.js';

const router = Router();

const CHAT_LANGS = ['ar', 'en', 'tr', 'fr', 'de', 'zh', 'ko', 'it', 'hi'];

const postSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  language: z.string().trim().max(8),
  replyTo: z.string().trim().max(64).nullable().optional(),
});

const prefsSchema = z.object({
  language: z.string().trim().max(8),
});

const usernameSchema = z.object({
  username: z.string().trim().min(2).max(24),
});

async function resolveAuthor(userId: string): Promise<ChatMessagePayload['user']> {
  const u = await getUser(userId);
  return { id: userId, username: u?.username ?? 'unknown', avatar: u ? resolveAvatarUrl(u.avatar) : null };
}

function toPayload(msg: Awaited<ReturnType<typeof insertChatMessage>>, me?: string): Promise<ChatMessagePayload> {
  return (async () => {
    let replyTo: ChatMessagePayload['replyTo'] = null;
    if (msg.reply_to) {
      const r = await getChatMessage(msg.reply_to);
      if (r) {
        const au = await getUser(r.user_id);
        replyTo = { id: r.id, body: r.body.slice(0, 120), username: au?.username ?? 'unknown' };
      }
    }
    let mentions: string[] = [];
    try {
      mentions = JSON.parse(msg.mentions) as string[];
    } catch {
      mentions = [];
    }
    return {
      id: msg.id,
      user: await resolveAuthor(msg.user_id),
      body: msg.body,
      language: msg.language,
      replyTo,
      mentionNames: mentions,
      createdAt: msg.created_at,
    };
  })();
}

function extractMentions(body: string): { names: string[]; replyTo: string | null } {
  const names: string[] = [];
  const re = /@([\w\d_\-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    const name = m[1];
    if (name && !names.includes(name)) names.push(name);
  }
  return { names, replyTo: null };
}

// Chat is for paying customers only: active subscriber OR completed any order.
async function assertEntitled(req: AuthedRequest, res: { status(code: number): { json(body: unknown): unknown } }) {
  const ok = await hasChatEntitlement(req.user.id);
  if (!ok) {
    res.status(403).json({ error: 'chat requires an active subscription or a purchase' });
    return false;
  }
  return true;
}

// GET /api/chat — recent history + active user count
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  if (!(await assertEntitled(req, res))) return;
  const messages = await listChatMessages(200);
  const payloads: ChatMessagePayload[] = [];
  for (const msg of messages) {
    payloads.push(await toPayload(msg));
  }
  res.json({ messages: payloads, activeUsers: chatActiveCount() });
});

// POST /api/chat — publish a new message (server inserts + broadcasts live)
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
  if (!(await assertEntitled(req, res))) return;
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid message' });
  const body = parsed.data.body;
  const language = CHAT_LANGS.includes(parsed.data.language) ? parsed.data.language : 'en';

  const { names } = extractMentions(body);
  const msg = await insertChatMessage({
    id: `msg_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
    userId: req.user.id,
    body,
    language,
    replyTo: parsed.data.replyTo ?? null,
    mentions: names,
  });

  const payload = await toPayload(msg);
  emitChatMessage(payload);
  res.json(payload);
});

// GET /api/chat/preferences
router.get('/preferences', requireAuth, async (req: AuthedRequest, res) => {
  res.json({ preferredLanguage: await getChatPreference(req.user.id) });
});

// PUT /api/chat/preferences
router.put('/preferences', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = prefsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid language' });
  const language = CHAT_LANGS.includes(parsed.data.language) ? parsed.data.language : 'en';
  await setChatPreference(req.user.id, language);
  res.json({ ok: true });
});

// PUT /api/chat/username — change display name (propagates to future messages)
router.put('/username', requireAuth, async (req: AuthedRequest, res) => {
  const parsed = usernameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'username must be 2-24 characters' });
  const name = parsed.data.username;
  const existing = await findUserByUsername(name);
  if (existing && existing.id !== req.user.id) {
    return res.status(409).json({ error: 'username already taken' });
  }
  await updateUser(req.user.id, { username: name });
  res.json({ ok: true, username: name });
});

export default router;
