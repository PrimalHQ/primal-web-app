import { getLang } from '../utils';

/**
 * Inline note translation (issue #133).
 *
 * Approach (per maintainer @cortexuvula):
 *  - Inline translation rendered directly in the note.
 *  - Frontend-only, LibreTranslate-compatible API (configurable endpoint + key).
 *  - Nostr entities (nostr:npub..., nostr:nevent..., nostr:naddr...,
 *    nostr:nprofile..., nostr:note..., links, hashtags, lnbc) are protected
 *    from translation and spliced back into the result verbatim, so they keep
 *    working as references after translation.
 *  - Translations cached client-side, keyed on a content+target hash.
 */

// Default public LibreTranslate-compatible endpoint. Self-hostable; users can
// override it (and supply an API key) in Settings.
export const DEFAULT_TRANSLATE_ENDPOINT = 'https://libretranslate.com';
export const DEFAULT_TRANSLATE_TARGET = (): string => {
  const lang = getLang() || 'en';
  // navigator.language yields e.g. "en-US"; LibreTranslate wants "en".
  return lang.split('-')[0].toLowerCase() || 'en';
};

// --- entity protection ------------------------------------------------------

// Order matters: the longer nostr: forms must be matched before bare entities.
const PROTECTED_PATTERNS: RegExp[] = [
  // nostr: prefixed bech32 references (npub, note, nevent, naddr, nprofile)
  /nostr:(npub|note|nevent|naddr|nprofile|nsec)[0-9a-z]{4,}/gi,
  // bare bech32 references (npub1..., note1...)
  /\b(npub|note|nevent|naddr|nprofile)[0-9a-z]{20,}/gi,
  // http(s) urls
  /https?:\/\/[^\s]+/gi,
  // lightning invoices
  /\blnbc[a-z0-9]+\b/gi,
  // nostr: followed by an http url (some clients encode this way)
  /nostr:https?:\/\/[^\s]+/gi,
  // hashtags (keep the #, keep verbatim so they still link/parse)
  /#[\p{L}\p{N}_]+/giu,
];

export type ProtectedSegment = {
  /** placeholder used in the text sent to the translator, e.g. "N0N" */
  placeholder: string;
  /** the original text to restore */
  original: string;
};

export type ProtectedContent = {
  /** text with all protected segments replaced by placeholders */
  text: string;
  /** ordered list of protected segments */
  segments: ProtectedSegment[];
};

/**
 * Replace Nostr entities, links, hashtags and lnbc invoices with sequential
 * placeholders so the translator never sees them, then they can be spliced
 * back verbatim. This prevents translators from mangling npub/naddr refs,
 * breaking links, or translating hashtags into gibberish.
 */
export const protectEntities = (content: string): ProtectedContent => {
  const segments: ProtectedSegment[] = [];
  let working = content;
  let index = 0;

  for (const pattern of PROTECTED_PATTERNS) {
    working = working.replace(pattern, (match) => {
      // de-dupe identical matches: reuse the same placeholder
      const existing = segments.find((s) => s.original === match);
      if (existing) return existing.placeholder;

      const placeholder = `\u27E6${index}\u27E7`;
      segments.push({ placeholder, original: match });
      index++;
      return placeholder;
    });
  }

  return { text: working, segments };
};

/**
 * Restore protected segments into the translated text. Placeholders are the
 * \u27E6N\u27E7 markers; we replace them back with the original entity text.
 */
export const restoreEntities = (translated: string, segments: ProtectedSegment[]): string => {
  let result = translated;
  for (const seg of segments) {
    const num = seg.placeholder.match(/\d+/);
    if (!num) continue;
    // tolerant: some translators mangle bracket chars, so match digit island
    const re = new RegExp(`\u27E6\s*${num[0]}\s*\u27E7`, 'g');
    result = result.replace(re, seg.original);
  }
  // Fallback cleanup: any leftover markers -> remove
  result = result.replace(/\u27E6\s*\d+\s*\u27E7/g, '');
  return result;
};

// --- content hashing --------------------------------------------------------

/**
 * Stable hash for cache keys. djb2 - short, dependency-free, good enough for a
 * cache key (not used for security).
 */
export const contentHash = (text: string): string => {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash = hash & hash; // 32bit
  }
  return (hash >>> 0).toString(16);
};

// --- cache ------------------------------------------------------------------

const CACHE_PREFIX = 'primal:translation:';

