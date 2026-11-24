export interface TranslationPreferences {
  endpoint: string;
  apiKey: string;
  targetLanguage: string; // 'auto' means follow browser language
}

export interface ProtectedToken {
  placeholder: string;
  original: string;
}

export interface ProtectedContentResult {
  maskedText: string;
  tokens: ProtectedToken[];
  prefix: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  targetLanguage: string;
  fromCache: boolean;
}

export type NoteTranslationErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_ENDPOINT'
  | 'NETWORK_ERROR'
  | 'HTTP_ERROR'
  | 'INVALID_RESPONSE'
  | 'TIMEOUT'
  | 'ABORTED';

export class NoteTranslationError extends Error {
  readonly code: NoteTranslationErrorCode;
  readonly status?: number;

  constructor(code: NoteTranslationErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'NoteTranslationError';
    this.code = code;
    this.status = status;
  }
}

export const TRANSLATION_PREFS_STORAGE_KEY = 'primal_note_translation_prefs';
export const DEFAULT_TRANSLATION_TIMEOUT_MS = 12_000;
export const DEFAULT_TRANSLATION_CACHE_MAX = 200;

export const SUPPORTED_TRANSLATION_LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'auto', label: 'Browser default' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ru', label: 'Русский' },
  { code: 'sr', label: 'Srpski' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'pl', label: 'Polski' },
  { code: 'uk', label: 'Українська' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
];

