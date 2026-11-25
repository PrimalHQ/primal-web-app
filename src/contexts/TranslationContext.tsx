import { createContext, useContext, ParentComponent } from 'solid-js';
import { createStore } from 'solid-js/store';
import { translateText, getBrowserLanguage, SUPPORTED_LANGUAGES, Language } from '../services/TranslationService';

// Local storage keys
const TRANSLATION_TARGET_LANG_KEY = 'primal_translation_target_lang';
const TRANSLATION_ENABLED_KEY = 'primal_translation_enabled';

export interface NoteTranslation {
  translatedText: string;
  detectedLanguage?: string;
  isLoading: boolean;
  error?: string;
}

export interface TranslationContextStore {
  targetLanguage: string;
  translationEnabled: boolean;
  noteTranslations: Record<string, NoteTranslation>;
  supportedLanguages: Language[];
  actions: {
    setTargetLanguage: (lang: string) => void;
    setTranslationEnabled: (enabled: boolean) => void;
    translateNote: (noteId: string, text: string) => Promise<void>;
    clearTranslation: (noteId: string) => void;
    hasTranslation: (noteId: string) => boolean;
    getTranslation: (noteId: string) => NoteTranslation | undefined;
  };
}

const defaultTargetLanguage = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(TRANSLATION_TARGET_LANG_KEY);
    if (stored) return stored;
  }
  return getBrowserLanguage();
};

const defaultTranslationEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(TRANSLATION_ENABLED_KEY);
    if (stored !== null) return stored === 'true';
  }
  return true;
};

export const TranslationContext = createContext<TranslationContextStore>();

export const TranslationProvider: ParentComponent = (props) => {
  const [store, setStore] = createStore<Omit<TranslationContextStore, 'actions'>>({
    targetLanguage: defaultTargetLanguage(),
    translationEnabled: defaultTranslationEnabled(),
    noteTranslations: {},
    supportedLanguages: SUPPORTED_LANGUAGES,
  });

  const setTargetLanguage = (lang: string) => {
    setStore('targetLanguage', lang);
    localStorage.setItem(TRANSLATION_TARGET_LANG_KEY, lang);
  };

  const setTranslationEnabled = (enabled: boolean) => {
    setStore('translationEnabled', enabled);
    localStorage.setItem(TRANSLATION_ENABLED_KEY, String(enabled));
  };

  const translateNote = async (noteId: string, text: string) => {
    if (!text || text.trim().length === 0) return;

    // Set loading state
    setStore('noteTranslations', noteId, {
      translatedText: '',
      isLoading: true,
      error: undefined,
    });

    try {
      const result = await translateText(text, store.targetLanguage);
      
      setStore('noteTranslations', noteId, {
        translatedText: result.translatedText,
        detectedLanguage: result.detectedLanguage?.language,
        isLoading: false,
        error: undefined,
      });
    } catch (error) {
      setStore('noteTranslations', noteId, {
        translatedText: '',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Translation failed',
      });
    }
  };

  const clearTranslation = (noteId: string) => {
    setStore('noteTranslations', noteId, undefined as unknown as NoteTranslation);
  };

  const hasTranslation = (noteId: string): boolean => {
    const translation = store.noteTranslations[noteId];
    return !!translation && !translation.isLoading && !!translation.translatedText;
  };

  const getTranslation = (noteId: string): NoteTranslation | undefined => {
    return store.noteTranslations[noteId];
  };

  const contextValue: TranslationContextStore = {
    get targetLanguage() { return store.targetLanguage; },
    get translationEnabled() { return store.translationEnabled; },
    get noteTranslations() { return store.noteTranslations; },
    get supportedLanguages() { return store.supportedLanguages; },
    actions: {
      setTargetLanguage,
      setTranslationEnabled,
      translateNote,
      clearTranslation,
      hasTranslation,
      getTranslation,
    },
  };

  return (
    <TranslationContext.Provider value={contextValue}>
      {props.children}
    </TranslationContext.Provider>
  );
};

export const useTranslationContext = () => useContext(TranslationContext);
