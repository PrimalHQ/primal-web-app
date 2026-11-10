// Inline note translation.
//
// Notes are translated through a LibreTranslate-compatible HTTP API. The note
// text is split around everything that must survive untouched (links, Nostr
// references, hashtags, invoices...) and only the plain text in between is
// sent to the translation service, so those entities can never be mangled.

export type TranslationSettings = {
  enabled: boolean,
  endpoint: string,
  apiKey: string,
  // Empty string means "follow the browser language"
  targetLanguage: string,
};

export type TranslationResult = {
  text: string,
  detectedLanguage: string,
  targetLanguage: string,
};

export type TranslationSegment = {
  text: string,
  translatable: boolean,
};

export type TranslationErrorCode = 'not_configured' | 'network' | 'service' | 'invalid_response';

export class TranslationError extends Error {
  code: TranslationErrorCode;

  constructor(code: TranslationErrorCode, message?: string) {
    super(message || code);
    this.name = 'TranslationError';
    this.code = code;
  }
}

export const translationSettingsKey = 'primalTranslationSettings';
export const translationCacheKey = 'primalTranslationCache';
export const translationCacheLimit = 200;
export const translationTimeout = 15_000;

// Languages offered as translation targets. Names are rendered with
// `Intl.DisplayNames`, so only the codes need to be listed here.
export const translationLanguages = [
  'ar', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'fa', 'fi',
  'fr', 'he', 'hi', 'hu', 'id', 'it', 'ja', 'ko', 'lt', 'lv', 'ms', 'nb', 'nl',
  'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sv', 'th', 'tr', 'uk', 'ur', 'vi', 'zh',
];

// Everything matched here is kept exactly as written.
const protectedPatterns = [
  // Links
  '(?:https?|wss?):\\/\\/[^\\s<>"]+',
  // Cashu tokens and lightning invoices / LNURLs
  'cashu[AB][A-Za-z0-9_\\-=]{20,}',
  '(?:lightning:)?ln(?:bc|tb|bcrt|url)1?[a-z0-9]{20,}',
  // Nostr references, with or without the `nostr:` prefix
  '(?:nostr:|@)?(?:npub|nprofile|note|nevent|naddr|nsec)1[023456789ac-hj-np-z]{20,}',
  // Legacy indexed mentions, e.g. #[0]
  '#\\[\\d+\\]',
  // Email and lightning addresses
  '[\\w.+\\-]+@[\\w\\-]+(?:\\.[\\w\\-]+)+',
  // Hashtags
  '#[\\p{L}\\p{N}_]+',
  // Custom emoji shortcodes, e.g. :primal:
  ':[A-Za-z0-9_+\\-]{2,}:',
];

const protectedRegex = () => new RegExp(protectedPatterns.join('|'), 'giu');

const hasLetters = (text: string) => /\p{L}/u.test(text);

export const splitTranslatableContent = (content: string): TranslationSegment[] => {
  const segments: TranslationSegment[] = [];

  const pushText = (text: string) => {
    if (text.length === 0) return;

    if (!hasLetters(text)) {
      segments.push({ text, translatable: false });
      return;
    }

    // Surrounding whitespace is kept out of the request, translation services
    // tend to trim or collapse it.
    const leading = text.match(/^\s*/)?.[0] || '';
    const trailing = text.slice(leading.length).match(/\s*$/)?.[0] || '';
    const core = text.slice(leading.length, text.length - trailing.length);

    if (leading) segments.push({ text: leading, translatable: false });
    segments.push({ text: core, translatable: true });
    if (trailing) segments.push({ text: trailing, translatable: false });
  };

  let lastIndex = 0;

  for (const match of content.matchAll(protectedRegex())) {
    const index = match.index || 0;

    pushText(content.slice(lastIndex, index));
    segments.push({ text: match[0], translatable: false });

    lastIndex = index + match[0].length;
  }

  pushText(content.slice(lastIndex));

  return segments;
};

export const hasTranslatableContent = (content: string | undefined) => {
  if (!content) return false;

  return splitTranslatableContent(content).some(s => s.translatable);
};

