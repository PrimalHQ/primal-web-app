import { createStore } from "solid-js/store";
import {
  createContext,
  JSXElement,
  useContext
} from "solid-js";
import { IntlProvider } from "@cookbook/solid-intl";
import { PrimalNote } from "../types/primal";

export type NoteTranslation = {
  status: 'loading' | 'success' | 'error',
  text?: string,
  targetLanguage: string,
  error?: string,
};


export type TranslatorContextStore = {
  locale: string,
  messages: Record<string, string>,
  translationLanguage: string,
  translations: Record<string, NoteTranslation>,
  actions: {
    setLocale: (locale: string) => void,
    setTranslationLanguage: (locale: string) => void,
    translateNote: (note: Pick<PrimalNote, 'id' | 'content'>) => Promise<void>,
    clearTranslation: (noteId: string) => void,
  },
}

const translationLanguageKey = 'primal.translationLanguage';

const getDefaultTranslationLanguage = () => {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(translationLanguageKey);
    if (stored) return stored;
  }

  if (typeof navigator !== 'undefined') {
    return (navigator.language || 'en').split('-')[0].toLowerCase();
  }

  return 'en';
};

const initialData = {
  locale: 'en',
  messages: {},
  translationLanguage: getDefaultTranslationLanguage(),
  translations: {},
};

export const TranslatorContext = createContext<TranslatorContextStore>();

export function TranslatorProvider(props: { children: JSXElement }) {

  const setLocale = (locale: string) => {
    updateStore('locale', () => locale);
  };

  const setTranslationLanguage = (locale: string) => {
    const normalized = locale.trim().toLowerCase();
    if (!normalized) return;

    updateStore('translationLanguage', () => normalized);
    window.localStorage.setItem(translationLanguageKey, normalized);
  };

  const translateNote = async (note: Pick<PrimalNote, 'id' | 'content'>) => {
    const source = (note.content || '').trim();
    const targetLanguage = store.translationLanguage;

    if (!source) return;
    if (store.translations[note.id]?.status === 'loading') return;

    updateStore('translations', note.id, () => ({
      status: 'loading',
      targetLanguage,
    }));

    try {
      // MyMemory accepts public requests from the browser and keeps this feature
      // usable without requiring Primal to proxy or store a provider API key.
      const query = encodeURIComponent(source.slice(0, 5_000));
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${query}&langpair=auto|${encodeURIComponent(targetLanguage)}`,
      );

      if (!response.ok) {
        throw new Error(`Translation service returned ${response.status}`);
      }

      const result = await response.json() as {
        responseData?: { translatedText?: string },
        responseStatus?: number,
      };
      const translatedText = result.responseData?.translatedText?.trim();

      if (!translatedText || result.responseStatus === 403) {
        throw new Error('The translation service did not return a translation');
      }

      updateStore('translations', note.id, () => ({
        status: 'success',
        text: translatedText,
        targetLanguage,
      }));
    } catch (error) {
      updateStore('translations', note.id, () => ({
        status: 'error',
        targetLanguage,
        error: error instanceof Error ? error.message : 'Translation failed',
      }));
    }
  };

  const clearTranslation = (noteId: string) => {
    updateStore('translations', noteId, undefined);
  };

// STORES ---------------------------------------

const [store, updateStore] = createStore<TranslatorContextStore>({
  ...initialData,
  actions: {
    setLocale,
    setTranslationLanguage,
    translateNote,
    clearTranslation,
  },
});

  return (
      <TranslatorContext.Provider value={store}>
        <IntlProvider locale={store.locale} messages={store.messages}>
          {props.children}
        </IntlProvider>
      </TranslatorContext.Provider>
  );
}

export function useTranslatorContext() { return useContext(TranslatorContext); }
