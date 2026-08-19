/**
 * Inline note translation for kind-1 notes (issue #133).
 *
 * Frontend-only, LibreTranslate-compatible. A note's raw text is sent to a
 * user-configurable `/translate` endpoint after any entities that must survive
 * translation verbatim (URLs, `nostr:`/bare bech32 references, hashtags,
 * `@mentions` and lightning invoices) have been masked out. Translated text is
 * then spliced back with those entities restored exactly as they appeared.
 *
 * This module is intentionally self-contained (no imports from the rest of the
 * app) so its entity-protection and service logic can be unit-tested in
 * isolation from the browser/DOM (see scripts/check-translation.mjs).
 */

/**
 * Default public LibreTranslate-compatible endpoint. Self-hostable; users may
 * override it (and supply an API key) under Settings → Note Translation.
 */
export const DEFAULT_TRANSLATE_ENDPOINT = 'https://libretranslate.com';

/**
 * Default target language derived from the browser locale, e.g. "en-US" → "en".
 * LibreTranslate expects an ISO 639-1 code.
 */
export const DEFAULT_TRANSLATE_TARGET = (): string => {
  const lang = (typeof navigator !== 'undefined' && navigator.language) || 'en';
  return (lang.split('-')[0] || 'en').toLowerCase();
};

// ---------------------------------------------------------------------------
// Entity protection (mask before translate, splice back verbatim after)
// ---------------------------------------------------------------------------

// The bech32 character set used by Nostr references (npub/nprofile/note/nevent/naddr).
const BECH32_CHARS = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

const NOSTR_ENTITY_KINDS = 'npub|nprofile|note|nevent|naddr';

/**
 * Ordered protection patterns. Order matters: the most specific forms must be
 * matched before the more generic ones so a `nostr:npub1…` reference is
 * consumed whole before the bare-`npub1…` pattern ever sees it, and URLs are
 * masked before hashtags so a `#fragment` inside a URL is not treated as a tag.
 */
const PROTECTED_PATTERNS: RegExp[] = [
  // nostr:-prefixed bech32 references (most specific)
  new RegExp(`nostr:(${NOSTR_ENTITY_KINDS})1[${BECH32_CHARS}]+`, 'gi'),
  // URLs (with or without a leading nostr: prefix). Must run BEFORE bare bech32
  // so a bech32 reference appearing inside a URL path is masked together with
  // the URL as a single unit (otherwise the URL's placeholder would capture an
  // already-masked inner placeholder and corrupt the restore).
  /(?:nostr:)?https?:\/\/[^\s]+/gi,
  // bare bech32 references
  new RegExp(`\\b(${NOSTR_ENTITY_KINDS})1[${BECH32_CHARS}]+`, 'gi'),
  // lightning invoices (keep them machine-readable)
  /\blnbc[a-z0-9]+/gi,
  // hashtags (leading boundary captured so the # is not a color/bare `#`)
  /(?:^|\s)#[\p{L}\p{N}_]+/giu,
  // @mentions
  /(?:^|\s)@[\p{L}\p{N}_-]+/giu,
];

// Trailing punctuation that belongs to the surrounding sentence rather than a
// URL. Peeled off in the URL protection callback so it still gets translated.
const URL_TRAILING_PUNCTUATION = /[.,;:!?()[\]{}"'<>]+$/;

export type ProtectedSegment = {
  /** placeholder emitted into the text handed to the translator, e.g. `⟦0⟧` */
  placeholder: string;
  /** the original text to restore verbatim */
  original: string;
};

export type ProtectedContent = {
  /** text with all protected segments replaced by placeholders */
  text: string;
  /** ordered, de-duplicated list of protected segments */
  segments: ProtectedSegment[];
};

const placeholderFor = (index: number) => `\u27E6${index}\u27E7`;

const isUrlPattern = (re: RegExp) => re.source.includes('https?');

/**
 * Replace URLs, Nostr references, hashtags, @mentions and lightning invoices
 * with sequential `⟦N⟧` placeholders so the translation provider never sees
 * them. Identical entities are de-duplicated (reusing the same placeholder) to
 * reduce the payload size and keep the restore step trivial.
 */
export const protectEntities = (content: string): ProtectedContent => {
  const segments: ProtectedSegment[] = [];
  let working = content;
  let index = 0;

  const protect = (original: string): string => {
    const existing = segments.find((s) => s.original === original);
    if (existing) return existing.placeholder;

    const placeholder = placeholderFor(index);
    segments.push({ placeholder, original });
    index++;
    return placeholder;
  };

  for (const pattern of PROTECTED_PATTERNS) {
    working = working.replace(pattern, (match) => {
      // For URLs, peel trailing sentence punctuation and keep it in place so it
      // is still translated rather than glued onto the restored link.
      if (isUrlPattern(pattern)) {
        const trailing = (match.match(URL_TRAILING_PUNCTUATION) || [''])[0];
        const url = trailing ? match.slice(0, match.length - trailing.length) : match;
        return protect(url) + trailing;
      }
      return protect(match);
    });
  }

  return { text: working, segments };
};

/**
 * Restore protected segments into the translated text. Tolerates translators
 * that insert whitespace inside the `⟦N⟧` markers, then removes any leftover
 * markers as a final safety net.
 */
export const restoreEntities = (
  translated: string,
  segments: ProtectedSegment[],
): string => {
  let result = translated;

  for (const segment of segments) {
    const num = (segment.placeholder.match(/\d+/) || [''])[0];
    if (!num) continue;
    const re = new RegExp(`\\u27E6\\s*${num}\\s*\\u27E7`, 'g');
    result = result.replace(re, segment.original);
  }

  return result.replace(/\u27E6\s*\d+\s*\u27E7/g, '');
};

/**
 * Whether there is any prose left to translate once entities are masked out.
 * Used to hide the Translate control on notes that are only URLs, images,
 * references, etc.
 */
export const hasTranslatableContent = (content: string): boolean => {
  const { text } = protectEntities(content);
  return /\p{L}/u.test(text);
};

// ---------------------------------------------------------------------------
// Content hashing (cache keys)
// ---------------------------------------------------------------------------

/**
 * Stable, dependency-free hash (djb2) used only for cache keys — not for
 * security.
 */
export const contentHash = (text: string): string => {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash = hash & hash; // keep within 32-bit
  }
  return (hash >>> 0).toString(16);
};

