import { DEFAULT_TRANSLATE_ENDPOINT, DEFAULT_TRANSLATE_TARGET } from './translation';

/**
 * Translation settings, persisted in localStorage (frontend-only).
 * Kept separate from the Nostr-backed SettingsContext so the translation
 * feature is fully self-contained and needs no backend changes.
 */

const SETTINGS_KEY = 'primal:translation:settings';

export type TranslationSettings = {
  /** LibreTranslate-compatible base URL, e.g. https://libretranslate.com */
  endpoint: string;
  /** optional API key for the translation service */
  apiKey: string;
  /** target language code, e.g. "en", "es", "de" */
  targetLang: string;
  /** whether the inline translate control is shown on notes */
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
    const parsed = JSON.parse(raw);
    return { ...defaultTranslationSettings(), ...parsed };
  } catch {
    return defaultTranslationSettings();
  }
};

export const saveTranslationSettings = (s: TranslationSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};
