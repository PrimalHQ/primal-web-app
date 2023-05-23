import { createStore } from "solid-js/store";
import { useToastContext } from "../components/Toaster/Toaster";
import { defaultFeeds, noKey, themes, trendingFeed } from "../constants";
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
  socket,
  subscribeTo
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
import { getStorage, saveTheme } from "../lib/localStore";
import { getDefaultSettings, getSettings, sendSettings } from "../lib/settings";
import { APP_ID } from "../App";
import { useIntl } from "@cookbook/solid-intl";
import { hexToNpub } from "../lib/keys";

export type SettingsContextStore = {
  locale: string,
  theme: string,
  themes: PrimalTheme[],
  availableFeeds: PrimalFeed[],
  defaultFeed: PrimalFeed,
  actions: {
    setTheme: (theme: PrimalTheme | null) => void,
    addAvailableFeed: (feed: PrimalFeed, addToTop?: boolean) => void,
    removeAvailableFeed: (feed: PrimalFeed) => void,
    setAvailableFeeds: (feedList: PrimalFeed[]) => void,
    moveAvailableFeed: (fromIndex: number, toIndex: number) => void,
    renameAvailableFeed: (feed: PrimalFeed, newName: string) => void,
    saveSettings: () => void,
    loadSettings: (pubkey: string) => void,
  }
}

export const initialData = {
  locale: 'en-us',
  theme: 'sunset',
  themes,
  availableFeeds: [],
  defaultFeed: defaultFeeds[0],
};


export const SettingsContext = createContext<SettingsContextStore>();