// ---------------------------------------------------------------------------
// Client-side cache with bounded eviction
// ---------------------------------------------------------------------------

const CACHE_KEY = 'primal:translation:cache';
const CACHE_MAX_ENTRIES = 200;

export type CachedTranslation = {
  translatedText: string;
  detectedLanguage: string;
  ts: number;
};

type CacheStore = Record<string, CachedTranslation>;

const getLocalStorage = (): Storage | undefined => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
};

const readCacheStore = (): CacheStore => {
  const ls = getLocalStorage();
  if (!ls) return {};
  try {
    const raw = ls.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheStore) : {};
  } catch {
    return {};
  }
};

const writeCacheStore = (store: CacheStore): void => {
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    /* storage full / unavailable — non-fatal, translation still works */
  }
};

/** Evict the oldest entries until the store is within CACHE_MAX_ENTRIES. */
const evictCache = (store: CacheStore): void => {
  const entries = Object.entries(store);
  if (entries.length <= CACHE_MAX_ENTRIES) return;
  entries.sort((a, b) => (a[1].ts || 0) - (b[1].ts || 0));
  const toRemove = entries.length - CACHE_MAX_ENTRIES;
  for (let i = 0; i < toRemove; i++) delete store[entries[i][0]];
};

const cacheKeyFor = (sourceText: string, targetLang: string, endpoint: string) =>
  contentHash(`${endpoint}|${targetLang}|${sourceText}`);

export const readCache = (
  sourceText: string,
  targetLang: string,
  endpoint: string,
): CachedTranslation | undefined => {
  return readCacheStore()[cacheKeyFor(sourceText, targetLang, endpoint)];
};

export const writeCache = (
  sourceText: string,
  targetLang: string,
  endpoint: string,
  value: CachedTranslation,
): void => {
  const store = readCacheStore();
  store[cacheKeyFor(sourceText, targetLang, endpoint)] = {
    ...value,
    ts: value.ts || Date.now(),
  };
  evictCache(store);
  writeCacheStore(store);
};

// ---------------------------------------------------------------------------
// LibreTranslate-compatible API call
// ---------------------------------------------------------------------------

export type TranslationResult = {
  translatedText: string;
  detectedLanguage: string;
};

export type TranslationError = {
  message: string;
  status?: number;
};

/**
 * POST to a LibreTranslate-compatible `/translate` endpoint.
 *
 * Request body: `{ q, source: "auto", target, format: "text", api_key? }`.
 * Response:    `{ translatedText, detectedLanguage?: { language } | string }`.
 *
 * Also tolerates the Lingva (`translation`) shape, a drop-in-compatible
 * alternative users sometimes point the endpoint at.
 */
export const translateText = async (
  text: string,
  targetLang: string,
  endpoint: string,
  apiKey?: string,
): Promise<TranslationResult> => {
  const base = (endpoint || DEFAULT_TRANSLATE_ENDPOINT).trim().replace(/\/+$/, '');
  const url = /\/translate$/.test(base) ? base : `${base}/translate`;

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw {
      message: `Could not reach the translation service (${base}). Check the endpoint in Settings → Note Translation or your connection.`,
    } as TranslationError;
  }

  if (!resp.ok) {
    let detail = '';
    try {
      detail = (await resp.text()).slice(0, 200);
    } catch {
      /* ignore */
    }
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

  if (typeof data.translatedText === 'string') {
    const detected = data.detectedLanguage;
    return {
      translatedText: data.translatedText,
      detectedLanguage:
        (typeof detected === 'string' && detected) ||
        (detected && detected.language) ||
        '',
    };
  }

  if (typeof data.translation === 'string') {
    return { translatedText: data.translation, detectedLanguage: '' };
  }

  throw { message: 'Translation service returned an unexpected response shape.' } as TranslationError;
};

/**
 * High-level pipeline used by the UI: cache lookup → protect entities →
 * translate → restore entities → cache write.
 */
export const translateNoteContent = async (
  content: string,
  targetLang: string,
  endpoint: string,
  apiKey?: string,
): Promise<TranslationResult> => {
  const cached = readCache(content, targetLang, endpoint);
  if (cached) {
    return {
      translatedText: cached.translatedText,
      detectedLanguage: cached.detectedLanguage,
    };
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
