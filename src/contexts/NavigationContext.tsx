import { createStore } from "solid-js/store";
import {
  createContext,
  createEffect,
  JSXElement,
  onCleanup,
  useContext
} from "solid-js";
import { MediaEvent, MediaSize, MediaVariant, NostrEOSE, NostrEvent } from "../types/primal";
import { removeSocketListeners, isConnected, refreshSocketListeners, socket } from "../sockets";
import { Kind } from "../constants";
import { useLocation, useNavigate } from "@solidjs/router";

export type NavigationContextStore = {
  history: string[],
  actions: {
    back: () => void,
  },
}

const initialData = {
  history: [],
};

export const NavigationContext = createContext<NavigationContextStore>();

export const NavigationProvider = (props: { children: JSXElement }) => {

  const loc = useLocation();

// SOCKET HANDLERS ------------------------------

// EFFECTS --------------------------------------

const back = () => {
  const newHistory = store.history.slice(0, -1);
  updateStore('history', () => [...newHistory]);
  window.history.back();
};

const navigateTo = (path: string) => {

}

createEffect(() => {
  updateStore('history', store.history.length, () => loc.pathname);
})

// STORES ---------------------------------------

  const [store, updateStore] = createStore<NavigationContextStore>({
    ...initialData,
    actions: {
      back,
    },
  });

  return (
      <NavigationContext.Provider value={store}>
        {props.children}
      </NavigationContext.Provider>
  );
}

export const useNavigationContext = () => useContext(NavigationContext);