export const joinTranslatedContent = (
  segments: TranslationSegment[],
  translations: string[],
) => {
  let index = 0;

  return segments.map((segment) => {
    if (!segment.translatable) return segment.text;

    const translated = translations[index++];

    return typeof translated === 'string' && translated.length > 0 ?
      translated :
      segment.text;
  }).join('');
};

export const baseLanguage = (language: string | undefined) => {
  return (language || '').trim().toLowerCase().split(/[-_]/)[0];
};

export const browserLanguage = () => {
  try {
    return baseLanguage(navigator.languages?.[0] || navigator.language) || 'en';
  } catch (e) {
    return 'en';
  }
};

export const resolveTargetLanguage = (settings: Pick<TranslationSettings, 'targetLanguage'>) => {
  return baseLanguage(settings.targetLanguage) || browserLanguage();
};

export const languageName = (code: string, displayLocale?: string) => {
  if (!code) return '';

  try {
    const names = new Intl.DisplayNames([displayLocale || browserLanguage()], { type: 'language' });
    return names.of(code) || code;
  } catch (e) {
    return code;
  }
};

// Returns the URL translation requests are sent to, or an empty string if the
// configured endpoint can't be used. Plain http is only accepted for local
// instances so note text and API keys don't travel unencrypted.
export const normalizeTranslationEndpoint = (endpoint: string | undefined) => {
  const value = (endpoint || '').trim();

  if (value.length === 0) return '';

  let url: URL;

  try {
    url = new URL(value);
  } catch (e) {
    return '';
  }

  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) return '';

  url.hash = '';
  url.search = '';

  const path = url.pathname.replace(/\/+$/, '');

  url.pathname = path.endsWith('/translate') ? path : `${path}/translate`;

  return url.toString();
};

export const defaultTranslationSettings = (): TranslationSettings => {
  const endpoint: string = import.meta.env?.PRIMAL_TRANSLATE_URL || '';

  return {
    // Translation is available out of the box only when the build ships with
    // a translation service. Otherwise the user has to opt in from settings.
    enabled: normalizeTranslationEndpoint(endpoint).length > 0,
    endpoint,
    apiKey: '',
    targetLanguage: '',
  };
};

export const loadTranslationSettings = (): TranslationSettings => {
  const defaults = defaultTranslationSettings();

  try {
    const stored = JSON.parse(localStorage.getItem(translationSettingsKey) || 'null');

    if (!stored || typeof stored !== 'object') return defaults;

    return {
      enabled: typeof stored.enabled === 'boolean' ? stored.enabled : defaults.enabled,
      endpoint: typeof stored.endpoint === 'string' ? stored.endpoint : defaults.endpoint,
      apiKey: typeof stored.apiKey === 'string' ? stored.apiKey : defaults.apiKey,
      targetLanguage: typeof stored.targetLanguage === 'string' ? stored.targetLanguage : defaults.targetLanguage,
    };
  } catch (e) {
    return defaults;
  }
};

export const saveTranslationSettings = (settings: TranslationSettings) => {
  try {
    localStorage.setItem(translationSettingsKey, JSON.stringify(settings));
  } catch (e) {
    // Storage may be unavailable, settings then only last for this session.
  }
};

export const isTranslationAvailable = (settings: TranslationSettings) => {
  return settings.enabled && normalizeTranslationEndpoint(settings.endpoint).length > 0;
};


// CACHE ----------------------------------------

type CachedTranslation = {
  t: string,
  l: string,
  ts: number,
};

// cyrb53, a small non-cryptographic hash. Good enough for cache keys.
export const hashContent = (text: string) => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

export const translationCacheId = (endpoint: string, target: string, content: string) => {
  return hashContent(`${endpoint}\n${target}\n${content}`);
};

let memoryCache: Record<string, CachedTranslation> | undefined;

const readCache = () => {
  if (memoryCache) return memoryCache;

  try {
    const stored = JSON.parse(localStorage.getItem(translationCacheKey) || '{}');
    memoryCache = stored && typeof stored === 'object' ? stored : {};
  } catch (e) {
    memoryCache = {};
  }

  return memoryCache as Record<string, CachedTranslation>;
};

