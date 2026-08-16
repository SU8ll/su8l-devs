import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

// Avatars are plain image files dropped into server/public/avatars/.
// The default avatar is used for every user until they pick one.
const AVATAR_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/avatars');
const AVATAR_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

export const DEFAULT_AVATAR_FILE = 'alcar.webp';

export function avatarDir(): string {
  return AVATAR_DIR;
}

/** Sorted list of avatar file names available to pick from. */
export function listAvatarFiles(): string[] {
  if (!existsSync(AVATAR_DIR)) return [];
  return readdirSync(AVATAR_DIR)
    .filter((f) => AVATAR_EXT.test(f))
    .sort((a, b) => a.localeCompare(b));
}

/** True when `file` is a real avatar file that users may select. */
export function isValidAvatarFile(file: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(file) && listAvatarFiles().includes(file);
}

/** Absolute URL for an avatar file served by this API. */
export function avatarFileUrl(file: string): string {
  return `${config.apiUrl}/avatars/${encodeURIComponent(file)}`;
}

/**
 * Resolve a stored avatar value (a file name, possibly null/legacy) to the URL
 * that should be displayed. Anything unknown falls back to the default avatar.
 */
export function resolveAvatarUrl(avatar: string | null | undefined): string {
  const file = avatar && isValidAvatarFile(avatar) ? avatar : DEFAULT_AVATAR_FILE;
  return avatarFileUrl(file);
}
