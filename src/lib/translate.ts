import { PrimalNote } from '../types/primal';

// Browser built-in translation (W3C Translator API, shipping in Chromium 138+).
// Falls back to Google Translate in a new tab when the API is unavailable.

const TARGET_LANG_STORAGE_KEY = 'primal_translation_target';

type TranslatorLike = {
  translate: (text: string[]) => Promise<string[]>;
};

type LanguageDetectorLike = {
  detect: (text: string[]) => Promise<Array<{ detectedLanguage: string, confidence: number }>>;
};

type TranslatorStatic = {
  create: (options: { sourceLanguage: string, targetLanguage: string, monitor?: any }) => Promise<TranslatorLike>;
  availability?: (options: { sourceLanguage: string, targetLanguage: string }) => string;
};

type LanguageDetectorStatic = {
  create: (options?: { monitor?: any }) => Promise<LanguageDetectorLike>;
};

const translatorCache = new Map<string, TranslatorLike>();
const translationCache = new Map<string, string>();

export const TRANSLATABLE_LANGUAGES: Record<string, string> = {
  'device': 'Device language',
  'en': 'English',
  'es': 'Español',
  'fr': 'Français',
  'de': 'Deutsch',
  'it': 'Italiano',
  'pt': 'Português',
  'nl': 'Nederlands',
  'ru': 'Русский',
  'uk': 'Українська',
  'pl': 'Polski',
  'tr': 'Türkçe',
  'ar': 'العربية',
  'fa': 'فارسی',
  'hi': 'हिन्दी',
  'bn': 'বাংলা',
  'id': 'Bahasa Indonesia',
  'vi': 'Tiếng Việt',
  'th': 'ไทย',
  'ja': '日本語',
  'ko': '한국어',
  'zh': '中文',
  'sw': 'Kiswahili',
};

export const isTranslationSupported = (): boolean => {
  const t = (window as any).Translator as TranslatorStatic | undefined;
  return !!t && typeof t.create === 'function';
};

export const getTargetLanguage = (): string => {
  const stored = localStorage.getItem(TARGET_LANG_STORAGE_KEY);
  if (stored && stored in TRANSLATABLE_LANGUAGES && stored !== 'device') {
    return stored;
  }
  const nav = navigator.language || 'en';
  return normalizeLanguage(nav);
};

export const setTargetLanguage = (lang: string) => {
  localStorage.setItem(TARGET_LANG_STORAGE_KEY, lang);
};

export const getStoredTargetLanguage = (): string => {
  return localStorage.getItem(TARGET_LANG_STORAGE_KEY) || 'device';
};

export const normalizeLanguage = (tag: string): string => {
  const base = (tag || 'en').split('-')[0].toLowerCase();
  return base in TRANSLATABLE_LANGUAGES ? base : 'en';
};

// Strip nostr specific markup so the text is suitable for translation:
// - `#[n]` references become `@name` (profiles) or `[note]` (events)
// - custom emoji shortcodes are kept (they are textual)
// - URLs are kept as-is
export const extractNoteText = (note: PrimalNote): string => {
  const content = note.post?.content || '';
  const tags = note.post?.tags || [];

  return content.replace(/#\[([0-9]+)\]/g, (_match, index: string) => {
    const tag = tags[Number(index)];
    if (!tag || tag.length < 2) return '';

    if (tag[0] === 'p') {
      const user = note.mentionedUsers?.[tag[1]];
      const handle = user?.name || user?.npub || tag[1] || 'user';
      return `@${handle}`;
    }

    if (tag[0] === 'e' || tag[0] === 'a' || tag[0] === 'q') {
      return '[note]';
    }

    return '';
  });
};

export const detectNoteLanguage = async (text: string): Promise<string | undefined> => {
  const detector = (window as any).LanguageDetector as LanguageDetectorStatic | undefined;
  if (!detector || typeof detector.create !== 'function' || text.trim().length < 12) {
    return undefined;
  }
  try {
    const d = await detector.create();
    const results = await d.detect([text]);
    const top = results?.[0];
    if (top && top.confidence > 0.5) {
      return top.detectedLanguage;
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

export const translateNoteText = async (
  noteId: string,
  text: string,
  sourceLanguage: string,
): Promise<string> => {
  const targetLanguage = getTargetLanguage();
  const cacheKey = `${noteId}:${sourceLanguage}:${targetLanguage}`;

  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  const Translator = (window as any).Translator as TranslatorStatic | undefined;

  if (!Translator || typeof Translator.create !== 'function') {
    throw new Error('translation-unsupported');
  }

  // 'auto' is only valid on builds that accept it; reject early on builds
  // that require a concrete source language so the UI can offer the
  // external fallback instead of waiting on a rejection.
  if (sourceLanguage === 'auto' && Translator.availability) {
    const avail = await Translator.availability({ sourceLanguage: 'auto', targetLanguage } as any).catch(() => 'unavailable');
    if (avail === 'unavailable') {
      throw new Error('detection-unavailable');
    }
  }

  const pairKey = `${sourceLanguage}:${targetLanguage}`;
  let translator = translatorCache.get(pairKey);

  if (!translator) {
    translator = await Translator.create({
      sourceLanguage,
      targetLanguage,
    });
    translatorCache.set(pairKey, translator);
  }

  const result = await translator.translate([text]);

  // Chrome's translate() may return the translation split across many array
  // elements (per character/grapheme) rather than one string per input.
  // Joining handles both shapes.
  const translated = Array.isArray(result) ? result.join('') : String(result || '');

  if (translated) {
    translationCache.set(cacheKey, translated);
  }

  return translated;
};

export const externalTranslateUrl = (text: string, targetLanguage: string): string => {
  const params = new URLSearchParams({
    sl: 'auto',
    tl: targetLanguage,
    text: text.slice(0, 1200),
    op: 'translate',
  });
  return `https://translate.google.com/?${params.toString()}`;
};
