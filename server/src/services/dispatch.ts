import axios from 'axios';
import { config } from '../config.js';
import { getAccounts, getUser } from '../db.js';

export interface DispatchResult {
  dispatched: boolean;
  reason?: string;
}

/**
 * POSTs an action to the Discord bot's HTTP callback endpoint. The bot owns all
 * Discord side-effects (DMing the owner, granting roles) — this service is only
 * the transport between the API and the bot, guarded by the shared BOT_API_KEY.
 */
export async function dispatchToBot(payload: Record<string, unknown>): Promise<DispatchResult> {
  const base = (config.botCallbackUrl || '').replace(/\/$/, '');
  if (!base) return { dispatched: false, reason: 'BOT_CALLBACK_URL not configured' };
  try {
    await axios.post(`${base}/dispatch`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-bot-key': config.botApiKey,
      },
      timeout: 8000,
    });
    return { dispatched: true };
  } catch (err) {
    console.error('[dispatch:bot]', err instanceof Error ? err.message : err);
    return { dispatched: false, reason: 'bot unreachable' };
  }
}

/**
 * Resolves a platform user's linked Discord identity (id + display name). Used
 * by the Cloud Configurator DM so the owner can map a config to the buyer, and
 * by the role-grant wiring so the right member is promoted.
 */
export async function getDiscordIdentity(userId: string): Promise<{ discordId: string; discordUsername: string } | null> {
  const acc = (await getAccounts(userId)).find((a) => a.provider === 'discord');
  if (!acc) return null;
  const u = await getUser(userId);
  return { discordId: acc.provider_id, discordUsername: u?.username || acc.provider_id };
}
