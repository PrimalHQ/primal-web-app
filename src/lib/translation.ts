import { createStore } from 'solid-js/store';
import {
  restoreTranslationContent,
  sanitizeForTranslation,
} from './translationSanitizer';

export type TranslationProvider = 'libretranslate' | 'google' | 'deepl';

export type TranslationSettings = {
  enabled: boolean;
  provider: TranslationProvider;
  apiKey: string;
  libreTranslateUrl: string;
  targetLanguage: string;
};

export type NoteTranslation = {
  status: 'idle' | 'loading' | 'translated' | 'error';
  text?: string;
  provider?: TranslationProvider;
  showOriginal?: boolean;
  error?: string;
  detectedLanguage?: string;
};

const SETTINGS_KEY = 'primal.translation.settings.v1';
const CACHE_KEY = 'primal.translation.cache.v1';
const CACHE_MAX_ENTRIES = 100;
const CACHE_MAX_BYTES = 1024 * 1024;

const defaultTargetLanguage = () => {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return 'en';
};

export const defaultTranslationSettings = (): TranslationSettings => ({
  enabled: true,
  provider: 'libretranslate',
  apiKey: '',
  libreTranslateUrl: 'https://libretranslate.com',
  targetLanguage: defaultTargetLanguage(),
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

export const [noteTranslations, setNoteTranslations] = createStore<
  Record<string, NoteTranslation>
>({});

export const saveTranslationSettings = (
  patch: Partial<TranslationSettings>,
) => {
  setTranslationSettings(patch);
  // Merge explicitly so localStorage always gets the full latest snapshot.
  const next: TranslationSettings = {
    enabled: translationSettings.enabled,
    provider: translationSettings.provider,
    apiKey: translationSettings.apiKey,
    libreTranslateUrl: translationSettings.libreTranslateUrl,
    targetLanguage: translationSettings.targetLanguage,
    ...patch,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
};

type CacheEntry = {
  key: string;
  text: string;
  provider: TranslationProvider;
  detectedLanguage?: string;
  savedAt: number;
};

/**
 * Accept a LibreTranslate base URL or a full `/translate` path.
 * Prevents accidental `.../translate/translate` when users paste the API path.
 */
export const normalizeLibreTranslateBaseUrl = (raw: string): string => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    let path = url.pathname.replace(/\/+$/, '') || '';
    if (path.toLowerCase().endsWith('/translate')) {
      path = path.slice(0, -'/translate'.length) || '';
    }
    url.pathname = path || '/';
    url.search = '';
    url.hash = '';
    // Drop trailing slash for stable cache keys.
    return url.toString().replace(/\/$/, '');
  } catch {
    return trimmed.replace(/\/translate\/?$/i, '').replace(/\/$/, '');
  }
};

const extractTranslatedText = (data: Record<string, unknown>): string | undefined => {
  const candidates = [data.translatedText, data.translation, data.text];
  for (const value of candidates) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return undefined;
};

const extractDetectedLanguage = (data: Record<string, unknown>): string | undefined => {
  const raw =
    data.detectedLanguage ??
    data.detected_language ??
    data.detected_source_language;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.language === 'string') return obj.language;
    if (typeof obj.lang === 'string') return obj.lang;
  }
  return undefined;
};

type ProviderResult = {
  text: string;
  detectedLanguage?: string;
};

