import { CHAT_LANG_ISO, type ChatLang } from './api';

const cache = new Map<string, string>();

function cacheKey(text: string, src: string, target: string): string {
  return `${src}|${target}|${text}`;
}

function sample(text: string, n = 100): string {
  return text.replace(/\s+/g, ' ').slice(0, n);
}

function percent(text: string, test: (ch: string) => boolean): number {
  const s = sample(text);
  let hits = 0;
  let total = 0;
  for (const ch of s) {
    if (test(ch)) hits++;
    total++;
  }
  return total ? hits / total : 0;
}

// Detect Latin-script languages by diacritic/rare-letter signatures that let us
// tell the European languages apart from each other and from plain English.
function scoreScript(text: string): Partial<Record<ChatLang, number>> {
  const s = sample(text);
  const out: Partial<Record<ChatLang, number>> = {};

  // ASCII-only text (English/emojis/numbers) — assume English when at least one
  // ASCII letter is present and nothing else matches stronger.
  const asciiLetters = (s.match(/[A-Za-z]/g) ?? []).length;
  const asciiRatio = asciiLetters / Math.max(1, s.length);

  // Arabic
  const arRatio = percent(s, (c) => /[\u0600-\u06FF\u0750-\u077F]/.test(c));
  // Cyrillic (Turkish uses Latin; RU not in set — ignore)
  // CJK
  const zhRatio = percent(s, (c) => /[\u4E00-\u9FFF\u3400-\u4DBF]/.test(c));
  // Hangul
  const koRatio = percent(s, (c) => /[\uAC00-\uD7AF\u1100-\u11FF]/.test(c));
  // Devanagari (Hindi)
  const hiRatio = percent(s, (c) => /[\u0900-\u097F]/.test(c));

  if (arRatio > 0.2) out.ar = arRatio;
  if (zhRatio > 0.2) out.zh = zhRatio;
  if (koRatio > 0.2) out.ko = koRatio;
  if (hiRatio > 0.2) out.hi = hiRatio;

  // Turkish-specific: ğ Ğ ı ş Ş ç Ç ö Ö ü Ü — ş/ı are strong Turkish markers (include caps).
  const trStrong = (s.match(/[ğĞıİşŞçÇöÖüÜ]/g) ?? []).length;
  // German strong: ä ö ü ß
  const deStrong = (s.match(/[äöüßÄÖÜ]/g) ?? []).length;
  // French strong: ç é è ê à ù œ (both cases)
  const frStrong = (s.match(/[éèêàçùœÉÈÊÀÇÙŒ]/g) ?? []).length;
  // Italian strong: à è é ì ò ù (both cases) — also capital È at sentence start
  const itStrong = (s.match(/[àèéìòùÀÈÉÌÒÙ]/g) ?? []).length;

  const letterCount = Math.max(1, asciiLetters);
  if (trStrong && trStrong / letterCount >= 0.01) out.tr = trStrong;
  if (deStrong && deStrong / letterCount >= 0.01) out.de = deStrong;
  if (frStrong && frStrong / letterCount >= 0.01) out.fr = frStrong;
  if (itStrong && itStrong / letterCount >= 0.008) out.it = itStrong;

  // Word-based boost for Latin languages with few diacritics (common words)
  const lower = s.toLowerCase();
  if (/\b(che|non|sono|anche|davvero|fantastico|piccoli|dettagli|traduzione|automatica|vero|gesto|pensate|piccolo|cose)\b/.test(lower)) out.it = (out.it ?? 0) + 2;
  if (/\b(bonjour|merci|oui|avec|pour|vous|très|français|parfait|bien)\b/.test(lower)) out.fr = (out.fr ?? 0) + 2;
  if (/\b(und|der|die|das|nicht|hallo|danke|wirklich|klein)\b/.test(lower)) out.de = (out.de ?? 0) + 2;
  if (/\b(ve|bir|bu|çok|teşekkür|merhaba|nasıl|güzel)\b/.test(lower)) out.tr = (out.tr ?? 0) + 2;
  if (/\b(hello|the|and|you|are|this|that|with|have|for|not|but|are)\b/.test(lower) && !out.it && !out.fr && !out.de && !out.tr) out.en = asciiRatio;

  return out;
}

/**
 * Best-effort detection of the actual spoken/written language of a chat message
 * body, based on Unicode script and diacritic signatures. Falls back to the
 * declared `fallback` when the body is too short / ambiguous (emojis, numbers).
 * This is what fixes "wrong original language": we no longer blindly trust the
 * sender's selected UI language, which often differs from what they actually type.
 */
export function detectLanguage(text: string, fallback: ChatLang = 'en'): ChatLang {
  const s = sample(text);
  if (!s) return fallback;

  const scores = scoreScript(s);
  // Only trust script/diacritic detection if it clearly outweighs plain ASCII,
  // otherwise (short / mostly-emoji / ambiguous) fall back to the declared lang.
  let best: ChatLang | undefined;
  let bestScore = 0;
  for (const [lang, v] of Object.entries(scores) as [ChatLang, number][]) {
    if (v > bestScore) {
      best = lang;
      bestScore = v;
    }
  }
  if (best && best !== 'en' && bestScore > 0.05) return best;
  if (best === 'en' && bestScore >= 0.3) return 'en';
  return fallback;
}

/**
 * Translates `text` from `src` to `target` using the free MyMemory API. The
 * result is cached per (text, src, target). On any failure the original text is
 * returned so an outage never breaks the chat.
 */
export async function translateText(
  text: string,
  src: ChatLang,
  target: ChatLang,
  signal?: AbortSignal
): Promise<string> {
  if (src === target) return text;
  const trimmed = text.trim();
  if (!trimmed) return text;
  const key = cacheKey(trimmed, src, target);
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed.slice(0, 2000))}&langpair=${encodeURIComponent(
      CHAT_LANG_ISO[src] + '|' + CHAT_LANG_ISO[target]
    )}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return text;
    const data = (await res.json()) as { responseData?: { translatedText?: string }; responseStatus?: string };
    const translated = data?.responseData?.translatedText;
    if (!translated || String(data.responseStatus ?? '') !== '200') return text;
    cache.set(key, translated);
    return translated;
  } catch {
    return text;
  }
}

/**
 * Batch-translator hook: maps a set of (messageId, target) requests and streams
 * results as they resolve, deduplicating concurrent calls for the same key.
 */
export function createTranslator() {
  const inFlight = new Map<string, Promise<string>>();

  function translateWithDedup(text: string, src: ChatLang, target: ChatLang): Promise<string> {
    const key = cacheKey(text, src, target);
    const existing = inFlight.get(key);
    if (existing) return existing;
    const p = translateText(text, src, target).finally(() => inFlight.delete(key));
    inFlight.set(key, p);
    return p;
  }

  return { translate: translateWithDedup };
}
