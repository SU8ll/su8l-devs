import { newUid } from '../lib/ids.js';
import {
  addAccount,
  createUser,
  findUserByAccount,
  findUserByEmail,
  getUser,
  updateUser,
  type User,
} from '../db.js';

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email?: string | null;
  username: string;
  avatar?: string | null;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number | null;
  locale?: string;
}

export function upsertOAuthUser(p: OAuthProfile): User {
  let user = findUserByAccount(p.provider, p.providerId);

  if (!user && p.email) user = findUserByEmail(p.email);

  if (user) {
    if (p.email && !user.email) updateUser(user.id, { email: p.email });
    if (p.avatar && !user.avatar) updateUser(user.id, { avatar: p.avatar });
    if (p.username) updateUser(user.id, { username: p.username, avatar: user.avatar });
    addAccount({
      user_id: user.id,
      provider: p.provider,
      provider_id: p.providerId,
      access_token: p.accessToken ?? null,
      refresh_token: p.refreshToken ?? null,
      expires_at: p.expiresAt ?? null,
    });
    return getUser(user.id)!;
  }

  const id = newUid('usr');
  user = createUser({
    id,
    email: p.email ?? null,
    username: p.username || p.providerId,
    avatar: p.avatar ?? null,
    locale: p.locale ?? 'en',
  });
  addAccount({
    user_id: id,
    provider: p.provider,
    provider_id: p.providerId,
    access_token: p.accessToken ?? null,
    refresh_token: p.refreshToken ?? null,
    expires_at: p.expiresAt ?? null,
  });
  return user;
}

export function discordAvatarUrl(discordId: string, avatarHash: string | null | undefined): string | null {
  if (!avatarHash) return null;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png?size=256`;
}
