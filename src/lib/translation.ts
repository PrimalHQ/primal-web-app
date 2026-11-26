import {
  isSameLanguage,
  normalizeLanguageTag,
  restoreNoteContent,
  shieldNoteContent,
  shouldOfferTranslation,
  toGoogleTranslateLanguage,
  toLibreTranslateLanguage,
} from './translationSanitizer';

export type TranslationProvider = 'none' | 'browser' | 'libretranslate' | 'google';

export type TranslationSettings = {
  provider: TranslationProvider;
  targetLanguage: string;
  libreTranslateUrl: string;
  libreTranslateApiKey: string;
  googleApiKey: string;
};

export type TranslationResult = {
  translatedText: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  provider: Exclude<TranslationProvider, 'none'>;
  alreadyInTargetLanguage: boolean;
  cached: boolean;
};

export type TranslationErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_ENDPOINT'
  | 'MISSING_API_KEY'
  | 'BROWSER_UNSUPPORTED'
  | 'EMPTY_PROSE'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE';

export class TranslationError extends Error {
  readonly code: TranslationErrorCode;
  readonly status?: number;

  constructor(code: TranslationErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'TranslationError';
    this.code = code;
    this.status = status;
  }
}

export type LanguageOption = {
  code: string;
  label: string;
};

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'auto', label: 'Browser default' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'pt', label: 'Portuguese (Português)' },
  { code: 'fr', label: 'French (Français)' },
  { code: 'de', label: 'German (Deutsch)' },
  { code: 'it', label: 'Italian (Italiano)' },
  { code: 'nl', label: 'Dutch (Nederlands)' },
  { code: 'ru', label: 'Russian (Русский)' },
  { code: 'uk', label: 'Ukrainian (Українська)' },
  { code: 'pl', label: 'Polish (Polski)' },
  { code: 'tr', label: 'Turkish (Türkçe)' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'he', label: 'Hebrew (עברית)' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'ja', label: 'Japanese (日本語)' },
  { code: 'ko', label: 'Korean (한국어)' },
  { code: 'zh-Hans', label: 'Chinese Simplified (简体中文)' },
  { code: 'zh-Hant', label: 'Chinese Traditional (繁體中文)' },
  { code: 'vi', label: 'Vietnamese (Tiếng Việt)' },
  { code: 'th', label: 'Thai (ไทย)' },
  { code: 'id', label: 'Indonesian (Bahasa Indonesia)' },
  { code: 'sv', label: 'Swedish (Svenska)' },
  { code: 'no', label: 'Norwegian (Norsk)' },
  { code: 'da', label: 'Danish (Dansk)' },
  { code: 'fi', label: 'Finnish (Suomi)' },
  { code: 'cs', label: 'Czech (Čeština)' },
  { code: 'el', label: 'Greek (Ελληνικά)' },
];

export const DEFAULT_TRANSLATION_SETTINGS: TranslationSettings = {
  provider: 'none',
  targetLanguage: 'auto',
  libreTranslateUrl: '',
  libreTranslateApiKey: '',
  googleApiKey: '',
};

export const TRANSLATION_SETTINGS_STORAGE_KEY = 'primal_translation_settings_v1';
export const TRANSLATION_CACHE_STORAGE_KEY = 'primal_translation_cache_v1';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_CACHE_MAX_ENTRIES = 200;
const DEFAULT_CACHE_MAX_BYTES = 256 * 1024;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

type BrowserTranslatorInstance = {
  translate: (text: string, options?: { signal?: AbortSignal }) => Promise<string>;
  destroy?: () => void;
};

type BrowserTranslatorAPI = {
  availability?: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<string>;
  create: (options: {
    sourceLanguage: string;
    targetLanguage: string;
    signal?: AbortSignal;
  }) => Promise<BrowserTranslatorInstance>;
};

type BrowserLanguageDetectorInstance = {
  detect: (
    text: string,
    options?: { signal?: AbortSignal },
  ) => Promise<Array<{ detectedLanguage: string; confidence?: number }>>;
  destroy?: () => void;
};

type BrowserLanguageDetectorAPI = {
  availability?: () => Promise<string>;
  create: (options?: { signal?: AbortSignal }) => Promise<BrowserLanguageDetectorInstance>;
};

export type TranslateOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  cache?: TranslationCache;
  navigatorLanguages?: readonly string[];
  browserTranslator?: BrowserTranslatorAPI;
  browserLanguageDetector?: BrowserLanguageDetectorAPI;
};

