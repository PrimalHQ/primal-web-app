import { createStore } from "solid-js/store";
import { useToastContext } from "../components/Toaster/Toaster";
import { andRD, andVersion, contentScope, defaultContentModeration, defaultFeeds, defaultNotificationSettings, defaultZap, defaultZapOptions, iosRD, iosVersion, nostrHighlights, themes, trendingFeed, trendingScope } from "../constants";
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
  ContentModeration,
  ContextChildren,
  PrimalFeed,
  PrimalTheme,
  ZapOption,
} from "../types/primal";
import {
  initAvailableFeeds,
  removeFromAvailableFeeds,
  replaceAvailableFeeds,
  updateAvailableFeeds,
  updateAvailableFeedsTop
} from "../lib/availableFeeds";
import { useAccountContext } from "./AccountContext";
import { saveTheme } from "../lib/localStore";
import { getDefaultSettings, getSettings, sendSettings } from "../lib/settings";
import { APP_ID } from "../App";
import { useIntl } from "@cookbook/solid-intl";
import { hexToNpub } from "../lib/keys";
import { settings as t } from "../translations";
import { getMobileReleases } from "../lib/releases";
import { logError } from "../lib/logger";

export type MobileReleases = {
  ios: { date: string, version: string },
  android: { date: string, version: string },
}

export type SettingsContextStore = {
  locale: string,
  theme: string,
  themes: PrimalTheme[],
  availableFeeds: PrimalFeed[],
  defaultFeed: PrimalFeed,
  defaultZap: ZapOption,
  availableZapOptions: ZapOption[],
  defaultZapAmountOld: number,
  zapOptionsOld: number[],
  notificationSettings: Record<string, boolean>,
  applyContentModeration: boolean,
  contentModeration: ContentModeration[],
  mobileReleases: MobileReleases,
  actions: {
    setTheme: (theme: PrimalTheme | null) => void,
    addAvailableFeed: (feed: PrimalFeed, addToTop?: boolean) => void,
    removeAvailableFeed: (feed: PrimalFeed) => void,
    setAvailableFeeds: (feedList: PrimalFeed[]) => void,
    moveAvailableFeed: (fromIndex: number, toIndex: number) => void,
    renameAvailableFeed: (feed: PrimalFeed, newName: string) => void,
    saveSettings: () => void,
    loadSettings: (pubkey: string) => void,
    setDefaultZapAmount: (option: ZapOption, temp?: boolean) => void,
    setZapOptions: (option: ZapOption, index: number, temp?: boolean) => void,
    resetZapOptionsToDefault: (temp?: boolean) => void,
    updateNotificationSettings: (key: string, value: boolean, temp?: boolean) => void,
    restoreDefaultFeeds: () => void,
    setApplyContentModeration: (flag: boolean) => void,
    modifyContentModeration: (name: string, content?: boolean, trending?: boolean) => void,
    refreshMobileReleases: () => void,
  }
}

export const initialData = {
  locale: 'en-us',
  theme: 'sunrise',
  themes,
  availableFeeds: [],
  defaultFeed: defaultFeeds[0],
  defaultZap: defaultZap,
  availableZapOptions: defaultZapOptions,
  defaultZapAmountOld: 21,
  zapOptionsOld: [21, 420, 1_000, 5_000, 10_000, 100_000],
  notificationSettings: { ...defaultNotificationSettings },
  applyContentModeration: true,
  contentModeration: [...defaultContentModeration],
  mobileReleases: {
    ios: { date: `${iosRD}`, version: iosVersion },
    android: { date: `${andRD}`, version: andVersion },
  },
};


export const SettingsContext = createContext<SettingsContextStore>();

