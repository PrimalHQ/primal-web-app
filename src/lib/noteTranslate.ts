import {
  hasTranslatableProse,
  languageBase,
  normalizeOwnedLibreTranslateUrl,
  shouldOfferTranslate,
} from './noteTranslateProtect';
import {
  restoreNoteTextForTranslation,
  shieldNoteTextForTranslation,
  stripTranslationPlaceholders,
} from './noteTranslateSlots';
import {
  NoteTranslatePrefs,
  NoteTranslateProvider,
  onDeviceTranslatorAvailable,
  providerReadiness,
  readNoteTranslatePrefs,
  resolveTargetLanguage,
} from './noteTranslateSettings';

export type NoteTranslation = {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
  provider: NoteTranslateProvider;
};

export type TranslateProgress = {
  phase: 'detect' | 'download' | 'translate';
  loaded?: number;
};

export type TranslateFailure = {
  reason:
    | 'disabled'
    | 'missing_url'
    | 'invalid_url'
    | 'missing_key'
    | 'on_device_unavailable'
    | 'empty'
    | 'same_language'
    | 'aborted'
    | 'provider';
  detail?: string;
};

export class NoteTranslateError extends Error {
  readonly failure: TranslateFailure;

  constructor(failure: TranslateFailure) {
    super(failure.reason);
    this.failure = failure;
  }
}

const CACHE_LIMIT = 64;
const cache = new Map<string, NoteTranslation>();

const djb2 = (value: string): string => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(16);
};

const cacheKey = (prefs: NoteTranslatePrefs, source: string, target: string): string => {
  const endpoint = prefs.provider === 'libretranslate'
    ? String(normalizeOwnedLibreTranslateUrl(prefs.libreTranslateUrl))
    : prefs.provider;
  return `${prefs.provider}|${endpoint}|${target}|${djb2(source)}`;
};

const remember = (key: string, value: NoteTranslation) => {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
};

export const peekNoteTranslation = (
  source: string,
  prefs: NoteTranslatePrefs = readNoteTranslatePrefs(),
): NoteTranslation | undefined => {
  return cache.get(cacheKey(prefs, source, resolveTargetLanguage(prefs)));
};

export const canOfferNoteTranslate = (
  source: string,
  prefs: NoteTranslatePrefs = readNoteTranslatePrefs(),
): boolean => {
  if (!prefs.enabled) return false;
  return shouldOfferTranslate(source, resolveTargetLanguage(prefs));
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw new NoteTranslateError({ reason: 'aborted' });
  }
};

const jsonOrThrow = async (response: Response): Promise<any> => {
  const body = await response.text();
  if (!response.ok) {
    throw new NoteTranslateError({
      reason: 'provider',
      detail: `${response.status} ${body.slice(0, 180)}`,
    });
  }
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    throw new NoteTranslateError({ reason: 'provider', detail: 'invalid_json' });
  }
};

type Detector = {
  detect: (input: string) => Promise<Array<{ detectedLanguage?: string; confidence?: number }>>;
};

type TranslatorHandle = {
  translate: (input: string) => Promise<string>;
};

const getLanguageDetectorCtor = (): any => {
  const g = globalThis as any;
  return g.LanguageDetector;
};

const getTranslatorCtor = (): any => {
  const g = globalThis as any;
  return g.Translator;
};

let sharedDetector: Promise<Detector | undefined> | undefined;

const getSharedDetector = (): Promise<Detector | undefined> => {
  if (!sharedDetector) {
    const Detector = getLanguageDetectorCtor();
    sharedDetector = Detector?.create
      ? Detector.create().catch(() => undefined)
      : Promise.resolve(undefined);
  }
  return sharedDetector;
};