export const SettingsProvider = (props: { children: ContextChildren }) => {

  const toaster = useToastContext();
  const account = useAccountContext();
  const intl = useIntl();

// ACTIONS --------------------------------------

  const setTheme = (theme: PrimalTheme | null, temp?: boolean) => {
    if (!theme) {
      return;
    }

    saveTheme(account?.publicKey, theme.name);
    updateStore('theme', () => theme.name);
    !temp && saveSettings();
  }

  const setThemeByName = (name: string | null, temp?: boolean) => {
    if (!name) {
      return;
    }

    const availableTheme = store.themes.find(t => t.name === name);
    availableTheme && setTheme(availableTheme, temp);
  }

  const addAvailableFeed = (feed: PrimalFeed, addToTop = false, temp?: boolean) => {
    if (!feed) {
      return;
    }
    if (account?.hasPublicKey()) {
      const add = addToTop ? updateAvailableFeedsTop : updateAvailableFeeds;

      updateStore('availableFeeds', (feeds) => add(account?.publicKey, feed, feeds));
      !temp && saveSettings();
    }
  };

  const removeAvailableFeed = (feed: PrimalFeed, temp?: boolean) => {
    if (!feed) {
      return;
    }

    if (account?.hasPublicKey()) {
      updateStore('availableFeeds',
        (feeds) => removeFromAvailableFeeds(account?.publicKey, feed, feeds),
      );

      !temp && saveSettings();
      toaster?.sendSuccess(`"${feed.name}" has been removed from your home page`);
    }
  };

  const setAvailableFeeds = (feedList: PrimalFeed[], temp?: boolean) => {
    if (account?.hasPublicKey()) {
      updateStore('availableFeeds',
        () => replaceAvailableFeeds(account?.publicKey, feedList),
      );
      !temp && saveSettings();
    }
  };

  const moveAvailableFeed = (fromIndex: number, toIndex: number) => {

    let list = [...store.availableFeeds];

    list.splice(toIndex, 0, list.splice(fromIndex, 1)[0]);

    setAvailableFeeds(list);

  };

  const renameAvailableFeed = (feed: PrimalFeed, newName: string) => {
    const list = store.availableFeeds.map(af => {
      return af.hex === feed.hex ? { ...af, name: newName } : { ...af };
    });
    setAvailableFeeds(list);
  };

  const saveSettings = () => {
    const settings = {
      theme: store.theme,
      feeds: store.availableFeeds,
    };

    const subid = `save_settings_${APP_ID}`;

    const unsub = subscribeTo(subid, async (type, subId, content) => {
      if (type === 'NOTICE') {
        toaster?.sendWarning(intl.formatMessage({
          id: 'settings.saveFail',
          defaultMessage: 'Failed to save settings',
          description: 'Toast message after settings have failed to be saved on the server',
        }));
      }

      unsub();
      return;
    });

    sendSettings(settings, subid);
  }

  const loadDefaults = () => {

    const subid = `load_defaults_${APP_ID}`;

    const unsub = subscribeTo(subid, async (type, subId, content) => {

      if (type === 'EVENT' && content?.content) {
        try {
          const settings = JSON.parse(content?.content);

          const feeds = settings.feeds as PrimalFeed[];

          // const availableTopics = store.availableFeeds.map(f => f.hex);

          // const updatedFeeds = feeds.reduce((acc, feed) => {
          //   return availableTopics.includes(feed.hex) ?
          //     acc :
          //     [ ...acc, feed ];
          // }, store.availableFeeds)

          updateStore('availableFeeds',
            () => replaceAvailableFeeds(account?.publicKey, feeds),
          );

          updateStore('defaultFeed', () => store.availableFeeds[0]);

        }
        catch (e) {
          console.log('Error parsing settings response: ', e);
        }
      }

      if (type === 'NOTICE') {
        toaster?.sendWarning(intl.formatMessage({
          id: 'settings.loadFail',
          defaultMessage: 'Failed to load settings. Will be using local settings.',
          description: 'Toast message after settings have failed to be loaded from the server',
        }));
      }

      unsub();
      return;
    });

    getDefaultSettings(subid)
  };

  const loadSettings = (pubkey: string | undefined) => {
    if (!pubkey || pubkey === noKey) {
      return;
    }

    const subid = `load_settings_${APP_ID}`;

    const unsub = subscribeTo(subid, async (type, subId, content) => {

      if (type === 'EVENT' && content?.content) {
        try {
          const { theme, feeds } = JSON.parse(content?.content);

          theme && setThemeByName(theme, true);
          feeds && setAvailableFeeds(feeds, true);

        }
        catch (e) {
          console.log('Error parsing settings response: ', e);
        }
      }

      if (type === 'NOTICE') {
        toaster?.sendWarning(intl.formatMessage({
          id: 'settings.loadFail',
          defaultMessage: 'Failed to load settings. Will be using local settings.',
          description: 'Toast message after settings have failed to be loaded from the server',
        }));
      }

      updateStore('defaultFeed', () => store.availableFeeds[0]);

      unsub();
      return;
    });

    pubkey && getSettings(pubkey, subid);
  }

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
    // Set global theme, this is done to avoid changing the theme
    // when waiting for pubkey (like when reloading a page).
    const storedTheme = localStorage.getItem('theme');
    setThemeByName(storedTheme, true);
  });


  // This is here as to not trigger the effect
  // TODO Solve this.
  const feedLabel = intl.formatMessage({
    id: 'feeds.latestFollowing',
    defaultMessage: 'Latest, following',
    description: 'Label for the `latest;following` (active user\'s) feed',
  });


  // Initial setup for a user with a public key
  createEffect(() => {
    if (!account?.hasPublicKey() && account?.isKeyLookupDone) {
      loadDefaults();
      return;
    }

    const pubkey = account?.publicKey;

    const initFeeds = initAvailableFeeds(pubkey);

    if (!initFeeds || initFeeds.length === 0) {
      return;
    }

    updateStore('defaultFeed', () => initFeeds[0]);
    updateStore('availableFeeds', () => replaceAvailableFeeds(pubkey, initFeeds));

    const feed = {
      name: feedLabel,
      hex: pubkey,
      npub: hexToNpub(pubkey),
    };

    // Add trendingFeed if it's missing
    // @ts-ignore
    if (!initFeeds.find((f) => f.hex === trendingFeed.hex)) {
      addAvailableFeed(trendingFeed, true, true);
    }

    // Add active user's feed if it's missing
    // @ts-ignore
    if (!initFeeds.find(f => f.hex === feed.hex)) {
      addAvailableFeed(feed, true, true);
    }


    setTimeout(() => {
      loadSettings(pubkey);
    }, 100);
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
      renameAvailableFeed,
      saveSettings,
      loadSettings,
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
