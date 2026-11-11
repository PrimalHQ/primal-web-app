// Client-side post translation.
//
// The translation provider is any LibreTranslate-compatible HTTP API
// (default: the public Argos Translate demo instance). No API key is
// required for the default endpoint; a custom endpoint and an optional
// API key can be configured on the Translation settings page.
//
// Before a note is sent to the provider, Nostr entities (references,
// links, hashtags, mentions, invoices, tokens and addresses) are replaced
// with placeholders so the translation service cannot mangle them, and
// restored afterwards. Translations are cached in localStorage, keyed by
// a hash of endpoint + target language + source text, so the same note is
// never translated twice.

export type TranslationSettings = {
  endpoint: string,
  apiKey?: string,
  targetLang?: string,
};

export type TranslationResult = {
  text: string,
  detectedLanguage?: string,
};

export const DEFAULT_TRANSLATE_ENDPOINT = 'https://translate.argosopentech.com';

const SETTINGS_KEY = 'primal.translate.settings';
const CACHE_KEY = 'primal.translate.cache';
const MAX_CACHE_ENTRIES = 200;
const REQUEST_TIMEOUT_MS = 15000;

const ENTITY_PLACEHOLDER = (index: number) => `__PRIMAL${index}__`;
const ENTITY_PLACEHOLDER_REGEX = /__PRIMAL(\d+)__/g;

// One pass over the text, longest / most specific patterns first, so a
// URL that contains a bech32 string is kept as a single entity.
const ENTITY_REGEX = new RegExp([
  'https?:\\/\\/\\S+',
  'nostr:(?:npub|nprofile|note|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+',
  '(?:npub|nprofile|note|nevent|naddr)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+',
  'lnbc[0-9a-z]+',
  'lnurl1[0-9a-z]+',
  'cashu[AB][0-9a-zA-Z]+',
  'bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,}',
  '#\\[[0-9]+\\]',
  '#[\\p{L}\\p{N}_]+',
].join('|'), 'giu');

export const protectEntities = (text: string): { text: string, entities: string[] } => {
  const entities: string[] = [];

  const protectedText = text.replace(ENTITY_REGEX, (match) => {
    entities.push(match);
    return ENTITY_PLACEHOLDER(entities.length - 1);
  });

  return { text: protectedText, entities };
};

export const restoreEntities = (text: string, entities: string[]): string => {
  return text.replace(ENTITY_PLACEHOLDER_REGEX, (_, index: string) => {
    const entity = entities[Number(index)];
    return entity === undefined ? _ : entity;
  });
};

// Text that is left after removing protected entities. A note only
// shows a Translate control when this contains at least one letter.
export const translatableText = (text: string): string => {
  return protectEntities(text).text
    .replace(ENTITY_PLACEHOLDER_REGEX, '')
    .replace(/[\s\d\p{P}]/gu, '');
};

export const isTranslatable = (text: string): boolean => {
  return translatableText(text).length > 0;
};

// 'en-US' -> 'en', 'zh-Hant' -> 'zh', 'pt-BR' -> 'pt'.
export const normalizeLanguageCode = (code: string): string => {
  return (code || '').trim().toLowerCase().split(/[-_]/)[0];
};

// Preferred target language for translations: an explicitly configured
// language wins, then the app language, then the browser language.
export const resolveTargetLanguage = (appLocale?: string): string => {
  const settings = getTranslationSettings();

  if (settings.targetLang) {
    return normalizeLanguageCode(settings.targetLang);
  }

  if (appLocale) {
    return normalizeLanguageCode(appLocale);
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeLanguageCode(navigator.language);
  }

  return 'en';
};

export const getTranslationSettings = (): TranslationSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { endpoint: DEFAULT_TRANSLATE_ENDPOINT };
    }

    const parsed = JSON.parse(raw) as Partial<TranslationSettings>;

    return {
      endpoint: (parsed.endpoint || '').trim() || DEFAULT_TRANSLATE_ENDPOINT,
      apiKey: (parsed.apiKey || '').trim() || undefined,
      targetLang: (parsed.targetLang || '').trim() || undefined,
    };
  } catch (e) {
    return { endpoint: DEFAULT_TRANSLATE_ENDPOINT };
  }
};

export const saveTranslationSettings = (settings: TranslationSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      endpoint: (settings.endpoint || '').trim() || DEFAULT_TRANSLATE_ENDPOINT,
      apiKey: (settings.apiKey || '').trim() || undefined,
      targetLang: (settings.targetLang || '').trim() || undefined,
    }));
  } catch (e) {
    // Storage unavailable (private mode, quota) - settings simply do not persist.
  }
};

