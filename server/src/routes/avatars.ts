import { Router } from 'express';
import { updateUser } from '../db.js';
import { requireAuth, type AuthedRequest } from '../lib/auth.js';
import {
  DEFAULT_AVATAR_FILE,
  avatarFileUrl,
  isValidAvatarFile,
  listAvatarFiles,
  resolveAvatarUrl,
} from '../services/avatars.js';

const router = Router();

// GET /api/avatars — public list of avatars users can pick from
router.get('/', (_req, res) => {
  res.json({
    default: DEFAULT_AVATAR_FILE,
    avatars: listAvatarFiles().map((file) => ({ file, url: avatarFileUrl(file) })),
  });
});

// PUT /api/avatars/me — set the current user's avatar (file name)
router.put('/me', requireAuth, async (req: AuthedRequest, res) => {
  const file = typeof req.body?.avatar === 'string' ? req.body.avatar.trim() : '';
  if (!isValidAvatarFile(file)) {
    return res.status(400).json({ error: 'invalid avatar' });
  }
  await updateUser(req.user.id, { avatar: file });
  res.json({ ok: true, avatar: resolveAvatarUrl(file) });
});

export default router;