const readCache = (): CacheEntry[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCache = (entry: CacheEntry) => {
  let cache = [entry, ...readCache().filter((e) => e.key !== entry.key)].slice(
    0,
    CACHE_MAX_ENTRIES,
  );
  while (
    cache.length > 0 &&
    new Blob([JSON.stringify(cache)]).size > CACHE_MAX_BYTES
  ) {
    cache = cache.slice(0, -1);
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

const sha256Hex = async (value: string): Promise<string> => {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  );
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const translationProviderLabel = (
  provider: TranslationProvider,
): string =>
  ({
    libretranslate: 'LibreTranslate',
    google: 'Google Cloud Translation',
    deepl: 'DeepL',
  })[provider];

/** Normalize BCP-47 / locale tags to a primary language subtag when needed. */
const normalizeTarget = (lang: string) => {
  const trimmed = (lang || '').trim();
  if (!trimmed) return 'en';
  return trimmed;
};

const primaryLang = (lang: string) =>
  normalizeTarget(lang).split(/[-_]/)[0].toLowerCase() || 'en';

async function translateWithProvider(
  text: string,
  settings: TranslationSettings,
  signal?: AbortSignal,
): Promise<ProviderResult> {
  const target = normalizeTarget(settings.targetLanguage);
  const iso639 = primaryLang(target);

  if (settings.provider === 'google') {
    if (!settings.apiKey) throw new Error('missing_key');
    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(settings.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Google accepts en or en-US; prefer primary subtag for consistency.
      body: JSON.stringify({ q: text, target: iso639, format: 'text' }),
      signal,
    });
    const data = await response.json();
    const first = data?.data?.translations?.[0];
    const translated = first?.translatedText;
    if (!response.ok || !translated) throw new Error('provider_error');
    return {
      text: translated as string,
      detectedLanguage:
        typeof first?.detectedSourceLanguage === 'string'
          ? first.detectedSourceLanguage
          : undefined,
    };
  }

  if (settings.provider === 'deepl') {
    if (!settings.apiKey) throw new Error('missing_key');
    // Free keys end with ":fx" and must use the free API host.
    const deeplHost = settings.apiKey.trim().endsWith(':fx')
      ? 'https://api-free.deepl.com'
      : 'https://api.deepl.com';
    const response = await fetch(`${deeplHost}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: iso639.toUpperCase(),
      }),
      signal,
    });
    const data = await response.json();
    const first = data?.translations?.[0];
    const translated = first?.text;
    if (!response.ok || !translated) throw new Error('provider_error');
    return {
      text: translated as string,
      detectedLanguage:
        typeof first?.detected_source_language === 'string'
          ? first.detected_source_language
          : undefined,
    };
  }

  const base = normalizeLibreTranslateBaseUrl(settings.libreTranslateUrl);
  if (!base) throw new Error('missing_url');
  // LibreTranslate expects ISO 639-1 (en) not BCP-47 (en-US)
  const body: Record<string, string> = {
    q: text,
    source: 'auto',
    target: iso639,
    format: 'text',
  };
  if (settings.apiKey) body.api_key = settings.apiKey;

  const response = await fetch(`${base}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await response.json()) as Record<string, unknown>;
  const translated = extractTranslatedText(data);
  if (!response.ok || !translated) throw new Error('provider_error');
  return {
    text: translated,
    detectedLanguage: extractDetectedLanguage(data),
  };
}

const translateControllers = new Map<string, AbortController>();

export const translateNoteContent = async (
  noteId: string,
  content: string,
): Promise<void> => {
  if (!noteId) return;

  const settings = { ...translationSettings };
  if (!settings.enabled) {
    setNoteTranslations(noteId, {
      status: 'error',
      error: 'disabled',
    });
    return;
  }

  // Abort any in-flight request for this note, then start a new one.
  translateControllers.get(noteId)?.abort();
  const controller = new AbortController();
  translateControllers.set(noteId, controller);

  setNoteTranslations(noteId, { status: 'loading', showOriginal: false });

  try {
    const { content: sanitized, placeholders } = sanitizeForTranslation(
      content || '',
    );
    const prose = sanitized.replace(/__PRIMAL_PROTECTED_\d+__/g, ' ').trim();
    if (!prose || !/[\p{L}]/u.test(prose)) {
      setNoteTranslations(noteId, {
        status: 'error',
        error: 'empty_prose',
      });
      return;
    }

    const normalizedLibre = normalizeLibreTranslateBaseUrl(
      settings.libreTranslateUrl,
    );
    const cacheKey = await sha256Hex(
      `${content}\n${settings.targetLanguage}\n${settings.provider}\n${normalizedLibre}`,
    );
    const cached = readCache().find((e) => e.key === cacheKey);
    let rawText = cached?.text;
    let detectedLanguage = cached?.detectedLanguage;
    if (!rawText) {
      const result = await translateWithProvider(
        sanitized,
        { ...settings, libreTranslateUrl: normalizedLibre || settings.libreTranslateUrl },
        controller.signal,
      );
      rawText = result.text;
      detectedLanguage = result.detectedLanguage;
      writeCache({
        key: cacheKey,
        text: rawText,
        provider: settings.provider,
        detectedLanguage,
        savedAt: Date.now(),
      });
    }
    if (controller.signal.aborted) return;
    setNoteTranslations(noteId, {
      status: 'translated',
      text: restoreTranslationContent(rawText, placeholders),
      provider: settings.provider,
      showOriginal: false,
      detectedLanguage,
    });
  } catch (err) {
    if (controller.signal.aborted) return;
    const message = err instanceof Error ? err.message : 'provider_error';
    setNoteTranslations(noteId, { status: 'error', error: message });
  } finally {
    if (translateControllers.get(noteId) === controller) {
      translateControllers.delete(noteId);
    }
  }
};

export const toggleShowOriginal = (noteId: string) => {
  const current = noteTranslations[noteId];
  if (!current || current.status !== 'translated') return;
  setNoteTranslations(noteId, 'showOriginal', !(current.showOriginal ?? false));
};

export const clearNoteTranslation = (noteId: string) => {
  translateControllers.get(noteId)?.abort();
  translateControllers.delete(noteId);
  setNoteTranslations(noteId, { status: 'idle' });
};
