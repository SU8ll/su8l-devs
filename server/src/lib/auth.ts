import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { getUser, type User } from '../db.js';

// Augment Express.Request so handlers behind requireAuth can read req.user
// without friction.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: User;
    }
  }
}

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '30d' });
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(config.cookieName, { path: '/' });
}

export function readSessionToken(req: Request): string | null {
  const cookie = (req.cookies as Record<string, string> | undefined)?.[config.cookieName];
  if (cookie) return cookie;
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7);
  return null;
}

export async function getSessionUser(req: Request): Promise<User | undefined> {
  const token = readSessionToken(req);
  if (!token) return undefined;
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub?: string };
    if (!payload.sub) return undefined;
    return await getUser(payload.sub);
  } catch {
    return undefined;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      res.status(401).json({ error: 'authentication required' });
      return;
    }
    (req as Request & { user: User }).user = user;
    next();
  } catch {
    res.status(500).json({ error: 'internal server error' });
  }
}

export type AuthedRequest = Request;