export const getBrowserDefaultLanguage = (navigatorLanguages?: readonly string[]): string => {
  const candidates = navigatorLanguages ??
    (typeof navigator !== 'undefined'
      ? (navigator.languages?.length ? navigator.languages : [navigator.language])
      : []);

  for (const lang of candidates) {
    if (lang && lang.trim().length > 0) {
      return normalizeLanguageTag(lang);
    }
  }

  return 'en';
};

export const resolveTargetLanguage = (
  targetLanguage: string,
  navigatorLanguages?: readonly string[],
): string => {
  if (!targetLanguage || targetLanguage === 'auto') {
    return getBrowserDefaultLanguage(navigatorLanguages);
  }
  return normalizeLanguageTag(targetLanguage);
};

/**
 * Validates and normalizes a LibreTranslate base URL.
 * Requires HTTPS for remote endpoints; permits HTTP only for loopback hosts.
 */
export const normalizeLibreTranslateBaseUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new TranslationError(
      'INVALID_ENDPOINT',
      'Enter a valid LibreTranslate endpoint URL.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new TranslationError(
      'INVALID_ENDPOINT',
      'Invalid LibreTranslate URL format.',
    );
  }

  if (parsed.username || parsed.password) {
    throw new TranslationError(
      'INVALID_ENDPOINT',
      'Endpoint URL must not contain embedded credentials.',
    );
  }

  if (parsed.search || parsed.hash) {
    throw new TranslationError(
      'INVALID_ENDPOINT',
      'Endpoint URL must not contain query parameters or fragments.',
    );
  }

  const isHttps = parsed.protocol === 'https:';
  const isLoopbackHttp =
    parsed.protocol === 'http:' && LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase());

  if (!isHttps && !isLoopbackHttp) {
    throw new TranslationError(
      'INVALID_ENDPOINT',
      'Remote translation endpoints must use HTTPS (HTTP is allowed only for localhost).',
    );
  }

  let pathname = parsed.pathname.replace(/\/+$/, '');
  if (pathname.toLowerCase().endsWith('/translate')) {
    pathname = pathname.slice(0, -'/translate'.length);
  }

  return `${parsed.origin}${pathname}`;
};

export const isBrowserTranslatorAvailable = (
  override?: BrowserTranslatorAPI,
): boolean => {
  const api = override ?? (globalThis as { Translator?: BrowserTranslatorAPI }).Translator;
  return Boolean(api && typeof api.create === 'function');
};

export const isTranslationSettingsReady = (
  settings: TranslationSettings,
  browserTranslator?: BrowserTranslatorAPI,
): boolean => {
  if (settings.provider === 'none') return false;
  if (settings.provider === 'browser') {
    return isBrowserTranslatorAvailable(browserTranslator);
  }
  if (settings.provider === 'libretranslate') {
    try {
      normalizeLibreTranslateBaseUrl(settings.libreTranslateUrl);
      return true;
    } catch {
      return false;
    }
  }
  if (settings.provider === 'google') {
    return settings.googleApiKey.trim().length > 0;
  }
  return false;
};

/**
 * Deterministic 64-bit FNV-1a content hash (dual 32-bit lanes, zero deps,
 * works synchronously in both HTTPS and localhost environments).
 */
export const hashContent = (input: string): string => {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code ^ (i & 0xff);
    h2 = Math.imul(h2, 0x85ebca6b);
  }

  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
};