export const pruneTranslationCache = (
  cache: Record<string, CachedTranslation>,
  limit = translationCacheLimit,
) => {
  const keys = Object.keys(cache);

  if (keys.length <= limit) return cache;

  keys.
    sort((a, b) => cache[a].ts - cache[b].ts).
    slice(0, keys.length - limit).
    forEach(key => delete cache[key]);

  return cache;
};

const writeCache = (cache: Record<string, CachedTranslation>) => {
  memoryCache = cache;

  try {
    localStorage.setItem(translationCacheKey, JSON.stringify(cache));
  } catch (e) {
    // Most likely out of quota. Drop the persisted copy, keep the in-memory one.
    try {
      localStorage.removeItem(translationCacheKey);
    } catch (err) {}
  }
};

export const getCachedTranslation = (id: string, target: string): TranslationResult | undefined => {
  const cached = readCache()[id];

  if (!cached) return;

  return { text: cached.t, detectedLanguage: cached.l, targetLanguage: target };
};

export const setCachedTranslation = (id: string, result: TranslationResult) => {
  const cache = readCache();

  cache[id] = { t: result.text, l: result.detectedLanguage, ts: Date.now() };

  writeCache(pruneTranslationCache(cache));
};

export const clearTranslationCache = () => {
  memoryCache = {};

  try {
    localStorage.removeItem(translationCacheKey);
  } catch (e) {}
};


// REQUEST --------------------------------------

const parseDetectedLanguage = (detected: any) => {
  const list = (Array.isArray(detected) ? detected : [detected]).
    filter(d => d && typeof d.language === 'string');

  if (list.length === 0) return '';

  const best = list.reduce((acc, d) => (d.confidence || 0) > (acc.confidence || 0) ? d : acc, list[0]);

  return baseLanguage(best.language);
};

const pending: Record<string, Promise<TranslationResult>> = {};

const requestTranslation = async (
  url: string,
  apiKey: string,
  target: string,
  segments: TranslationSegment[],
): Promise<TranslationResult> => {
  const texts = segments.filter(s => s.translatable).map(s => s.text);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), translationTimeout);

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texts,
        source: 'auto',
        target,
        format: 'text',
        ...(apiKey ? { api_key: apiKey } : {}),
      }),
      signal: controller.signal,
    });
  } catch (e) {
    throw new TranslationError('network');
  } finally {
    clearTimeout(timeout);
  }

  let data: any;

  try {
    data = await response.json();
  } catch (e) {
    throw new TranslationError(response.ok ? 'invalid_response' : 'service');
  }

  if (!response.ok) {
    throw new TranslationError('service', typeof data?.error === 'string' ? data.error : undefined);
  }

  const translated: unknown[] = Array.isArray(data?.translatedText) ?
    data.translatedText :
    [data?.translatedText];

  if (translated.length !== texts.length || translated.some(t => typeof t !== 'string')) {
    throw new TranslationError('invalid_response');
  }

  return {
    text: joinTranslatedContent(segments, translated as string[]),
    detectedLanguage: parseDetectedLanguage(data.detectedLanguage),
    targetLanguage: target,
  };
};

export const translateNoteContent = async (
  content: string,
  settings: TranslationSettings,
): Promise<TranslationResult> => {
  const url = normalizeTranslationEndpoint(settings.endpoint);

  if (!settings.enabled || url.length === 0) {
    throw new TranslationError('not_configured');
  }

  const target = resolveTargetLanguage(settings);
  const segments = splitTranslatableContent(content);

  if (!segments.some(s => s.translatable)) {
    return { text: content, detectedLanguage: '', targetLanguage: target };
  }

  const id = translationCacheId(url, target, content);
  const cached = getCachedTranslation(id, target);

  if (cached) return cached;

  // Share the request between copies of the same note (feed + thread, reposts...)
  if (!pending[id]) {
    pending[id] = requestTranslation(url, settings.apiKey.trim(), target, segments).
      then((result) => {
        setCachedTranslation(id, result);
        return result;
      }).
      finally(() => {
        delete pending[id];
      });
  }

  return pending[id];
};
