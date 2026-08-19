import { DEFAULT_TRANSLATE_ENDPOINT, DEFAULT_TRANSLATE_TARGET } from './translation';

/**
 * User-configurable note-translation settings (issue #133).
 *
 * Persisted in `localStorage` so the feature stays frontend-only and works for
 * anonymous users too (the Nostr-backed SettingsContext requires a logged-in
 * account). Follows the same save/load-with-guards pattern as lib/localStore.ts.
 */

const SETTINGS_KEY = 'primal:translation:settings';

export type TranslationSettings = {
  /** LibreTranslate-compatible base URL, e.g. https://libretranslate.com */
  endpoint: string;
  /** optional API key for the translation service */
  apiKey: string;
  /** target language ISO 639-1 code, e.g. "en", "es", "de" */
  targetLang: string;
  /** whether the inline Translate control is shown on kind-1 notes */
  enabled: boolean;
};

export const defaultTranslationSettings = (): TranslationSettings => ({
  endpoint: DEFAULT_TRANSLATE_ENDPOINT,
  apiKey: '',
  targetLang: DEFAULT_TRANSLATE_TARGET(),
  enabled: true,
});

export const loadTranslationSettings = (): TranslationSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultTranslationSettings();
    const parsed = JSON.parse(raw) as Partial<TranslationSettings>;
    return { ...defaultTranslationSettings(), ...parsed };
  } catch {
    return defaultTranslationSettings();
  }
};

export const saveTranslationSettings = (settings: TranslationSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable — non-fatal */
  }
};