type CachedEntry = {
  translatedText: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
  provider: Exclude<TranslationProvider, 'none'>;
  alreadyInTargetLanguage: boolean;
  cachedAt: number;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export class TranslationCache {
  private readonly entries = new Map<string, CachedEntry>();
  private readonly maxEntries: number;
  private readonly maxBytes: number;
  private readonly storageKey: string;
  private readonly storage?: StorageLike;
  private loaded = false;

  constructor(options?: {
    maxEntries?: number;
    maxBytes?: number;
    storageKey?: string;
    storage?: StorageLike | null;
  }) {
    this.maxEntries = options?.maxEntries ?? DEFAULT_CACHE_MAX_ENTRIES;
    this.maxBytes = options?.maxBytes ?? DEFAULT_CACHE_MAX_BYTES;
    this.storageKey = options?.storageKey ?? TRANSLATION_CACHE_STORAGE_KEY;
    if (options && 'storage' in options) {
      this.storage = options.storage ?? undefined;
    } else if (typeof localStorage !== 'undefined') {
      this.storage = localStorage;
    }
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (!this.storage) return;

    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      for (const item of parsed) {
        if (
          Array.isArray(item) &&
          item.length === 2 &&
          typeof item[0] === 'string' &&
          item[1] &&
          typeof item[1].translatedText === 'string' &&
          typeof item[1].targetLanguage === 'string' &&
          typeof item[1].provider === 'string'
        ) {
          this.entries.set(item[0], item[1] as CachedEntry);
        }
      }
      this.evictToBounds();
    } catch {
      this.entries.clear();
    }
  }

  private evictToBounds(): void {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }

  private persist(): void {
    if (!this.storage) return;
    this.evictToBounds();

    try {
      let serialized = JSON.stringify(Array.from(this.entries.entries()));
      while (serialized.length > this.maxBytes && this.entries.size > 0) {
        const oldestKey = this.entries.keys().next().value;
        if (oldestKey === undefined) break;
        this.entries.delete(oldestKey);
        serialized = JSON.stringify(Array.from(this.entries.entries()));
      }
      this.storage.setItem(this.storageKey, serialized);
    } catch {
      // Ignore quota or private-browsing storage errors
    }
  }

  get(key: string): CachedEntry | undefined {
    this.ensureLoaded();
    const hit = this.entries.get(key);
    if (!hit) return undefined;

    // Refresh LRU recency
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit;
  }

  set(key: string, value: CachedEntry): void {
    this.ensureLoaded();
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }
    this.entries.set(key, value);
    this.evictToBounds();
    this.persist();
  }

  clear(): void {
    this.loaded = true;
    this.entries.clear();
    try {
      this.storage?.removeItem(this.storageKey);
    } catch {
      // Ignore storage errors
    }
  }

  size(): number {
    this.ensureLoaded();
    return this.entries.size;
  }
}

export const defaultTranslationCache = new TranslationCache();

export const clearTranslationCache = (): void => {
  defaultTranslationCache.clear();
};

export const getTranslationCacheSize = (): number => {
  return defaultTranslationCache.size();
};

export const buildTranslationCacheKey = (
  provider: Exclude<TranslationProvider, 'none'>,
  endpoint: string,
  targetLanguage: string,
  content: string,
): string => {
  return `${provider}|${endpoint}|${normalizeLanguageTag(targetLanguage)}|${hashContent(content)}`;
};

const createTimedSignal = (
  timeoutMs: number,
  externalSignal?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void; didTimeout: () => boolean } => {
  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const cleanup = () => {
    clearTimeout(timer);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  };

  return {
    signal: controller.signal,
    cleanup,
    didTimeout: () => timedOut,
  };
};