export const DEFAULT_TRANSLATION_PREFS: TranslationPreferences = {
  endpoint: '',
  apiKey: '',
  targetLanguage: 'auto',
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Validates and normalizes a LibreTranslate-compatible base or /translate endpoint.
 * Allows https:// anywhere, and http:// only for local loopback hosts.
 */
export function normalizeTranslationEndpoint(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const isHttps = parsed.protocol === 'https:';
  const isLocalHttp = parsed.protocol === 'http:' && LOCAL_HOSTS.has(parsed.hostname.toLowerCase());
  if (!isHttps && !isLocalHttp) {
    return null;
  }

  const cleanPath = parsed.pathname.replace(/\/+$/, '');
  const translatePath = cleanPath.endsWith('/translate') ? cleanPath : `${cleanPath}/translate`;
  return `${parsed.origin}${translatePath}`;
}

export function resolveTargetLanguage(preferred: string | undefined, browserLocale?: string): string {
  const cleanedPref = (preferred || '').trim().toLowerCase();
  if (cleanedPref && cleanedPref !== 'auto') {
    return cleanedPref.split(/[-_]/)[0] || 'en';
  }

  const fallbackLocale =
    browserLocale ??
    (typeof navigator !== 'undefined' && typeof navigator.language === 'string'
      ? navigator.language
      : 'en');
  const base = fallbackLocale.trim().toLowerCase().split(/[-_]/)[0];
  return base || 'en';
}

export function loadTranslationPreferences(storage?: Pick<Storage, 'getItem'>): TranslationPreferences {
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (!store) return { ...DEFAULT_TRANSLATION_PREFS };

  try {
    const raw = store.getItem(TRANSLATION_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TRANSLATION_PREFS };
    const parsed = JSON.parse(raw) as Partial<TranslationPreferences>;
    return {
      endpoint: typeof parsed.endpoint === 'string' ? parsed.endpoint.trim() : '',
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : '',
      targetLanguage:
        typeof parsed.targetLanguage === 'string' && parsed.targetLanguage.trim()
          ? parsed.targetLanguage.trim()
          : 'auto',
    };
  } catch {
    return { ...DEFAULT_TRANSLATION_PREFS };
  }
}

export function saveTranslationPreferences(
  prefs: TranslationPreferences,
  storage?: Pick<Storage, 'setItem'>,
): TranslationPreferences {
  const normalized: TranslationPreferences = {
    endpoint: prefs.endpoint.trim(),
    apiKey: prefs.apiKey.trim(),
    targetLanguage: prefs.targetLanguage.trim() || 'auto',
  };
  const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  if (store) {
    try {
      store.setItem(TRANSLATION_PREFS_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }
  return normalized;
}

// Matches Nostr URIs, web/ws URLs, Lightning invoices/URIs, standalone hashtags, and NIP-30 custom emoji.
const PROTECTED_ENTITY_PATTERN =
  /(nostr:(?:npub|nprofile|note|nevent|naddr|nsec)1[02-9ac-hj-np-z]+|(?:https?|wss?):\/\/[^\s<>()]+|lightning:[^\s<>()]+|\blnbc[0-9a-z]+\b|(?<=^|[\s([{"'])#[\p{L}\p{N}_-]+|:[a-zA-Z0-9_-]{2,}:)/giu;

const TRAILING_URL_PUNCTUATION = /[.,;:!?]+$/;

function choosePlaceholderPrefix(text: string): string {
  let nonce = 0;
  let candidate = 'PRIMALNT';
  while (text.includes(candidate)) {
    nonce += 1;
    candidate = `PRIMALNT${nonce}X`;
  }
  return candidate;
}

/**
 * Replaces Nostr references, URLs, Lightning invoices, hashtags, and custom emoji
 * with collision-free indexed tokens before sending text to a translation API.
 */
export function protectNostrEntities(content: string): ProtectedContentResult {
  const prefix = choosePlaceholderPrefix(content);
  const tokens: ProtectedToken[] = [];

  const maskedText = content.replace(PROTECTED_ENTITY_PATTERN, (match) => {
    let entity = match;
    let suffix = '';

    if (/^(?:https?|wss?):\/\//i.test(entity)) {
      const punctMatch = entity.match(TRAILING_URL_PUNCTUATION);
      if (punctMatch) {
        suffix = punctMatch[0];
        entity = entity.slice(0, -suffix.length);
      }
    }

    const index = tokens.length;
    const placeholder = `[[${prefix}_${index}]]`;
    tokens.push({ placeholder, original: entity });
    return `${placeholder}${suffix}`;
  });

  return { maskedText, tokens, prefix };
}

/**
 * Restores protected Nostr entities in a single pass so restored strings
 * can never trigger secondary placeholder substitution.
 */
export function restoreNostrEntities(
  translated: string,
  tokens: ReadonlyArray<ProtectedToken>,
  prefix: string,
): string {
  if (tokens.length === 0) return translated;
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const restoreRegex = new RegExp(`\\[\\[${escapedPrefix}_(\\d+)\\]\\]`, 'g');

  return translated.replace(restoreRegex, (full, idxStr: string) => {
    const idx = Number(idxStr);
    if (Number.isInteger(idx) && idx >= 0 && idx < tokens.length) {
      return tokens[idx].original;
    }
    return full;
  });
}

/**
 * Returns true if the note contains meaningful natural-language text beyond
 * Nostr mentions, URLs, hashtags, custom emoji, numbers, and punctuation.
 */
export function hasTranslatableText(content: string | undefined | null): boolean {
  if (!content) return false;
  const stripped = content.replace(PROTECTED_ENTITY_PATTERN, ' ');
  const letters = stripped.match(/\p{L}/gu);
  return (letters?.length ?? 0) >= 2;
}

/**
 * Deterministic 64-bit FNV-1a hex digest for cache keying (synchronous, zero crypto dependency).
 */
export function hashTranslationContent(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= (c + i) & 0xffff;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export class TranslationCache {
  private readonly maxEntries: number;
  private readonly map = new Map<string, Omit<TranslationResult, 'fromCache'>>();

  constructor(maxEntries = DEFAULT_TRANSLATION_CACHE_MAX) {
    this.maxEntries = Math.max(1, maxEntries);
  }

  get size(): number {
    return this.map.size;
  }

  get(key: string): Omit<TranslationResult, 'fromCache'> | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    // Refresh recency for LRU ordering
    this.map.delete(key);
    this.map.set(key, hit);
    return hit;
  }

  set(key: string, value: Omit<TranslationResult, 'fromCache'>): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }
    this.map.set(key, value);
  }

  clear(): void {
    this.map.clear();
  }
}

export const noteTranslationCache = new TranslationCache();

export function buildTranslationCacheKey(endpoint: string, targetLanguage: string, content: string): string {
  return `${endpoint}|${targetLanguage}|${hashTranslationContent(content)}`;
}

export function formatLanguageName(code: string | undefined, displayLocale = 'en'): string {
  if (!code) return '';
  const clean = code.trim().toLowerCase();
  if (!clean) return '';

  try {
    if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
      const dn = new Intl.DisplayNames([displayLocale], { type: 'language' });
      const resolved = dn.of(clean);
      if (resolved) return resolved;
    }
  } catch {
    // Fall back to uppercase ISO code
  }

  return clean.toUpperCase();
}

export interface TranslateNoteOptions {
  fetchImpl?: typeof fetch;
  cache?: TranslationCache;
  signal?: AbortSignal;
  timeoutMs?: number;
  browserLocale?: string;
}

export async function translateNoteContent(
  content: string,
  prefs: TranslationPreferences,
  options: TranslateNoteOptions = {},
): Promise<TranslationResult> {
  if (!prefs.endpoint.trim()) {
    throw new NoteTranslationError('NOT_CONFIGURED', 'Translation service endpoint is not configured.');
  }

  const endpointUrl = normalizeTranslationEndpoint(prefs.endpoint);
  if (!endpointUrl) {
    throw new NoteTranslationError(
      'INVALID_ENDPOINT',
      'Translation endpoint must use https:// (or http://localhost for local instances).',
    );
  }

  const targetLanguage = resolveTargetLanguage(prefs.targetLanguage, options.browserLocale);
  const cache = options.cache ?? noteTranslationCache;
  const cacheKey = buildTranslationCacheKey(endpointUrl, targetLanguage, content);

  const cached = cache.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const { maskedText, tokens, prefix } = protectNostrEntities(content);
  const fetchFn = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TRANSLATION_TIMEOUT_MS;

  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      throw new NoteTranslationError('ABORTED', 'Translation request was cancelled.');
    }
    options.signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const payload: Record<string, string> = {
      q: maskedText,
      source: 'auto',
      target: targetLanguage,
      format: 'text',
    };
    if (prefs.apiKey.trim()) {
      payload.api_key = prefs.apiKey.trim();
    }

    const response = await fetchFn(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new NoteTranslationError(
        'HTTP_ERROR',
        `Translation service returned HTTP ${response.status}.`,
        response.status,
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new NoteTranslationError('INVALID_RESPONSE', 'Translation service returned invalid JSON.');
    }

    if (
      !data ||
      typeof data !== 'object' ||
      typeof (data as { translatedText?: unknown }).translatedText !== 'string'
    ) {
      throw new NoteTranslationError(
        'INVALID_RESPONSE',
        'Translation service response is missing translatedText.',
      );
    }

    const rawTranslated = (data as { translatedText: string }).translatedText;
    const detectedObj = (data as { detectedLanguage?: { language?: unknown } }).detectedLanguage;
    const detectedLanguage =
      typeof detectedObj?.language === 'string' && detectedObj.language.trim()
        ? detectedObj.language.trim().toLowerCase()
        : undefined;

    const restoredText = restoreNostrEntities(rawTranslated, tokens, prefix);
    const entry: Omit<TranslationResult, 'fromCache'> = {
      translatedText: restoredText,
      detectedLanguage,
      targetLanguage,
    };

    cache.set(cacheKey, entry);
    return { ...entry, fromCache: false };
  } catch (err) {
    if (err instanceof NoteTranslationError) {
      throw err;
    }
    if (timedOut) {
      throw new NoteTranslationError('TIMEOUT', 'Translation request timed out.');
    }
    if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
      throw new NoteTranslationError('ABORTED', 'Translation request was cancelled.');
    }
    throw new NoteTranslationError(
      'NETWORK_ERROR',
      err instanceof Error ? err.message : 'Unable to reach translation service.',
    );
  } finally {
    clearTimeout(timer);
    if (options.signal) {
      options.signal.removeEventListener('abort', onExternalAbort);
    }
  }
}
