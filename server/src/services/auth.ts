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

export async function upsertOAuthUser(p: OAuthProfile): Promise<User> {
  let user = await findUserByAccount(p.provider, p.providerId);

  if (!user && p.email) user = await findUserByEmail(p.email);

  if (user) {
    if (p.email && !user.email) await updateUser(user.id, { email: p.email });
    if (p.avatar && !user.avatar) await updateUser(user.id, { avatar: p.avatar });
    if (p.username) await updateUser(user.id, { username: p.username, avatar: user.avatar });
    await addAccount({
      user_id: user.id,
      provider: p.provider,
      provider_id: p.providerId,
      access_token: p.accessToken ?? null,
      refresh_token: p.refreshToken ?? null,
      expires_at: p.expiresAt ?? null,
    });
    return (await getUser(user.id))!;
  }

  const id = newUid('usr');
  const user2 = await createUser({
    id,
    email: p.email ?? null,
    username: p.username || p.providerId,
    avatar: p.avatar ?? null,
    locale: p.locale ?? 'en',
  });
  await addAccount({
    user_id: id,
    provider: p.provider,
    provider_id: p.providerId,
    access_token: p.accessToken ?? null,
    refresh_token: p.refreshToken ?? null,
    expires_at: p.expiresAt ?? null,
  });
  return user2;
}

export function discordAvatarUrl(discordId: string, avatarHash: string | null | undefined): string | null {
  if (!avatarHash) return null;
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.png?size=256`;
}