const translateWithLibreTranslate = async (
  shieldedText: string,
  targetLanguage: string,
  baseUrl: string,
  apiKey: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<{ translatedText: string; detectedSourceLanguage?: string }> => {
  const payload: Record<string, string> = {
    q: shieldedText,
    source: 'auto',
    target: toLibreTranslateLanguage(targetLanguage),
    format: 'text',
  };

  const trimmedKey = apiKey.trim();
  if (trimmedKey) {
    payload.api_key = trimmedKey;
  }

  const response = await fetchImpl(`${baseUrl}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let detail = `Translation server returned HTTP ${response.status}.`;
    try {
      const errBody = await response.json();
      if (errBody && typeof errBody.error === 'string' && errBody.error.trim()) {
        detail = errBody.error.trim();
      }
    } catch {
      // Keep status message
    }
    throw new TranslationError('HTTP_ERROR', detail, response.status);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new TranslationError(
      'INVALID_RESPONSE',
      'Translation server returned invalid JSON.',
    );
  }

  const record = data as {
    translatedText?: unknown;
    detectedLanguage?: { language?: unknown } | string;
  };

  if (!record || typeof record.translatedText !== 'string') {
    throw new TranslationError(
      'INVALID_RESPONSE',
      'Translation server response did not include translated text.',
    );
  }

  let detected: string | undefined;
  if (typeof record.detectedLanguage === 'string' && record.detectedLanguage.trim()) {
    detected = normalizeLanguageTag(record.detectedLanguage);
  } else if (
    record.detectedLanguage &&
    typeof record.detectedLanguage === 'object' &&
    typeof record.detectedLanguage.language === 'string' &&
    record.detectedLanguage.language.trim()
  ) {
    detected = normalizeLanguageTag(record.detectedLanguage.language);
  }

  return {
    translatedText: record.translatedText,
    detectedSourceLanguage: detected,
  };
};

const translateWithGoogleCloud = async (
  shieldedText: string,
  targetLanguage: string,
  apiKey: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<{ translatedText: string; detectedSourceLanguage?: string }> => {
  const response = await fetchImpl(
    'https://translation.googleapis.com/language/translate/v2',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-goog-api-key': apiKey.trim(),
      },
      body: JSON.stringify({
        q: shieldedText,
        target: toGoogleTranslateLanguage(targetLanguage),
        format: 'text',
      }),
      signal,
    },
  );

  if (!response.ok) {
    let detail = `Google Cloud Translation returned HTTP ${response.status}.`;
    try {
      const errBody = await response.json();
      const apiMsg = errBody?.error?.message;
      if (typeof apiMsg === 'string' && apiMsg.trim()) {
        detail = apiMsg.trim();
      }
    } catch {
      // Keep status message
    }
    throw new TranslationError('HTTP_ERROR', detail, response.status);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new TranslationError(
      'INVALID_RESPONSE',
      'Google Cloud Translation returned invalid JSON.',
    );
  }

  const first = (data as {
    data?: {
      translations?: Array<{
        translatedText?: unknown;
        detectedSourceLanguage?: unknown;
      }>;
    };
  })?.data?.translations?.[0];

  if (!first || typeof first.translatedText !== 'string') {
    throw new TranslationError(
      'INVALID_RESPONSE',
      'Google Cloud Translation response did not include translated text.',
    );
  }

  const detected =
    typeof first.detectedSourceLanguage === 'string' && first.detectedSourceLanguage.trim()
      ? normalizeLanguageTag(first.detectedSourceLanguage)
      : undefined;

  return {
    translatedText: first.translatedText,
    detectedSourceLanguage: detected,
  };
};

const translateWithBrowserApi = async (
  shieldedText: string,
  proseForDetection: string,
  targetLanguage: string,
  signal: AbortSignal,
  translatorOverride?: BrowserTranslatorAPI,
  detectorOverride?: BrowserLanguageDetectorAPI,
): Promise<{ translatedText: string; detectedSourceLanguage?: string; alreadyInTarget?: boolean }> => {
  const translatorApi =
    translatorOverride ?? (globalThis as { Translator?: BrowserTranslatorAPI }).Translator;
  const detectorApi =
    detectorOverride ??
    (globalThis as { LanguageDetector?: BrowserLanguageDetectorAPI }).LanguageDetector;

  if (!translatorApi || typeof translatorApi.create !== 'function') {
    throw new TranslationError(
      'BROWSER_UNSUPPORTED',
      'On-device browser translation is not supported in this browser.',
    );
  }

  let sourceLanguage: string | undefined;

  if (detectorApi && typeof detectorApi.create === 'function') {
    const availability = detectorApi.availability
      ? await detectorApi.availability()
      : 'available';

    if (availability !== 'unavailable') {
      const detector = await detectorApi.create({ signal });
      try {
        const results = await detector.detect(proseForDetection, { signal });
        const top = results.find(
          (entry) => entry.detectedLanguage && entry.detectedLanguage !== 'und',
        );
        if (top) {
          sourceLanguage = normalizeLanguageTag(top.detectedLanguage);
        }
      } finally {
        detector.destroy?.();
      }
    }
  }

  if (!sourceLanguage) {
    throw new TranslationError(
      'BROWSER_UNSUPPORTED',
      'Could not detect the source language on-device in this browser.',
    );
  }

  const normalizedTarget = normalizeLanguageTag(targetLanguage);
  if (isSameLanguage(sourceLanguage, normalizedTarget)) {
    return {
      translatedText: shieldedText,
      detectedSourceLanguage: sourceLanguage,
      alreadyInTarget: true,
    };
  }

  if (translatorApi.availability) {
    const avail = await translatorApi.availability({
      sourceLanguage,
      targetLanguage: normalizedTarget,
    });
    if (avail === 'unavailable') {
      throw new TranslationError(
        'BROWSER_UNSUPPORTED',
        `On-device translation from ${sourceLanguage} to ${normalizedTarget} is unavailable in this browser.`,
      );
    }
  }

  const translator = await translatorApi.create({
    sourceLanguage,
    targetLanguage: normalizedTarget,
    signal,
  });

  try {
    const translatedText = await translator.translate(shieldedText, { signal });
    return {
      translatedText,
      detectedSourceLanguage: sourceLanguage,
    };
  } finally {
    translator.destroy?.();
  }
};

export const translateNoteContent = async (
  content: string,
  settings: TranslationSettings,
  options?: TranslateOptions,
): Promise<TranslationResult> => {
  if (!shouldOfferTranslation(content)) {
    throw new TranslationError(
      'EMPTY_PROSE',
      'This note does not contain translatable text.',
    );
  }

  if (settings.provider === 'none') {
    throw new TranslationError(
      'NOT_CONFIGURED',
      'Translation is not configured yet.',
    );
  }

  const resolvedTarget = resolveTargetLanguage(
    settings.targetLanguage,
    options?.navigatorLanguages,
  );

  let endpointKey = settings.provider;
  let libreBaseUrl = '';

  if (settings.provider === 'libretranslate') {
    libreBaseUrl = normalizeLibreTranslateBaseUrl(settings.libreTranslateUrl);
    endpointKey = libreBaseUrl;
  } else if (settings.provider === 'google') {
    if (!settings.googleApiKey.trim()) {
      throw new TranslationError(
        'MISSING_API_KEY',
        'Add your Google Cloud Translation API key in Settings.',
      );
    }
    endpointKey = 'https://translation.googleapis.com/language/translate/v2';
  } else if (settings.provider === 'browser') {
    if (!isBrowserTranslatorAvailable(options?.browserTranslator)) {
      throw new TranslationError(
        'BROWSER_UNSUPPORTED',
        'On-device browser translation is not supported in this browser.',
      );
    }
    endpointKey = 'browser';
  }

  const cache = options?.cache ?? defaultTranslationCache;
  const cacheKey = buildTranslationCacheKey(
    settings.provider,
    endpointKey,
    resolvedTarget,
    content,
  );

  const cached = cache.get(cacheKey);
  if (cached) {
    return {
      translatedText: cached.translatedText,
      detectedSourceLanguage: cached.detectedSourceLanguage,
      targetLanguage: cached.targetLanguage,
      provider: cached.provider,
      alreadyInTargetLanguage: cached.alreadyInTargetLanguage,
      cached: true,
    };
  }

  const shielded = shieldNoteContent(content);
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { signal, cleanup, didTimeout } = createTimedSignal(timeoutMs, options?.signal);
  const fetchImpl = options?.fetchImpl ?? fetch;

  try {
    let providerOutput: {
      translatedText: string;
      detectedSourceLanguage?: string;
      alreadyInTarget?: boolean;
    };

    if (settings.provider === 'libretranslate') {
      providerOutput = await translateWithLibreTranslate(
        shielded.shieldedText,
        resolvedTarget,
        libreBaseUrl,
        settings.libreTranslateApiKey,
        fetchImpl,
        signal,
      );
    } else if (settings.provider === 'google') {
      providerOutput = await translateWithGoogleCloud(
        shielded.shieldedText,
        resolvedTarget,
        settings.googleApiKey,
        fetchImpl,
        signal,
      );
    } else {
      const placeholderRegex = new RegExp(`\\[\\[${shielded.prefix}_\\d+\\]\\]`, 'g');
      const proseOnly = shielded.shieldedText.replace(placeholderRegex, ' ').trim();
      providerOutput = await translateWithBrowserApi(
        shielded.shieldedText,
        proseOnly,
        resolvedTarget,
        signal,
        options?.browserTranslator,
        options?.browserLanguageDetector,
      );
    }

    const restoredText = restoreNoteContent(providerOutput.translatedText, shielded);
    const alreadyInTargetLanguage =
      providerOutput.alreadyInTarget === true ||
      isSameLanguage(providerOutput.detectedSourceLanguage, resolvedTarget);

    const result: TranslationResult = {
      translatedText: restoredText,
      detectedSourceLanguage: providerOutput.detectedSourceLanguage,
      targetLanguage: resolvedTarget,
      provider: settings.provider,
      alreadyInTargetLanguage,
      cached: false,
    };

    cache.set(cacheKey, {
      translatedText: result.translatedText,
      detectedSourceLanguage: result.detectedSourceLanguage,
      targetLanguage: result.targetLanguage,
      provider: result.provider,
      alreadyInTargetLanguage: result.alreadyInTargetLanguage,
      cachedAt: Date.now(),
    });

    return result;
  } catch (err) {
    if (err instanceof TranslationError) {
      throw err;
    }

    if (didTimeout()) {
      throw new TranslationError(
        'TIMEOUT',
        'Translation request timed out. Please try again.',
      );
    }

    if (
      options?.signal?.aborted ||
      (err instanceof Error && err.name === 'AbortError')
    ) {
      throw new TranslationError('ABORTED', 'Translation request cancelled.');
    }

    throw new TranslationError(
      'NETWORK_ERROR',
      'Unable to reach the translation service. Check your endpoint and CORS configuration.',
    );
  } finally {
    cleanup();
  }
};
