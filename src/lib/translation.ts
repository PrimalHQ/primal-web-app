import { createStore } from 'solid-js/store';
import { maskProtectedTokens, restoreProtectedTokens, extractProse } from './translationSanitizer';
import { primaryLanguageCode } from './languageDetect';

/**
 * Note translation service (issue #133).
 *
 * Frontend-only: note content is sent, on explicit user action only, to a
 * user-configured LibreTranslate-compatible endpoint (self-hostable, no
 * paid key required). Protected tokens (Nostr refs, URLs, invoices, ...)
 * are masked out before anything leaves the device and restored verbatim
 * afterwards — see `./translationSanitizer`.
 *
 * The provider boundary is an interface (`TranslationProvider`) so other
 * backends can be added without touching the UI; LibreTranslate is the
 * only implementation shipped here.
 */

export type TranslationSettings = {
  enabled: boolean,
  /** Base URL of a LibreTranslate-compatible server ('' = not configured). */
  endpoint: string,
  /** Optional API key for the endpoint (public instances may require one). */
  apiKey: string,
  /** Target language code ('' = follow the browser language). */
  targetLanguage: string,
};

export type TranslationResult = {
  text: string,
  /** Source language reported by the provider, when available. */
  detectedLanguage?: string,
  targetLanguage: string,
  fromCache: boolean,
};

export type TranslationErrorCode =
  | 'disabled'        // feature toggled off in settings
  | 'not_configured'  // no endpoint configured
  | 'empty_content'   // nothing translatable (only protected tokens)
  | 'unreachable'     // network error / endpoint did not respond
  | 'provider_error'; // endpoint responded with an error

export class TranslationError extends Error {
  code: TranslationErrorCode;

  constructor(code: TranslationErrorCode, message?: string) {
    super(message || code);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Settings (persisted in localStorage, reactive via a Solid store)
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'primal.noteTranslation.settings.v1';
const CACHE_KEY = 'primal.noteTranslation.cache.v1';

export const defaultTranslationSettings = (): TranslationSettings => ({
  enabled: true,
  endpoint: '',
  apiKey: '',
  targetLanguage: '',
});

const readSettings = (): TranslationSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultTranslationSettings();
    return { ...defaultTranslationSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultTranslationSettings();
  }
};

export const [translationSettings, setTranslationSettings] =
  createStore<TranslationSettings>(readSettings());

export const updateTranslationSettings = (patch: Partial<TranslationSettings>) => {
  setTranslationSettings(patch);
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...translationSettings }));
  } catch {
    // storage full/blocked: settings simply won't persist
  }
};

/** The language notes should be translated into, as a primary ISO code. */
export const resolveTargetLanguage = (settings: TranslationSettings = translationSettings): string => {
  const configured = (settings.targetLanguage || '').trim();
  if (configured) return primaryLanguageCode(configured);

  if (typeof navigator !== 'undefined' && navigator.language) {
    return primaryLanguageCode(navigator.language);
  }

  return 'en';
};

/**
 * Accept a LibreTranslate base URL or a full `/translate` URL and return
 * the normalized base, so requests never hit `.../translate/translate`.
 * Returns '' for input that isn't an http(s) URL.
 */
export const normalizeTranslationEndpoint = (raw: string): string => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    url.search = '';
    url.hash = '';
    let path = url.pathname.replace(/\/+$/, '');
    if (path.toLowerCase().endsWith('/translate')) {
      path = path.slice(0, -'/translate'.length);
    }
    url.pathname = path || '/';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
};

// ---------------------------------------------------------------------------
// Provider abstraction
// ---------------------------------------------------------------------------

export type TranslateRequest = {
  text: string,
  /** Source language code, or 'auto' to let the provider detect it. */
  source: string,
  target: string,
  signal?: AbortSignal,
};

export type TranslateResponse = {
  text: string,
  detectedLanguage?: string,
};

export interface TranslationProvider {
  id: string,
  translate: (req: TranslateRequest) => Promise<TranslateResponse>,
  listLanguages: (signal?: AbortSignal) => Promise<{ code: string, name: string }[]>,
}

const extractDetectedLanguage = (data: Record<string, unknown>): string | undefined => {
  const raw = data.detectedLanguage ?? data.detected_language;

  if (typeof raw === 'string' && raw.trim()) return raw.trim().toLowerCase();

  if (raw && typeof raw === 'object') {
    const lang = (raw as Record<string, unknown>).language;
    if (typeof lang === 'string' && lang.trim()) return lang.trim().toLowerCase();
  }

  return undefined;
};

