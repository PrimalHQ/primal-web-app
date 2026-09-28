import {
  restoreTranslationContent,
  sanitizeForTranslation,
  shouldOfferTranslation,
} from './translationSanitizer';

export type TranslationProvider = 'libretranslate' | 'google' | 'deepl';

export type NoteTranslationPrefs = {
  enabled: boolean;
  provider: TranslationProvider;
  targetLang: string;
  libreBaseUrl: string;
  apiKey: string;
};

const PREFS_KEY = 'primal.noteTranslation.v1';

export const defaultNoteTranslationPrefs = (): NoteTranslationPrefs => ({
  enabled: true,
  provider: 'libretranslate',
  targetLang: (navigator.language || 'en').split('-')[0] || 'en',
  libreBaseUrl: 'https://libretranslate.com',
  apiKey: '',
});

export const readNoteTranslationPrefs = (): NoteTranslationPrefs => {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultNoteTranslationPrefs();
    return { ...defaultNoteTranslationPrefs(), ...JSON.parse(raw) };
  } catch {
    return defaultNoteTranslationPrefs();
  }
};

export const writeNoteTranslationPrefs = (prefs: Partial<NoteTranslationPrefs>) => {
  const next = { ...readNoteTranslationPrefs(), ...prefs };
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  return next;
};

export const normalizeLibreTranslateBaseUrl = (url: string): string => {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return 'https://libretranslate.com';
  return trimmed;
};

type CacheEntry = {
  translated: string;
  detected?: string;
  showingOriginal: boolean;
};

const cache = new Map<string, CacheEntry>();
const controllers = new Map<string, AbortController>();
const listeners = new Set<(noteId: string) => void>();

export const subscribeNoteTranslation = (cb: (noteId: string) => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const notify = (noteId: string) => {
  listeners.forEach((cb) => cb(noteId));
};

export const getCachedNoteTranslation = (noteId: string): CacheEntry | undefined =>
  cache.get(noteId);

export const clearNoteTranslation = (noteId: string) => {
  cache.delete(noteId);
  controllers.get(noteId)?.abort();
  controllers.delete(noteId);
  notify(noteId);
};

export const toggleShowOriginal = (noteId: string) => {
  const entry = cache.get(noteId);
  if (!entry) return;
  entry.showingOriginal = !entry.showingOriginal;
  notify(noteId);
};

async function callLibre(
  text: string,
  prefs: NoteTranslationPrefs,
  signal: AbortSignal,
): Promise<{ text: string; detected?: string }> {
  const base = normalizeLibreTranslateBaseUrl(prefs.libreBaseUrl);
  const body: Record<string, string> = {
    q: text,
    source: 'auto',
    target: prefs.targetLang || 'en',
    format: 'text',
  };
  if (prefs.apiKey) body.api_key = prefs.apiKey;
  const res = await fetch(`${base}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`);
  const json = await res.json();
  return {
    text: String(json.translatedText || ''),
    detected: json.detectedLanguage?.language || json.detectedSourceLanguage,
  };
}

async function callGoogle(
  text: string,
  prefs: NoteTranslationPrefs,
  signal: AbortSignal,
): Promise<{ text: string; detected?: string }> {
  if (!prefs.apiKey) throw new Error('Google Translate API key required');
  const url = new URL('https://translation.googleapis.com/language/translate/v2');
  url.searchParams.set('key', prefs.apiKey);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      target: prefs.targetLang || 'en',
      format: 'text',
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);
  const json = await res.json();
  const item = json?.data?.translations?.[0];
  return {
    text: String(item?.translatedText || ''),
    detected: item?.detectedSourceLanguage,
  };
}

async function callDeepL(
  text: string,
  prefs: NoteTranslationPrefs,
  signal: AbortSignal,
): Promise<{ text: string; detected?: string }> {
  if (!prefs.apiKey) throw new Error('DeepL API key required');
  const free = prefs.apiKey.endsWith(':fx');
  const host = free ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const res = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${prefs.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      target_lang: (prefs.targetLang || 'EN').toUpperCase(),
    }),
    signal,
  });
  if (!res.ok) throw new Error(`DeepL HTTP ${res.status}`);
  const json = await res.json();
  const item = json?.translations?.[0];
  return {
    text: String(item?.text || ''),
    detected: item?.detected_source_language,
  };
}

export const translateNoteContent = async (
  noteId: string,
  content: string,
): Promise<CacheEntry> => {
  const prefs = readNoteTranslationPrefs();
  if (!prefs.enabled) {
    throw new Error('Note translation is disabled in Settings');
  }
  if (!shouldOfferTranslation(content)) {
    throw new Error('empty_prose');
  }

  const existing = cache.get(noteId);
  if (existing && !existing.showingOriginal) {
    return existing;
  }
  if (existing?.showingOriginal) {
    existing.showingOriginal = false;
    notify(noteId);
    return existing;
  }

  controllers.get(noteId)?.abort();
  const controller = new AbortController();
  controllers.set(noteId, controller);

  const { content: sanitized, placeholders } = sanitizeForTranslation(content.trim());
  if (!sanitized.trim()) throw new Error('empty_prose');

  let result: { text: string; detected?: string };
  if (prefs.provider === 'google') {
    result = await callGoogle(sanitized, prefs, controller.signal);
  } else if (prefs.provider === 'deepl') {
    result = await callDeepL(sanitized, prefs, controller.signal);
  } else {
    result = await callLibre(sanitized, prefs, controller.signal);
  }

  const restored = restoreTranslationContent(result.text, placeholders);
  const entry: CacheEntry = {
    translated: restored,
    detected: result.detected,
    showingOriginal: false,
  };
  cache.set(noteId, entry);
  controllers.delete(noteId);
  notify(noteId);
  return entry;
};

export { shouldOfferTranslation };