export const detectNoteLanguage = async (source: string): Promise<string | undefined> => {
  if (!onDeviceTranslatorAvailable()) return undefined;
  const shielded = shieldNoteTextForTranslation(source);
  const prose = stripTranslationPlaceholders(shielded.payload, shielded.namespace).trim();
  if (!prose) return undefined;
  try {
    const detector = await getSharedDetector();
    if (!detector) return undefined;
    const results = await detector.detect(prose);
    const best = [...(results || [])].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    const lang = best?.detectedLanguage;
    if (!lang || lang === 'und' || (best?.confidence || 0) < 0.4) return undefined;
    return languageBase(lang);
  } catch {
    return undefined;
  }
};

const detectOnDevice = async (
  text: string,
  signal?: AbortSignal,
  onProgress?: (info: TranslateProgress) => void,
): Promise<string | undefined> => {
  const Detector = getLanguageDetectorCtor();
  if (!Detector?.create) return undefined;

  onProgress?.({ phase: 'detect' });
  const detector: Detector = await Detector.create({
    signal,
    monitor: (m: EventTarget) => {
      m.addEventListener('downloadprogress', (event: Event) => {
        const e = event as Event & { loaded?: number };
        onProgress?.({ phase: 'download', loaded: e.loaded });
      });
    },
  });

  throwIfAborted(signal);
  const results = await detector.detect(text);
  const best = [...(results || [])].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
  const lang = best?.detectedLanguage;
  if (!lang || lang === 'und') return undefined;
  return languageBase(lang);
};

const translateOnDevice = async (
  text: string,
  sourceLanguage: string | undefined,
  targetLanguage: string,
  signal?: AbortSignal,
  onProgress?: (info: TranslateProgress) => void,
): Promise<string> => {
  const Translator = getTranslatorCtor();
  const legacy = (globalThis as any).translation;

  if (Translator?.create) {
    const source = sourceLanguage || 'en';
    const translator: TranslatorHandle = await Translator.create({
      sourceLanguage: source,
      targetLanguage,
      signal,
      monitor: (m: EventTarget) => {
        m.addEventListener('downloadprogress', (event: Event) => {
          const e = event as Event & { loaded?: number };
          onProgress?.({ phase: 'download', loaded: e.loaded });
        });
      },
    });
    throwIfAborted(signal);
    onProgress?.({ phase: 'translate' });
    return translator.translate(text);
  }

  if (legacy?.createTranslator) {
    const translator: TranslatorHandle = await legacy.createTranslator({
      sourceLanguage: sourceLanguage || 'en',
      targetLanguage,
    });
    throwIfAborted(signal);
    onProgress?.({ phase: 'translate' });
    return translator.translate(text);
  }

  throw new NoteTranslateError({ reason: 'on_device_unavailable' });
};

const translateLibreTranslate = async (
  text: string,
  targetLanguage: string,
  prefs: NoteTranslatePrefs,
  signal?: AbortSignal,
): Promise<{ text: string; sourceLanguage?: string }> => {
  const url = normalizeOwnedLibreTranslateUrl(prefs.libreTranslateUrl);
  if (typeof url !== 'string') {
    throw new NoteTranslateError({ reason: url.error });
  }

  const payload: Record<string, string> = {
    q: text,
    source: 'auto',
    target: targetLanguage,
    format: 'text',
  };

  const key = (prefs.libreTranslateKey || '').trim() || (() => {
    try {
      return new URL(prefs.libreTranslateUrl.trim()).searchParams.get('api_key') || '';
    } catch {
      return '';
    }
  })();

  if (key) payload.api_key = key;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify(payload),
  });

  const data = await jsonOrThrow(response);
  const translated = data.translatedText || data.translated_text;
  if (typeof translated !== 'string' || !translated.trim()) {
    throw new NoteTranslateError({ reason: 'provider', detail: 'empty_translation' });
  }
  return {
    text: translated,
    sourceLanguage: languageBase(data.detectedLanguage || data.detected_language || '') || undefined,
  };
};

