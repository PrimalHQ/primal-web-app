// Translation of note content into the user's preferred language.
//
// Uses free, keyless public translation endpoints, so no API key is required:
// the public LibreTranslate instances are tried first, and, if none of them is
// reachable, we fall back to the free Google Translate endpoint
// (translate.googleapis.com), which is CORS-enabled and requires no key.

const STORAGE_KEY = 'primal_translate_lang';

export type TranslationEngine = 'libretranslate' | 'google';

export type TranslationResult = {
  text: string,
  engine: TranslationEngine,
};

export type TranslationLanguage = {
  code: string,
  name: string,
};

// A curated list of the most common target languages.
// Codes are ISO 639-1 (LibreTranslate style); Google-specific variants
// (zh-Hans, nb, pt-BR) are mapped to their Google equivalents when used.
export const TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ru', name: 'Russian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'pl', name: 'Polish' },
  { code: 'cs', name: 'Czech' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sv', name: 'Swedish' },
  { code: 'nb', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'el', name: 'Greek' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ar', name: 'Arabic' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)' },
];

const LIBRETRANSLATE_INSTANCES = [
  'https://libretranslate.com/translate',
  'https://translate.terraprint.co/translate',
  'https://libretranslate.pussthecat.org/translate',
  'https://lt.vern.cc/translate',
];

const GOOGLE_TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';

// In-memory cache of translated notes: noteId -> last translation result
// (kept together with the target language it was translated into).
const translationCache: Record<string, TranslationResult & { target: string }> = {};

const stripRegion = (lang: string) => lang.split('-')[0].toLowerCase();

export const defaultTranslateLang = () => {
  const browserLang = typeof navigator !== 'undefined' ? stripRegion(navigator.language) : '';

  const normalized = browserLang === 'zh' ? 'zh-Hans' : browserLang;

  return TRANSLATION_LANGUAGES.some((l) => l.code === normalized) ? normalized : 'en';
};

export const getTranslateLang = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored && TRANSLATION_LANGUAGES.some((l) => l.code === stored)) {
      return stored;
    }
  } catch (e) {
    // localStorage might be unavailable; fall back to the default.
  }

  return defaultTranslateLang();
};

export const setTranslateLang = (lang: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (e) {
    // Ignore: the preference is not critical.
  }
};

const toGoogleTarget = (target: string) => {
  switch (target) {
    case 'zh-Hans': return 'zh-CN';
    case 'nb': return 'no';
    case 'pt-BR': return 'pt';
    default: return target;
  }
};

// Note content is stored with `<` and `>` escaped (see sanitize in lib/notes),
// so we decode them back before handing the text to the translation service.
export const decodeNoteContent = (content: string) =>
  content.replaceAll('&lt;', '<').replaceAll('&gt;', '>');

const translateViaLibreTranslate = async (q: string, target: string) => {
  for (const url of LIBRETRANSLATE_INSTANCES) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, source: 'auto', target, format: 'text' }),
      });

      if (!res.ok) {
        continue;
      }

      const data = await res.json();

      if (data && typeof data.translatedText === 'string' && data.translatedText.length > 0) {
        return data.translatedText as string;
      }
    } catch (e) {
      // Instance is unreachable; try the next one.
    }
  }

  return undefined;
};

const translateViaGoogle = async (q: string, target: string) => {
  const url = `${GOOGLE_TRANSLATE_URL}?client=gtx&sl=auto&tl=${toGoogleTarget(target)}&dt=t&q=${encodeURIComponent(q)}`;

  const res = await fetch(url);

  if (!res.ok) {
    return undefined;
  }

  const data = await res.json();
  const text = data?.[0]?.[0]?.[0];

  return typeof text === 'string' && text.length > 0 ? text : undefined;
};

export const translateNoteContent = async (text: string, target: string): Promise<TranslationResult | undefined> => {
  const ltText = await translateViaLibreTranslate(text, target);

  if (ltText) {
    return { text: ltText, engine: 'libretranslate' };
  }

  const googleText = await translateViaGoogle(text, target);

  if (googleText) {
    return { text: googleText, engine: 'google' };
  }

  return undefined;
};

export const getCachedTranslation = (noteId: string, target: string) => {
  const cached = translationCache[noteId];

  return cached && cached.target === target ? cached : undefined;
};

export const cacheTranslation = (noteId: string, target: string, result: TranslationResult) => {
  translationCache[noteId] = { ...result, target };
};
