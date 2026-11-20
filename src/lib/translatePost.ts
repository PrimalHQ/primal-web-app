/**
 * Translate a Nostr post into the visitor's preferred UI language.
 *
 * Uses the free MyMemory public endpoint (no API key, no account) and keeps a
 * small in-memory cache so repeated opens of the same note do not re-fetch.
 * The original text is never modified — callers render the translation in a
 * separate element next to the post.
 *
 * This file is intentionally standalone so it can be reviewed and unit-tested
 * without mounting the Solid app.
 */

export type TranslateResult = {
  ok: boolean;
  translatedText?: string;
  reason?: string;
};

const CACHE_LIMIT = 200;
const cache = new Map<string, string>();

export function normalizeLang(locale: string | undefined | null): string {
  const raw = String(locale || 'en').toLowerCase();
  const base = raw.split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(base) ? base : 'en';
}

export function cacheKey(text: string, lang: string): string {
  return `${lang}\u0000${text}`;
}

export function getCached(text: string, lang: string): string | undefined {
  return cache.get(cacheKey(text, lang));
}

export function putCached(text: string, lang: string, value: string): void {
  const key = cacheKey(text, lang);
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value as string | undefined;
    if (oldest) cache.delete(oldest);
  }
}

export function shouldTranslate(text: string, lang: string): boolean {
  if (!text || !text.trim()) return false;
  if (normalizeLang(lang) === 'en') return true;
  return true;
}

/**
 * Fetch a translation. Kept separate from Solid so tests can inject fetch.
 */
export async function translatePost(
  text: string,
  locale: string | undefined | null,
  fetcher: typeof fetch = fetch,
): Promise<TranslateResult> {
  const lang = normalizeLang(locale);
  if (!text || !text.trim()) return { ok: false, reason: 'empty' };
  const cached = getCached(text, lang);
  if (cached) return { ok: true, translatedText: cached };

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 900))}&langpair=en%7C${encodeURIComponent(lang)}`;
  try {
    const res = await fetcher(url, { method: 'GET' });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    const body = await res.json() as {
      responseData?: { translatedText?: string };
      responseStatus?: number;
    };
    const out = String(body?.responseData?.translatedText || '').trim();
    if (!out || /^MYMEMORY WARNING/i.test(out)) {
      return { ok: false, reason: 'bad_response' };
    }
    putCached(text, lang, out);
    return { ok: true, translatedText: out };
  } catch (e) {
    return { ok: false, reason: 'network' };
  }
}

export function clearTranslateCache(): void {
  cache.clear();
}
