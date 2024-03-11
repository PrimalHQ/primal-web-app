import { createStore } from "solid-js/store";
import {
  createContext,
  createEffect,
  JSXElement,
  onCleanup,
  onMount,
  useContext
} from "solid-js";

export type AppContextStore = {
  isInactive: boolean,
}

const initialData = {
  isInactive: false,
};

export const AppContext = createContext<AppContextStore>();

export const AppProvider = (props: { children: JSXElement }) => {

  let inactivityCounter = 0;

  const monitorActivity = () => {
    clearTimeout(inactivityCounter);

    if (store.isInactive) {
      updateStore('isInactive', () => false)
    }

    inactivityCounter = setTimeout(() => {
      updateStore('isInactive', () => true)
    }, 30 * 60_000);
  };

// EFFECTS --------------------------------------

  onMount(() => {
    document.addEventListener('mousemove', monitorActivity);
  });

  onCleanup(() => {
    document.removeEventListener('mousemove', monitorActivity);
  });

  createEffect(() => {
    console.log('INACTIVE: ', store.isInactive)
  })

// STORES ---------------------------------------

  const [store, updateStore] = createStore<AppContextStore>({
    ...initialData,
  });

  return (
      <AppContext.Provider value={store}>
        {props.children}
      </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