export const SettingsProvider = (props: { children: ContextChildren }) => {

  const toaster = useToastContext();
  const account = useAccountContext();
  const intl = useIntl();

// ACTIONS --------------------------------------

  const setDefaultZapAmount = (option: ZapOption, temp?: boolean) => {
    updateStore('defaultZap', () => option);
    !temp && saveSettings();
  };

  const setZapOptions = (option: ZapOption, index: number, temp?: boolean) => {
    updateStore('availableZapOptions', index, () => ({ ...option }));
    !temp && saveSettings();
  };

  const resetZapOptionsToDefault = (temp?: boolean) => {
    const subid = `restore_default_${APP_ID}`;

    const unsub = subscribeTo(subid, async (type, subId, content) => {

      if (type === 'EVENT' && content?.content) {
        try {
          const settings = JSON.parse(content?.content);

          let options = settings.zapConfig;
          let amount = settings.zapDefault;

          updateStore('availableZapOptions', () => options);
          updateStore('defaultZap', () => amount);

          !temp && saveSettings();
        }
        catch (e) {
          logError('Error parsing settings response: ', e);
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

    getDefaultSettings(subid);
  }

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

  const setApplyContentModeration = (flag = true) => {
    updateStore('applyContentModeration', () => flag);

    saveSettings();
  };

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
      return af.hex === feed.hex && af.includeReplies === feed.includeReplies ? { ...af, name: newName } : { ...af };
    });
    setAvailableFeeds(list);
  };

  const updateNotificationSettings = (key: string, value: boolean, temp?: boolean) => {
    updateStore('notificationSettings', () => ({ [key]: value }));

    !temp && saveSettings();
  };

  const restoreDefaultFeeds = () => {

    const subid = `restore_default_${APP_ID}`;

    const unsub = subscribeTo(subid, async (type, subId, content) => {

      if (type === 'EVENT' && content?.content) {
        try {
          const settings = JSON.parse(content?.content);

          let feeds = settings.feeds as PrimalFeed[];

          if (account?.hasPublicKey()) {
            feeds.unshift({
              name: feedLatestWithRepliesLabel,
              hex: account?.publicKey,
              npub: hexToNpub(account?.publicKey),
              includeReplies: true,
            });
            feeds.unshift({
              name: feedLatestLabel,
              hex: account?.publicKey,
              npub: hexToNpub(account?.publicKey),
            });
          }

          updateStore('availableFeeds',
            () => replaceAvailableFeeds(account?.publicKey, feeds),
          );

          updateStore('defaultFeed', () => store.availableFeeds[0]);

          saveSettings();
        }
        catch (e) {
          logError('Error parsing settings response: ', e);
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

  const modifyContentModeration = (name: string, content = true, trending = true) => {
    let scopes: string[] = [];
    if (content) scopes.push(contentScope);
    if (trending) scopes.push(trendingScope);

    updateStore('contentModeration', x => x.name === name, () => ({ scopes }));
    saveSettings();
  };

  const saveSettings = (then?: () => void) => {
    const settings = {
      theme: store.theme,
      feeds: store.availableFeeds,
      zapDefault: store.defaultZap,
      zapConfig: store.availableZapOptions,
      defaultZapAmount: store.defaultZapAmountOld,
      zapOptions: store.zapOptionsOld,
      notifications: store.notificationSettings,
      applyContentModeration: store.applyContentModeration,
      contentModeration: store.contentModeration,
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
          const notificationSettings = settings.notifications as Record<string, boolean>;

          updateStore('availableFeeds',
            () => replaceAvailableFeeds(account?.publicKey, feeds),
          );

          updateStore('defaultFeed', () => store.availableFeeds.find(x => x.hex === nostrHighlights) || store.availableFeeds[0]);

          updateStore('notificationSettings', () => ({ ...notificationSettings } || { ...defaultNotificationSettings }));
          updateStore('applyContentModeration', () => true);

          let zapOptions = settings.zapConfig;
          let zapAmount = settings.zapDefault;

          updateStore('defaultZap', () => zapAmount);
          updateStore('availableZapOptions', () => zapOptions);
        }
        catch (e) {
          logError('Error parsing settings response: ', e);
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

  const loadSettings = (pubkey: string | undefined, then?: () => void) => {

    if (!pubkey) {
      return;
    }

    const subid = `load_settings_${APP_ID}`;

    const unsub = subscribeTo(subid, async (type, subId, content) => {

      if (type === 'EVENT' && content?.content) {
        try {
          const {
            theme,
            feeds,
            zapDefault,
            zapConfig,
            defaultZapAmount,
            zapOptions,
            notifications,
            applyContentModeration,
            contentModeration,
          } = JSON.parse(content?.content);

          theme && setThemeByName(theme, true);

          // If new setting is missing, merge with the old setting
          if (zapDefault) {
            setDefaultZapAmount(zapDefault, true);
          }
          else {
            setDefaultZapAmount({ ...defaultZap, amount: defaultZapAmount }, true);
          }

          // If new setting is missing, merge with the old setting
          if (zapConfig) {
            updateStore('availableZapOptions', () => [...zapConfig]);
          }
          else {
            const newConfig = defaultZapOptions.map((o, i) => ({ ...o, amount: zapOptions[i]}));
            updateStore('availableZapOptions', () => [...newConfig]);
          }

          updateStore('defaultZapAmountOld' , () => defaultZapAmount);
          updateStore('zapOptionsOld', () => zapOptions);

          if (notifications) {
            updateStore('notificationSettings', () => ({ ...notifications }));
          }
          else {
            updateStore('notificationSettings', () => ({ ...defaultNotificationSettings}));
          }

          updateStore('applyContentModeration', () => applyContentModeration === false ? false : true);

          if (Array.isArray(contentModeration) && contentModeration.length === 0) {
            updateStore('contentModeration', () => [...defaultContentModeration]);
          }
          else if (Array.isArray(contentModeration)) {
            for (let i=0; i < contentModeration.length; i++) {
              const m = contentModeration[i];
              const index = store.contentModeration.findIndex(x => x.name === m.name);

              updateStore(
                'contentModeration',
                index < 0 ? store.contentModeration.length : index,
                () => ({...m}),
              );
            }
          }

          if (feeds) {

            let fs = [...feeds];

            const feedLatest = {
              name: feedLatestLabel,
              hex: account?.publicKey,
              npub: hexToNpub(account?.publicKey),
            };

            const feedLatestWithReplies = {
              name: feedLatestWithRepliesLabel,
              hex: account?.publicKey,
              npub: hexToNpub(account?.publicKey),
              includeReplies: true,
            };

            if (!fs.find(f => f.hex === feedLatest.hex && f.includeReplies === undefined)) {
              fs.push(feedLatest);
            }

            if (!fs.find(f => f.hex === feedLatestWithReplies.hex && f.includeReplies === true)) {
              const latestIndex = fs.findIndex(f => f.hex === feedLatest.hex && f.includeReplies === undefined);

              if (latestIndex >= 0) {
                fs.splice(latestIndex + 1, 0, feedLatestWithReplies);
              }
              else {
                fs.push(feedLatestWithReplies);
              }
            }

            setAvailableFeeds(fs, true);
          }
        }
        catch (e) {
          logError('Error parsing settings response: ', e);
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

      then && then();
      unsub();
      return;
    });

    pubkey && getSettings(pubkey, subid);
  }

  const refreshMobileReleases = () => {
    const subid = `mobile_releases_${APP_ID}`;

    const unsub = subscribeTo(subid, async (type, subId, content) => {

      if (type === 'EVENT') {
        const releases = JSON.parse(content?.content || '{}') as MobileReleases;
        updateStore('mobileReleases', () => ({ ...releases }));
      }

      if (type === 'EOSE') {
        unsub();
      }
    });

    getMobileReleases(subid);
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
    // Set global theme, this is done to avoid changing the theme
    // when waiting for pubkey (like when reloading a page).
    const storedTheme = localStorage.getItem('theme');
    setThemeByName(storedTheme, true);
    refreshMobileReleases();
  });


  // This is here as to not trigger the effect
  // TODO Solve this.
  const feedLatestLabel = intl.formatMessage(t.feedLatest);
  const feedLatestWithRepliesLabel = intl.formatMessage(t.feedLatestWithReplies);

  // let publicKey: string | undefined;

  // Initial setup for a user with a public key
  createEffect(() => {
    if (!account?.hasPublicKey() && account?.isKeyLookupDone) {
      loadDefaults();
      return;
    }

    const publicKey = account?.publicKey;

    const initFeeds = initAvailableFeeds(publicKey);

    if (initFeeds && initFeeds.length > 0) {
      updateStore('defaultFeed', () => initFeeds[0]);
      updateStore('availableFeeds', () => replaceAvailableFeeds(publicKey, initFeeds));
    }

    const feedLatest = {
      name: feedLatestLabel,
      hex: publicKey,
      npub: hexToNpub(publicKey),
    };

    const feedLatestWithReplies = {
      name: feedLatestWithRepliesLabel,
      hex: publicKey,
      npub: hexToNpub(publicKey),
      includeReplies: true,
    };

    // Add trendingFeed if it's missing
    // @ts-ignore
    // if (initFeeds && !initFeeds.find((f) => f.hex === trendingFeed.hex)) {
    //   addAvailableFeed(trendingFeed, true, false);
    // }

    loadSettings(publicKey, () => {
      const fwr = initFeeds?.find(f => f.hex === feedLatestWithReplies.hex && f.includeReplies === feedLatestWithReplies.includeReplies);

      // Add active user's feed if it's missing
      // @ts-ignore
      if (!fwr) {
        addAvailableFeed(feedLatestWithReplies, true, false);
      }


      // Add active user's feed if it's missing
      // @ts-ignore
      if (initFeeds && !initFeeds.find(f => f.hex === feedLatest.hex && f.includeReplies === feedLatest.includeReplies)) {
        addAvailableFeed(feedLatest, true, false);
      }
    });
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
      restoreDefaultFeeds,
      setDefaultZapAmount,
      setZapOptions,
      resetZapOptionsToDefault,
      updateNotificationSettings,
      setApplyContentModeration,
      modifyContentModeration,
      refreshMobileReleases,
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