export type CachedTranslation = {
  translatedText: string;
  detectedLanguage: string;
  ts: number;
};

export const readCache = (
  sourceText: string,
  targetLang: string,
  endpoint: string,
): CachedTranslation | undefined => {
  try {
    const key = CACHE_PREFIX + contentHash(`${endpoint}|${targetLang}|${sourceText}`);
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as CachedTranslation;
  } catch {
    return undefined;
  }
};

export const writeCache = (
  sourceText: string,
  targetLang: string,
  endpoint: string,
  value: CachedTranslation,
): void => {
  try {
    const key = CACHE_PREFIX + contentHash(`${endpoint}|${targetLang}|${sourceText}`);
    pruneCache(200);
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable - non-fatal, translation still works */
  }
};

const pruneCache = (maxKeys: number): void => {
  try {
    const keys: { key: string; ts: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_PREFIX)) {
        const raw = localStorage.getItem(k);
        const ts = raw ? (JSON.parse(raw).ts as number) || 0 : 0;
        keys.push({ key: k, ts });
      }
    }
    if (keys.length <= maxKeys) return;
    keys.sort((a, b) => a.ts - b.ts);
    const toRemove = keys.length - maxKeys;
    for (let i = 0; i < toRemove; i++) localStorage.removeItem(keys[i].key);
  } catch {
    /* ignore */
  }
};

// --- API call ---------------------------------------------------------------

export type TranslationResult = {
  translatedText: string;
  detectedLanguage: string;
};

export type TranslationError = {
  message: string;
  status?: number;
};

/**
 * Calls a LibreTranslate-compatible /translate endpoint.
 *
 * LibreTranslate spec:
 *   POST {endpoint}/translate
 *   body: { q, source: "auto", target, format: "text", api_key? }
 *   resp: { translatedText, detectedLanguage?: { language } }
 *
 * Also tolerates the Lingva (lingva.ml) shape as a fallback since it is a
 * drop-in LibreTranslate-compatible alternative users may point at.
 */
export const translateText = async (
  text: string,
  targetLang: string,
  endpoint: string,
  apiKey?: string,
): Promise<TranslationResult> => {
  const url = endpoint.replace(/\/+$/, '') + '/translate';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey && apiKey.trim().length > 0) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const body: Record<string, unknown> = {
    q: text,
    source: 'auto',
    target: targetLang,
    format: 'text',
  };
  if (apiKey && apiKey.trim().length > 0) {
    body.api_key = apiKey.trim();
  }

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw {
      message: `Could not reach translation service (${endpoint}). Check the endpoint in Settings or your connection.`,
    } as TranslationError;
  }

  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.text()).slice(0, 200); } catch { /* ignore */ }
    throw {
      message: `Translation service returned an error (HTTP ${resp.status})${detail ? `: ${detail}` : ''}`,
      status: resp.status,
    } as TranslationError;
  }

  let data: any;
  try {
    data = await resp.json();
  } catch {
    throw { message: 'Translation service returned a malformed response.' } as TranslationError;
  }

  // LibreTranslate shape
  if (typeof data.translatedText === 'string') {
    return {
      translatedText: data.translatedText,
      detectedLanguage: data.detectedLanguage?.language || data.detectedLanguage || '',
    };
  }

  // Lingva shape: { translation: "..." }
  if (typeof data.translation === 'string') {
    return { translatedText: data.translation, detectedLanguage: '' };
  }

  throw { message: 'Translation service returned an unexpected response shape.' } as TranslationError;
};

/**
 * High-level: protect -> translate -> restore, with caching.
 * This is what the component calls.
 */
export const translateNoteContent = async (
  content: string,
  targetLang: string,
  endpoint: string,
  apiKey?: string,
): Promise<TranslationResult> => {
  const cached = readCache(content, targetLang, endpoint);
  if (cached) {
    return { translatedText: cached.translatedText, detectedLanguage: cached.detectedLanguage };
  }

  const { text: protectedText, segments } = protectEntities(content);
  const result = await translateText(protectedText, targetLang, endpoint, apiKey);
  const translatedText = restoreEntities(result.translatedText, segments);

  writeCache(content, targetLang, endpoint, {
    translatedText,
    detectedLanguage: result.detectedLanguage,
    ts: Date.now(),
  });

  return { translatedText, detectedLanguage: result.detectedLanguage };
};
