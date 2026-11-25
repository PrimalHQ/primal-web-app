/**
 * Translation Service using LibreTranslate API
 * Free, no API key required
 */

// LibreTranslate public instances
const LIBRETRANSLATE_INSTANCES = [
  'https://libretranslate.com',
  'https://translate.argosopentech.com',
  'https://translate.terraprint.co',
];

export interface Language {
  code: string;
  name: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: {
    confidence: number;
    language: string;
  };
}

export interface TranslationError {
  error: string;
}

// Supported languages by LibreTranslate
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'ca', name: 'Catalan' },
  { code: 'zh', name: 'Chinese' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'eo', name: 'Esperanto' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ga', name: 'Irish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'es', name: 'Spanish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'vi', name: 'Vietnamese' },
];

let currentInstanceIndex = 0;

const getNextInstance = (): string => {
  const instance = LIBRETRANSLATE_INSTANCES[currentInstanceIndex];
  currentInstanceIndex = (currentInstanceIndex + 1) % LIBRETRANSLATE_INSTANCES.length;
  return instance;
};

/**
 * Translate text using LibreTranslate API
 * @param text - Text to translate
 * @param targetLang - Target language code (e.g., 'en', 'es', 'fr')
 * @param sourceLang - Source language code (optional, will auto-detect if not provided)
 * @returns Translation result or error
 */
export const translateText = async (
  text: string,
  targetLang: string,
  sourceLang: string = 'auto'
): Promise<TranslationResult> => {
  const errors: string[] = [];
  
  // Try each instance until one works
  for (let attempt = 0; attempt < LIBRETRANSLATE_INSTANCES.length; attempt++) {
    const instance = getNextInstance();
    
    try {
      const response = await fetch(`${instance}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        errors.push(`${instance}: ${errorData.error || response.statusText}`);
        continue;
      }

      const data = await response.json();
      
      return {
        translatedText: data.translatedText,
        detectedLanguage: data.detectedLanguage,
      };
    } catch (error) {
      errors.push(`${instance}: ${error instanceof Error ? error.message : 'Network error'}`);
      continue;
    }
  }

  // All instances failed
  throw new Error(`Translation failed: ${errors.join('; ')}`);
};

/**
 * Detect the language of a text
 * @param text - Text to detect language for
 * @returns Detected language code and confidence
 */
export const detectLanguage = async (
  text: string
): Promise<{ language: string; confidence: number }[]> => {
  for (let attempt = 0; attempt < LIBRETRANSLATE_INSTANCES.length; attempt++) {
    const instance = getNextInstance();
    
    try {
      const response = await fetch(`${instance}/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
        }),
      });

      if (!response.ok) {
        continue;
      }

      return await response.json();
    } catch {
      continue;
    }
  }

  throw new Error('Language detection failed on all instances');
};

/**
 * Get the display name for a language code
 * @param code - Language code
 * @returns Language display name
 */
export const getLanguageName = (code: string): string => {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang?.name || code.toUpperCase();
};

/**
 * Get the browser's preferred language
 * @returns Language code
 */
export const getBrowserLanguage = (): string => {
  const browserLang = navigator.language.split('-')[0];
  const supported = SUPPORTED_LANGUAGES.find(l => l.code === browserLang);
  return supported?.code || 'en';
};
