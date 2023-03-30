import { createStore } from "solid-js/store";
import {
  createContext,
  JSXElement,
  useContext
} from "solid-js";
import { IntlProvider } from "@cookbook/solid-intl";


export type TranslatorContextStore = {
  locale: string,
  messages: Record<string, string>,
  actions: {
    setLocale: (locale: string) => void,
  },
}

const initialData = {
  locale: 'en',
  messages: {},
};

export const TranslatorContext = createContext<TranslatorContextStore>();

export function TranslatorProvider(props: { children: JSXElement }) {

  const setLocale = (locale: string) => {
    updateStore('locale', () => locale);
  };

// STORES ---------------------------------------

const [store, updateStore] = createStore<TranslatorContextStore>({
  ...initialData,
  actions: {
    setLocale,
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
