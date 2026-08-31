import { CHAT_LANG_ISO, type ChatLang } from './api';

const cache = new Map<string, string>();

function cacheKey(text: string, src: string, target: string): string {
  return `${src}|${target}|${text}`;
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