export const resetTranslationSettings = (): void => {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (e) {
    // Nothing to reset.
  }
};

// FNV-1a hash, hex encoded. Used only as a cache key.
export const hashText = (value: string): string => {
  let hash = 0x811c9dc5;

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16);
};

type CacheEntry = {
  text: string,
  detectedLanguage?: string,
};

const readCache = (): Record<string, CacheEntry> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') as Record<string, CacheEntry>;
  } catch (e) {
    return {};
  }
};

const writeCache = (cache: Record<string, CacheEntry>): void => {
  try {
    const keys = Object.keys(cache);

    // Bounded cache: drop the oldest entries first.
    while (keys.length > MAX_CACHE_ENTRIES) {
      delete cache[keys.shift() as string];
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    // Storage unavailable (private mode, quota) - caching is best effort.
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (ignored) {
      // Nothing to clear.
    }
  }
};

export const translateText = async (
  text: string,
  targetLang: string,
): Promise<TranslationResult> => {
  const settings = getTranslationSettings();
  const endpoint = settings.endpoint.replace(/\/+$/, '');
  const target = normalizeLanguageCode(targetLang);

  const { text: protectedText, entities } = protectEntities(text);
  const cacheKey = hashText(`${endpoint}|${target}|${protectedText}`);

  const cached = readCache()[cacheKey];
  if (cached) {
    return { text: restoreEntities(cached.text, entities), detectedLanguage: cached.detectedLanguage };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${endpoint}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: protectedText,
        source: 'auto',
        target,
        format: 'text',
        ...(settings.apiKey ? { api_key: settings.apiKey } : {}),
      }),
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error('Translation service is unreachable');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error('Translation service returned an error');
  }

  let payload: { translatedText?: string, detectedLanguage?: { language?: string } | string };
  try {
    payload = await response.json();
  } catch (e) {
    throw new Error('Translation service returned an invalid response');
  }

  if (!payload || typeof payload.translatedText !== 'string') {
    throw new Error('Translation service returned an invalid response');
  }

  const detected = typeof payload.detectedLanguage === 'string'
    ? payload.detectedLanguage
    : payload.detectedLanguage?.language;

  const result: TranslationResult = {
    text: restoreEntities(payload.translatedText, entities),
    detectedLanguage: detected ? normalizeLanguageCode(detected) : undefined,
  };

  const cache = readCache();
  cache[cacheKey] = { text: payload.translatedText, detectedLanguage: result.detectedLanguage };
  writeCache(cache);

  return result;
};

// Languages offered on the Translation settings page.
export const TRANSLATION_LANGUAGES: { code: string, name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish / Español' },
  { code: 'fr', name: 'French / Français' },
  { code: 'de', name: 'German / Deutsch' },
  { code: 'pt', name: 'Portuguese / Português' },
  { code: 'it', name: 'Italian / Italiano' },
  { code: 'nl', name: 'Dutch / Nederlands' },
  { code: 'sv', name: 'Swedish / Svenska' },
  { code: 'da', name: 'Danish / Dansk' },
  { code: 'fi', name: 'Finnish / Suomi' },
  { code: 'pl', name: 'Polish / Polski' },
  { code: 'cs', name: 'Czech / Čeština' },
  { code: 'sk', name: 'Slovak / Slovenčina' },
  { code: 'hu', name: 'Hungarian / Magyar' },
  { code: 'ro', name: 'Romanian / Română' },
  { code: 'bg', name: 'Bulgarian / Български' },
  { code: 'uk', name: 'Ukrainian / Українська' },
  { code: 'ru', name: 'Russian / Русский' },
  { code: 'el', name: 'Greek / Ελληνικά' },
  { code: 'tr', name: 'Turkish / Türkçe' },
  { code: 'ar', name: 'Arabic / العربية' },
  { code: 'fa', name: 'Persian / فارسی' },
  { code: 'he', name: 'Hebrew / עברית' },
  { code: 'hi', name: 'Hindi / हिन्दी' },
  { code: 'id', name: 'Indonesian / Bahasa Indonesia' },
  { code: 'vi', name: 'Vietnamese / Tiếng Việt' },
  { code: 'th', name: 'Thai / ไทย' },
  { code: 'ja', name: 'Japanese / 日本語' },
  { code: 'ko', name: 'Korean / 한국어' },
  { code: 'zh', name: 'Chinese / 中文' },
];