const translateDeepL = async (
  text: string,
  targetLanguage: string,
  prefs: NoteTranslatePrefs,
  signal?: AbortSignal,
): Promise<{ text: string; sourceLanguage?: string }> => {
  const key = prefs.deeplKey.trim();
  if (!key) throw new NoteTranslateError({ reason: 'missing_key' });

  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const response = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({
      text: [text],
      target_lang: targetLanguage.toUpperCase(),
    }),
  });

  const data = await jsonOrThrow(response);
  const translated = data?.translations?.[0]?.text;
  if (typeof translated !== 'string' || !translated.trim()) {
    throw new NoteTranslateError({ reason: 'provider', detail: 'empty_translation' });
  }
  return {
    text: translated,
    sourceLanguage: languageBase(data?.translations?.[0]?.detected_source_language || ''),
  };
};

const translateGoogle = async (
  text: string,
  targetLanguage: string,
  prefs: NoteTranslatePrefs,
  signal?: AbortSignal,
): Promise<{ text: string; sourceLanguage?: string }> => {
  const key = prefs.googleKey.trim();
  if (!key) throw new NoteTranslateError({ reason: 'missing_key' });

  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      q: text,
      target: targetLanguage,
      format: 'text',
    }),
  });

  const data = await jsonOrThrow(response);
  const translated = data?.data?.translations?.[0]?.translatedText;
  if (typeof translated !== 'string' || !translated.trim()) {
    throw new NoteTranslateError({ reason: 'provider', detail: 'empty_translation' });
  }
  return {
    text: translated,
    sourceLanguage: languageBase(data?.data?.translations?.[0]?.detectedSourceLanguage || ''),
  };
};

export const translateNoteText = async (
  source: string,
  options?: {
    prefs?: NoteTranslatePrefs;
    signal?: AbortSignal;
    onProgress?: (info: TranslateProgress) => void;
  },
): Promise<NoteTranslation> => {
  const prefs = options?.prefs || readNoteTranslatePrefs();
  const targetLanguage = resolveTargetLanguage(prefs);
  const ready = providerReadiness(prefs);

  if (!ready.ok) {
    throw new NoteTranslateError({ reason: ready.reason });
  }

  if (!hasTranslatableProse(source)) {
    throw new NoteTranslateError({ reason: 'empty' });
  }

  const key = cacheKey(prefs, source, targetLanguage);
  const hit = cache.get(key);
  if (hit) return hit;

  const shielded = shieldNoteTextForTranslation(source);
  throwIfAborted(options?.signal);

  let result: { text: string; sourceLanguage?: string };

  if (prefs.provider === 'on_device') {
    if (!onDeviceTranslatorAvailable()) {
      throw new NoteTranslateError({ reason: 'on_device_unavailable' });
    }
    const detected = await detectOnDevice(shielded.payload, options?.signal, options?.onProgress);
    if (detected && detected === targetLanguage) {
      throw new NoteTranslateError({ reason: 'same_language', detail: detected });
    }
    const translated = await translateOnDevice(
      shielded.payload,
      detected,
      targetLanguage,
      options?.signal,
      options?.onProgress,
    );
    result = { text: translated, sourceLanguage: detected };
  } else if (prefs.provider === 'libretranslate') {
    result = await translateLibreTranslate(shielded.payload, targetLanguage, prefs, options?.signal);
  } else if (prefs.provider === 'deepl') {
    result = await translateDeepL(shielded.payload, targetLanguage, prefs, options?.signal);
  } else {
    result = await translateGoogle(shielded.payload, targetLanguage, prefs, options?.signal);
  }

  throwIfAborted(options?.signal);

  const restored = restoreNoteTextForTranslation(
    result.text,
    shielded.slots,
    shielded.namespace,
  );
  const translation: NoteTranslation = {
    text: restored,
    sourceLanguage: result.sourceLanguage || undefined,
    targetLanguage,
    provider: prefs.provider,
  };

  remember(key, translation);
  return translation;
};