/** LibreTranslate-compatible provider (POST /translate, GET /languages). */
export const createLibreTranslateProvider = (settings: TranslationSettings): TranslationProvider => {
  const base = normalizeTranslationEndpoint(settings.endpoint);
  const apiKey = (settings.apiKey || '').trim();

  const fetchJson = async (path: string, init: RequestInit, signal?: AbortSignal) => {
    let response: Response;
    try {
      response = await fetch(`${base}${path}`, { ...init, signal });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') throw e;
      throw new TranslationError('unreachable');
    }

    let data: Record<string, unknown> = {};
    try {
      data = await response.json();
    } catch {
      // non-JSON error body; handled by the status check below
    }

    if (!response.ok) {
      const detail = typeof data.error === 'string' ? data.error : undefined;
      throw new TranslationError('provider_error', detail);
    }

    return data;
  };

  return {
    id: 'libretranslate',

    translate: async ({ text, source, target, signal }) => {
      const data = await fetchJson('/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: source || 'auto',
          target,
          format: 'text',
          ...(apiKey ? { api_key: apiKey } : {}),
        }),
      }, signal);

      const translated = data.translatedText;
      if (typeof translated !== 'string' || translated.length === 0) {
        throw new TranslationError('provider_error');
      }

      return { text: translated, detectedLanguage: extractDetectedLanguage(data) };
    },

    listLanguages: async (signal) => {
      const data = await fetchJson('/languages', { method: 'GET' }, signal);
      const list = (data as unknown) as { code?: string, name?: string }[];
      if (!Array.isArray(list)) throw new TranslationError('provider_error');
      return list
        .filter(l => typeof l?.code === 'string')
        .map(l => ({ code: l.code as string, name: l.name || (l.code as string) }));
    },
  };
};

/** Build the provider for the given settings (extension point). */
export const createTranslationProvider = (settings: TranslationSettings): TranslationProvider =>
  createLibreTranslateProvider(settings);

// ---------------------------------------------------------------------------
// Translation cache (localStorage, bounded by count and total size)
// ---------------------------------------------------------------------------

type CacheEntry = {
  key: string,
  text: string,
  detectedLanguage?: string,
  target: string,
  savedAt: number,
};

const CACHE_MAX_ENTRIES = 200;
const CACHE_MAX_CHARS = 1024 * 1024;

// cyrb53 — a fast, deterministic string hash. The cache key only needs to
// identify content within this browser; it is not a security boundary.
const hashContent = (value: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
};

const cacheKeyFor = (endpoint: string, target: string, content: string) =>
  hashContent(`${endpoint}|${target}|${content}`);

const readCache = (): CacheEntry[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCache = (entries: CacheEntry[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {
    // storage full/blocked: caching is best-effort
  }
};

export const getCachedTranslation = (endpoint: string, target: string, content: string): CacheEntry | undefined => {
  const key = cacheKeyFor(endpoint, target, content);
  return readCache().find(e => e.key === key);
};

export const cacheTranslation = (endpoint: string, target: string, content: string, result: TranslateResponse) => {
  const key = cacheKeyFor(endpoint, target, content);
  const entry: CacheEntry = {
    key,
    text: result.text,
    detectedLanguage: result.detectedLanguage,
    target,
    savedAt: Date.now(),
  };

  let entries = [entry, ...readCache().filter(e => e.key !== key)].slice(0, CACHE_MAX_ENTRIES);

  while (entries.length > 1 && JSON.stringify(entries).length > CACHE_MAX_CHARS) {
    entries = entries.slice(0, -1);
  }

  writeCache(entries);
};

export const translationCacheCount = (): number => readCache().length;

export const clearTranslationCache = () => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Translate note content into the user's target language.
 *
 * Only ever called from an explicit user action (the Translate button) —
 * note content is never transmitted automatically. Protected tokens are
 * masked before the request and restored afterwards, so the provider only
 * ever sees the note's prose.
 */
export const translateNoteContent = async (
  content: string,
  opts?: { signal?: AbortSignal, settings?: TranslationSettings },
): Promise<TranslationResult> => {
  const settings = opts?.settings || translationSettings;
  const target = resolveTargetLanguage(settings);

  if (!settings.enabled) {
    throw new TranslationError('disabled');
  }

  const endpoint = normalizeTranslationEndpoint(settings.endpoint);
  if (!endpoint) {
    throw new TranslationError('not_configured');
  }

  const original = content || '';
  if (extractProse(original).length === 0) {
    throw new TranslationError('empty_content');
  }

  const cached = getCachedTranslation(endpoint, target, original);
  if (cached) {
    return {
      text: cached.text,
      detectedLanguage: cached.detectedLanguage,
      targetLanguage: target,
      fromCache: true,
    };
  }

  const { text: maskedText, tokens } = maskProtectedTokens(original);

  const provider = createTranslationProvider(settings);
  const response = await provider.translate({
    text: maskedText,
    source: 'auto',
    target,
    signal: opts?.signal,
  });

  const restored = restoreProtectedTokens(response.text, tokens);

  cacheTranslation(endpoint, target, original, {
    text: restored,
    detectedLanguage: response.detectedLanguage,
  });

  return {
    text: restored,
    detectedLanguage: response.detectedLanguage,
    targetLanguage: target,
    fromCache: false,
  };
};
