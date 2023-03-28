import { createStore } from "solid-js/store";
import { useToastContext } from "../components/Toaster/Toaster";
import { defaultFeeds, themes } from "../constants";
import {
  createContext,
  createEffect,
  onCleanup,
  onMount,
  useContext
} from "solid-js";
import {
  isConnected,
  refreshSocketListeners,
  removeSocketListeners,
  socket
} from "../sockets";
import {
  ContextChildren,
  PrimalFeed,
  PrimalTheme,
} from "../types/primal";
import {
  initAvailableFeeds,
  removeFromAvailableFeeds,
  replaceAvailableFeeds,
  updateAvailableFeeds,
  updateAvailableFeedsTop
} from "../lib/availableFeeds";
import { useAccountContext } from "./AccountContext";

export type SettingsContextStore = {
  locale: string,
  theme: string,
  themes: PrimalTheme[],
  availableFeeds: PrimalFeed[],
  actions: {
    setTheme: (theme: PrimalTheme | null) => void,
    addAvailableFeed: (feed: PrimalFeed, addToTop?: boolean) => void,
    removeAvailableFeed: (feed: PrimalFeed) => void,
    setAvailableFeeds: (feedList: PrimalFeed[]) => void,
    moveAvailableFeed: (fromIndex: number, toIndex: number) => void,
  }
}

export const initialData = {
  locale: 'en-us',
  theme: 'sunset',
  themes,
  availableFeeds: [ ...defaultFeeds ],
};


export const SettingsContext = createContext<SettingsContextStore>();

export const SettingsProvider = (props: { children: ContextChildren }) => {

  const toaster = useToastContext();
  const account = useAccountContext();

// ACTIONS --------------------------------------

  const setTheme = (theme: PrimalTheme | null) => {
    if (!theme) {
      return;
    }

    updateStore('theme', () => theme.name);
  }

  const addAvailableFeed = (feed: PrimalFeed, addToTop = false) => {
    if (!feed) {
      return;
    }
    if (account?.publicKey) {
      const add = addToTop ? updateAvailableFeedsTop : updateAvailableFeeds;

      updateStore('availableFeeds', (feeds) => add(account?.publicKey, feed, feeds));
    }
  };

  const removeAvailableFeed = (feed: PrimalFeed) => {
    if (!feed) {
      return;
    }

    if (account?.publicKey) {
      updateStore('availableFeeds',
        (feeds) => removeFromAvailableFeeds(account?.publicKey, feed, feeds),
      );
      toaster?.sendSuccess(`"${feed.name}" has been removed from your home page`);
    }
  };

  const setAvailableFeeds = (feedList: PrimalFeed[]) => {
    if (account?.publicKey) {
      updateStore('availableFeeds',
        () => replaceAvailableFeeds(account?.publicKey, feedList),
      );
    }
  };

  const moveAvailableFeed = (fromIndex: number, toIndex: number) => {

    let list = [...store.availableFeeds];

    list.splice(toIndex, 0, list.splice(fromIndex, 1)[0]);

    store.actions.setAvailableFeeds(list);

  };

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    // const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    // const [type, subId, content] = message;
  };

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    removeSocketListeners(
      webSocket,
      { message: onMessage, close: onSocketClose },
    );
  };

// EFFECTS --------------------------------------

  onMount(() => {
    const storedTheme = localStorage.getItem('theme');
    const availableTheme = store.themes.find(t => t.name === storedTheme);
    availableTheme && setTheme(availableTheme);
  });

  createEffect(() => {
    if (account?.publicKey) {
      updateStore('availableFeeds', () => initAvailableFeeds(account?.publicKey));
    }
  });

  createEffect(() => {
    const html: HTMLElement | null = document.querySelector('html');
    localStorage.setItem('theme', store.theme);
    html?.setAttribute('data-theme', store.theme);
  });

  createEffect(() => {
    if (isConnected()) {
      refreshSocketListeners(
        socket(),
        { message: onMessage, close: onSocketClose },
      );
    }
  });

  onCleanup(() => {
    removeSocketListeners(
      socket(),
      { message: onMessage, close: onSocketClose },
    );
  });

// STORES ---------------------------------------


  const [store, updateStore] = createStore<SettingsContextStore>({
    ...initialData,
    actions: {
      setTheme,
      addAvailableFeed,
      removeAvailableFeed,
      setAvailableFeeds,
      moveAvailableFeed,
    },
  });

// RENDER ---------------------------------------

  return (
    <SettingsContext.Provider value={store}>
      {props.children}
    </SettingsContext.Provider>
  );
}

export const useSettingsContext = () => useContext(SettingsContext);
