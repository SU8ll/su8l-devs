import { randomInt, randomUUID } from 'node:crypto';

const ORDER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PROMO_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function secureBlock(length: number, alphabet: string): string {
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[randomInt(0, alphabet.length)]!;
  return out;
}

export function generateOrderId(): string {
  return `SU8L-${secureBlock(8, ORDER_ALPHABET)}`;
}

export function generatePromoCode(): string {
  const blocks = [secureBlock(4, PROMO_ALPHABET), secureBlock(4, PROMO_ALPHABET), secureBlock(4, PROMO_ALPHABET)];
  return `SU8L-${blocks.join('-')}-DEVs`;
}

export function newUid(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

export const PROMO_PATTERN = /^SU8L-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-DEVs$/;
