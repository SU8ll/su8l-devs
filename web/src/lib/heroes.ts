/**
 * Kingshot Heroes — metadata for Bear Hunt hero selectors.
 * Portraits live under /heroes/portraits/*.webp (copied from Kingshot Heroes dataset).
 * Stars derived from rarity + in-game display: Rare=3, Epic=4, Mythic=5 — matches Bear Hunt UI screenshots.
 */

export interface HeroMeta {
  id: string; // slug, matches filename without extension
  name: string; // display name
  rarity: 'rare' | 'epic' | 'mythic';
  gen: number;
  clazz: 'Infantry' | 'Cavalry' | 'Archer';
  stars: number; // 3, 4 or 5
  portrait: string; // public URL
}

function p(id: string) {
  return `/heroes/portraits/${id}.webp`;
}

export const HEROES: HeroMeta[] = [
  // Gen 1 — Rare
  { id: 'olive', name: 'Olive', rarity: 'rare', gen: 1, clazz: 'Archer', stars: 3, portrait: p('olive') },
  { id: 'forrest', name: 'Forrest', rarity: 'rare', gen: 1, clazz: 'Infantry', stars: 3, portrait: p('forrest') },
  { id: 'edwin', name: 'Edwin', rarity: 'rare', gen: 1, clazz: 'Cavalry', stars: 3, portrait: p('edwin') },
  { id: 'seth', name: 'Seth', rarity: 'rare', gen: 1, clazz: 'Infantry', stars: 3, portrait: p('seth') },
  // Gen 1 — Epic
  { id: 'diana', name: 'Diana', rarity: 'epic', gen: 1, clazz: 'Archer', stars: 4, portrait: p('diana') },
  { id: 'quinn', name: 'Quinn', rarity: 'epic', gen: 1, clazz: 'Archer', stars: 4, portrait: p('quinn') },
  { id: 'chenko', name: 'Chenko', rarity: 'epic', gen: 1, clazz: 'Cavalry', stars: 4, portrait: p('chenko') },
  { id: 'howard', name: 'Howard', rarity: 'epic', gen: 1, clazz: 'Infantry', stars: 4, portrait: p('howard') },
  { id: 'gordon', name: 'Gordon', rarity: 'epic', gen: 1, clazz: 'Cavalry', stars: 4, portrait: p('gordon') },
  { id: 'fahd', name: 'Fahd', rarity: 'epic', gen: 1, clazz: 'Cavalry', stars: 4, portrait: p('fahd') },
  { id: 'amane', name: 'Amane', rarity: 'epic', gen: 1, clazz: 'Archer', stars: 4, portrait: p('amane') },
  { id: 'yeonwoo', name: 'Yeonwoo', rarity: 'epic', gen: 1, clazz: 'Archer', stars: 4, portrait: p('yeonwoo') },
  // Gen 1 — Mythic
  { id: 'jabel', name: 'Jabel', rarity: 'mythic', gen: 1, clazz: 'Cavalry', stars: 5, portrait: p('jabel') },
  { id: 'saul', name: 'Saul', rarity: 'mythic', gen: 1, clazz: 'Archer', stars: 5, portrait: p('saul') },
  { id: 'helga', name: 'Helga', rarity: 'mythic', gen: 1, clazz: 'Infantry', stars: 5, portrait: p('helga') },
  { id: 'amadeus', name: 'Amadeus', rarity: 'mythic', gen: 1, clazz: 'Infantry', stars: 5, portrait: p('amadeus') },
  // Gen 2
  { id: 'zoe', name: 'Zoe', rarity: 'mythic', gen: 2, clazz: 'Infantry', stars: 5, portrait: p('zoe') },
  { id: 'hilde', name: 'Hilde', rarity: 'mythic', gen: 2, clazz: 'Cavalry', stars: 5, portrait: p('hilde') },
  { id: 'marlin', name: 'Marlin', rarity: 'mythic', gen: 2, clazz: 'Archer', stars: 5, portrait: p('marlin') },
  // Gen 3
  { id: 'eric', name: 'Eric', rarity: 'mythic', gen: 3, clazz: 'Infantry', stars: 5, portrait: p('eric') },
  { id: 'jaeger', name: 'Jaeger', rarity: 'mythic', gen: 3, clazz: 'Archer', stars: 5, portrait: p('jaeger') },
  { id: 'petra', name: 'Petra', rarity: 'mythic', gen: 3, clazz: 'Cavalry', stars: 5, portrait: p('petra') },
  // Gen 4
  { id: 'alcar', name: 'Alcar', rarity: 'mythic', gen: 4, clazz: 'Infantry', stars: 5, portrait: p('alcar') },
  { id: 'rosa', name: 'Rosa', rarity: 'mythic', gen: 4, clazz: 'Archer', stars: 5, portrait: p('rosa') },
  { id: 'margot', name: 'Margot', rarity: 'mythic', gen: 4, clazz: 'Cavalry', stars: 5, portrait: p('margot') },
  // Gen 5
  { id: 'long-fei', name: 'Long Fei', rarity: 'mythic', gen: 5, clazz: 'Infantry', stars: 5, portrait: p('long-fei') },
  { id: 'vivian', name: 'Vivian', rarity: 'mythic', gen: 5, clazz: 'Archer', stars: 5, portrait: p('vivian') },
  { id: 'thrud', name: 'Thrud', rarity: 'mythic', gen: 5, clazz: 'Cavalry', stars: 5, portrait: p('thrud') },
  // Gen 6
  { id: 'yang', name: 'Yang', rarity: 'mythic', gen: 6, clazz: 'Archer', stars: 5, portrait: p('yang') },
  { id: 'triton', name: 'Triton', rarity: 'mythic', gen: 6, clazz: 'Infantry', stars: 5, portrait: p('triton') },
  { id: 'sophia', name: 'Sophia', rarity: 'mythic', gen: 6, clazz: 'Cavalry', stars: 5, portrait: p('sophia') },
  // Gen 7
  { id: 'ava', name: 'Ava', rarity: 'mythic', gen: 7, clazz: 'Cavalry', stars: 5, portrait: p('ava') },
  { id: 'charles', name: 'Charles', rarity: 'mythic', gen: 7, clazz: 'Infantry', stars: 5, portrait: p('charles') },
  { id: 'wee-and-woo', name: 'Wee & Woo', rarity: 'mythic', gen: 7, clazz: 'Archer', stars: 5, portrait: p('wee-and-woo') },
];

export const HERO_BY_ID = new Map(HEROES.map((h) => [h.id, h] as const));

/** Options for Bear Hunt selects: '' = auto/best buff, then every hero id sorted with Epic/Mythic first. */
export const BEAR_HERO_OPTION_IDS: string[] = ['', ...HEROES.map((h) => h.id)];

/** Stars as ★ string, e.g. 4 -> '★★★★' */
export function starsLabel(n: number): string {
  return '★'.repeat(n);
}

/** Human label for hero id, e.g. 'Chenko ★★★★' or '— Best buff (auto)' for '' */
export function heroLabel(id: string): string {
  if (!id) return '— Best buff (auto)';
  const h = HERO_BY_ID.get(id);
  return h ? `${h.name} ${starsLabel(h.stars)}` : id;
}
