import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';
import {
  clearTranslationCache,
  DEFAULT_TRANSLATION_SETTINGS,
  getTranslationCacheSize,
  isTranslationSettingsReady,
  TRANSLATION_SETTINGS_STORAGE_KEY,
  TranslationProvider,
  TranslationSettings,
} from '../lib/translation';

const VALID_PROVIDERS: ReadonlySet<TranslationProvider> = new Set([
  'none',
  'browser',
  'libretranslate',
  'google',
]);

const readStoredSettings = (): TranslationSettings => {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_TRANSLATION_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(TRANSLATION_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TRANSLATION_SETTINGS };

    const parsed = JSON.parse(raw) as Partial<TranslationSettings>;
    const provider: TranslationProvider =
      parsed.provider && VALID_PROVIDERS.has(parsed.provider)
        ? parsed.provider
        : 'none';

    return {
      provider,
      targetLanguage:
        typeof parsed.targetLanguage === 'string' && parsed.targetLanguage.trim()
          ? parsed.targetLanguage.trim()
          : 'auto',
      libreTranslateUrl:
        typeof parsed.libreTranslateUrl === 'string' ? parsed.libreTranslateUrl : '',
      libreTranslateApiKey:
        typeof parsed.libreTranslateApiKey === 'string' ? parsed.libreTranslateApiKey : '',
      googleApiKey:
        typeof parsed.googleApiKey === 'string' ? parsed.googleApiKey : '',
    };
  } catch {
    return { ...DEFAULT_TRANSLATION_SETTINGS };
  }
};

const persistSettings = (settings: TranslationSettings): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(TRANSLATION_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or private-mode errors
  }
};

const [translationStore, setTranslationStore] = createStore<TranslationSettings>(
  readStoredSettings(),
);

const [translationCacheCount, setTranslationCacheCount] = createSignal<number>(
  getTranslationCacheSize(),
);

export const updateTranslationSettings = (patch: Partial<TranslationSettings>): void => {
  setTranslationStore((prev) => {
    const next: TranslationSettings = { ...prev, ...patch };
    persistSettings(next);
    return next;
  });
};

export const resetTranslationSettings = (): void => {
  const fresh = { ...DEFAULT_TRANSLATION_SETTINGS };
  setTranslationStore(fresh);
  persistSettings(fresh);
};

export const refreshTranslationCacheCount = (): void => {
  setTranslationCacheCount(getTranslationCacheSize());
};

export const clearTranslationCacheStore = (): void => {
  clearTranslationCache();
  setTranslationCacheCount(0);
};

export const isTranslationConfigured = (): boolean => {
  return isTranslationSettingsReady(translationStore);
};

export { translationStore, translationCacheCount };
