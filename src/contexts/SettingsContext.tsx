import { createStore } from "solid-js/store";
import { useToastContext } from "../components/Toaster/Toaster";
import { Kind, NotificationType, andRD, andVersion, contentScope, defaultContentModeration, defaultFeeds, defaultNotificationAdditionalSettings, defaultNotificationSettings, defaultZap, defaultZapOptions, iosRD, iosVersion, nostrHighlights, themes, trendingFeed, trendingScope } from "../constants";
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
  subsTo
} from "../sockets";
import {
  ContentModeration,
  ContextChildren,
  PrimalArticleFeed,
  PrimalFeed,
  PrimalTheme,
  ZapOption,
} from "../types/primal";
import {
  initHomeFeeds,
  initReadsFeeds,
  loadHomeFeeds,
  loadReadsFeeds,
  removeFromAvailableFeeds,
  replaceAvailableFeeds,
  updateAvailableFeeds,
  updateAvailableFeedsTop
} from "../lib/availableFeeds";
import { useAccountContext } from "./AccountContext";
import { readSystemDarkMode, saveAnimated, saveHomeFeeds, saveNWC, saveNWCActive, saveReadsFeeds, saveSystemDarkMode, saveTheme } from "../lib/localStore";
import { getDefaultSettings, getHomeSettings, getNWCSettings, getReadsSettings, getSettings, sendSettings, setHomeSettings, setReadsSettings } from "../lib/settings";
import { APP_ID } from "../App";
import { useIntl } from "@cookbook/solid-intl";
import { feedProfile, feedProfileDesription, settings as t } from "../translations";
import { getMobileReleases } from "../lib/releases";
import { logError } from "../lib/logger";
import { fetchDefaultArticleFeeds, fetchDefaultHomeFeeds } from "../lib/feed";
import { getDefaultBlossomServers } from "../lib/relays";
import { runColorMode } from "../utils";

export type MobileReleases = {
  ios: { date: string, version: string },
  android: { date: string, version: string },
}

export type SettingsContextStore = {
  locale: string,
  theme: string,
  themes: PrimalTheme[],
  useSystemTheme: boolean,
  isAnimated: boolean,
  availableFeeds: PrimalFeed[],
  readsFeeds: PrimalArticleFeed[],
  homeFeeds: PrimalArticleFeed[],
  defaultFeed: PrimalFeed,
  defaultZap: ZapOption,
  availableZapOptions: ZapOption[],
  defaultZapAmountOld: number,
  zapOptionsOld: number[],
  notificationSettings: Record<string, boolean>,
  notificationAdditionalSettings: Record<string, boolean>,
  applyContentModeration: boolean,
  contentModeration: ContentModeration[],
  mobileReleases: MobileReleases,
  recomendedBlossomServers: string[],
  actions: {
    setTheme: (theme: PrimalTheme | null) => void,
    setThemeByName: (theme: string | null, temp?: boolean) => void,
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
    updateNotificationSettingsBulk: (entries: Record<string, boolean>, temp?: boolean) => void,
    updateNotificationAdditionalSettings: (key: string, value: boolean, temp?: boolean) => void,
    restoreDefaultFeeds: () => void,
    setApplyContentModeration: (flag: boolean) => void,
    modifyContentModeration: (name: string, content?: boolean, trending?: boolean) => void,
    refreshMobileReleases: () => void,
    setProxyThroughPrimal: (shouldProxy: boolean, temp?: boolean) => void,
    getDefaultReadsFeeds: () => void,
    getDefaultHomeFeeds: () => void,
    restoreReadsFeeds: () => void,
    restoreHomeFeeds: () => void,
    addProfileHomeFeed: ( name: string, pubkey: string | undefined) => void,
    removeProfileHomeFeed: (pubkey: string | undefined) => void,
    hasProfileFeedAtHome: (pubkey: string | undefined) => boolean,
    moveHomeFeed: (fromIndex: number, toIndex: number) => void,
    renameHomeFeed: (feed: PrimalArticleFeed, newName: string) => void,
    moveFeed: (fromIndex: number, toIndex: number, feedType: FeedType) => void,
    renameFeed: (feed: PrimalArticleFeed, newName: string, feedType: FeedType) => void,
    enableFeed: (feed: PrimalArticleFeed, enabled: boolean, feedType: FeedType) => void,
    addFeed: (feed: PrimalArticleFeed, feedType: FeedType) => void,
    removeFeed: (feed: PrimalArticleFeed, feedType: FeedType) => void,
    isFeedAdded: (feed: PrimalArticleFeed, destination: 'home' | 'reads') => boolean,
    setAnimation: (isAnimated: boolean, temp?: boolean) => void,
    getRecomendedBlossomServers: () => void,
    setUseSystemTheme: (v: boolean) => void,
  }
}

export const initialData = {
  locale: 'en-us',
  theme: 'sunrise',
  themes,
  useSystemTheme: false,
  isAnimated: true,
  availableFeeds: [],
  readsFeeds: [],
  homeFeeds: [],
  defaultFeed: defaultFeeds[0],
  defaultZap: defaultZap,
  availableZapOptions: defaultZapOptions,
  defaultZapAmountOld: 21,
  zapOptionsOld: [21, 420, 1_000, 5_000, 10_000, 100_000],
  notificationSettings: { ...defaultNotificationSettings },
  notificationAdditionalSettings: { ...defaultNotificationAdditionalSettings },
  applyContentModeration: true,
  contentModeration: [...defaultContentModeration],
  mobileReleases: {
    ios: { date: `${iosRD}`, version: iosVersion },
    android: { date: `${andRD}`, version: andVersion },
  },
  recomendedBlossomServers: [],
};

export type FeedType = 'home' | 'reads';


export const SettingsContext = createContext<SettingsContextStore>();

export const SettingsProvider = (props: { children: ContextChildren }) => {

  const toaster = useToastContext();
  const account = useAccountContext();
  const intl = useIntl();

// ACTIONS --------------------------------------

  const setUseSystemTheme = (flag: boolean) => {
    updateStore('useSystemTheme', () => flag);
    saveSystemDarkMode(account?.publicKey, flag);

    if (['sunrise', 'sunset'].includes(store.theme)) {
      setThemeByName(flag ? 'sunset' : 'sunrise', true);
    } else {
      setThemeByName(flag ? 'midnight' : 'ice', true);
    }
  }

  const getRecomendedBlossomServers = () => {
    const subId = `recommended_blossom_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        const list = JSON.parse(content.content || '[]') as string[];
        updateStore('recomendedBlossomServers', () => [ ...list ]);
      },
      onEose: () => {
        unsub();
      },
    })

    getDefaultBlossomServers(subId);
  };

  const setProxyThroughPrimal = (shouldProxy: boolean, temp?: boolean) => {
    account?.actions.setProxyThroughPrimal(shouldProxy);

    !temp && saveSettings();
  }

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

    const unsub = subsTo(subid, {
      onEvent: (_, content) => {
        if (!content) return;
        try {
          const settings = JSON.parse(content?.content || '{}');

          let options = settings.zapConfig;
          let amount = settings.zapDefault;

          updateStore('availableZapOptions', () => options);
          updateStore('defaultZap', () => amount);


          !temp && saveSettings();
        }
        catch (e) {
          logError('Error parsing settings response: ', e);
        }
      },
      onNotice: () => {
        toaster?.sendWarning(intl.formatMessage({
          id: 'settings.loadFail',
          defaultMessage: 'Failed to load settings. Will be using local settings.',
          description: 'Toast message after settings have failed to be loaded from the server',
        }));
      },
      onEose: () => {
        unsub();
      },
    });

    getDefaultSettings(subid);
  }

  const setTheme = (theme: PrimalTheme | null, temp?: boolean) => {
    const forced = localStorage.getItem('forceTheme');

    if (forced && ['sunrise', 'sunset', 'midnight', 'ice'].includes(forced)) {
      updateStore('theme', () => forced);
      return;
    }

    if (!theme) {
      return;
    }

    updateStore('theme', () => theme.name);
    if (!temp) {
      saveTheme(account?.publicKey, theme.name);

      saveSettings();
    }
  }

  const setThemeByName = (name: string | null, temp?: boolean) => {
    if (!name) {
      return;
    }

    const availableTheme = store.themes.find(t => t.name === name);
    availableTheme && setTheme(availableTheme, temp);
  }

  const setAnimation = (isAnimated: boolean, temp?: boolean) => {

    saveAnimated(account?.publicKey, isAnimated);
    updateStore('isAnimated', () => isAnimated);

    !temp && saveSettings();
  };

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

  const specifyUserFeed = (pubkey: string) => JSON.stringify({ id: "feed", kind: "notes", pubkey });

  const addProfileHomeFeed = (name: string, pubkey: string | undefined) => {
    if (!pubkey) return;


    const feed: PrimalArticleFeed = {
      name: intl.formatMessage(feedProfile, { name }),
      spec: specifyUserFeed(pubkey),
      description: intl.formatMessage(feedProfileDesription, { name }),
      enabled: true,
      feedkind: 'user',
    };

    const list = [ ...store.homeFeeds, { ...feed }];

    updateHomeFeeds(list);
  }

  const removeProfileHomeFeed = (pubkey: string | undefined) => {
    if (!pubkey) return;

    const spec = specifyUserFeed(pubkey);
    const list = store.homeFeeds.filter(f => f.spec !== spec);

    updateHomeFeeds(list);
  }

  const removeFeed = (feed: PrimalArticleFeed, feedType: FeedType) => {

    if (feedType === 'home') {
      const updated = store.homeFeeds.filter(f => f.spec !== feed.spec);
      updateHomeFeeds(updated);
    }

    if (feedType === 'reads') {
      const updated = store.readsFeeds.filter(f => f.spec !== feed.spec);
      updateReadsFeeds(updated);
    }
  }

  const moveFeed = (fromIndex: number, toIndex: number, feedType: FeedType) => {

    if (feedType === 'home') {
      moveHomeFeed(fromIndex, toIndex);
    }

    if (feedType === 'reads') {
      moveReadsFeed(fromIndex, toIndex);
    }
  };

  const renameFeed = (feed: PrimalArticleFeed, newName: string, feedType: FeedType) => {
    if (feedType === 'home') {
      renameHomeFeed(feed, newName);
    }

    if (feedType === 'reads') {
      renameReadsFeed(feed, newName);
    }
  };

  const enableFeed = (feed: PrimalArticleFeed, enabled: boolean, feedType: FeedType) => {
    if (feedType === 'home') {
      enableHomeFeed(feed, enabled);
    }

    if (feedType === 'reads') {
      enableReadsFeed(feed, enabled);
    }
  }

  const addFeed = (feed: PrimalArticleFeed, feedType: FeedType) => {
    if (feedType === 'home') {
      addHomeFeed(feed);
    }

    if (feedType === 'reads') {
      addReadsFeed(feed);
    }
  }

  const hasProfileFeedAtHome = (pubkey: string | undefined) => {
    if (!pubkey) return false;

    const spec = specifyUserFeed(pubkey);

    return store.homeFeeds.find(f => f.spec === spec) !== undefined;
  }

  const restoreHomeFeeds = () => {
    const subId = `restore_feeds_${APP_ID}`;

    let feeds: PrimalArticleFeed[] = []

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        feeds = JSON.parse(content.content || '[]') as PrimalArticleFeed[];

        updateStore('homeFeeds', () => [...feeds]);
      },
      onEose: () => {
        unsub();
        updateHomeFeeds(feeds)
      },
    });

    fetchDefaultHomeFeeds(subId);
  }

  const restoreReadsFeeds = () => {
    const subId = `restore_feeds_${APP_ID}`;

    let feeds: PrimalArticleFeed[] = []

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        feeds = JSON.parse(content.content || '[]') as PrimalArticleFeed[];

        updateStore('readsFeeds', () => [...feeds]);
      },
      onEose: () => {
        unsub();
        updateReadsFeeds(feeds)
      },
    });

    fetchDefaultArticleFeeds(subId);
  }

  const updateHomeFeeds = (feeds: PrimalArticleFeed[]) => {
    updateStore('homeFeeds', () => [...feeds]);
    saveHomeFeeds(account?.publicKey, feeds);

    const subId = `set_home_feeds_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEose: () => { unsub(); }
    })

    setHomeSettings(subId, store.homeFeeds)
  }

  const updateReadsFeeds = (feeds: PrimalArticleFeed[]) => {
    updateStore('readsFeeds', () => [...feeds]);
    saveHomeFeeds(account?.publicKey, feeds);

    const subId = `set_home_feeds_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEose: () => { unsub(); }
    })

    setReadsSettings(subId, store.readsFeeds)
  }

  const moveHomeFeed = (fromIndex: number, toIndex: number) => {

    let list = [...store.homeFeeds];

    list.splice(toIndex, 0, list.splice(fromIndex, 1)[0]);

    updateHomeFeeds(list);
  };

  const moveReadsFeed = (fromIndex: number, toIndex: number) => {

    let list = [...store.readsFeeds];

    list.splice(toIndex, 0, list.splice(fromIndex, 1)[0]);

    updateReadsFeeds(list);
  };

  const renameHomeFeed = (feed: PrimalArticleFeed, newName: string) => {
    const list = store.homeFeeds.map(f => {
      return f.spec === feed.spec ? { ...f, name: newName } : { ...f };
    });
    updateHomeFeeds(list);
  };

  const renameReadsFeed = (feed: PrimalArticleFeed, newName: string) => {
    const list = store.readsFeeds.map(f => {
      return f.spec === feed.spec ? { ...f, name: newName } : { ...f };
    });
    updateReadsFeeds(list);
  };

  const enableHomeFeed = (feed: PrimalArticleFeed, enabled: boolean) => {
    const list = store.homeFeeds.map(f => {
      return f.spec === feed.spec ? { ...f, enabled } : { ...f };
    });

    updateHomeFeeds(list);
  };

  const enableReadsFeed = (feed: PrimalArticleFeed, enabled: boolean) => {
    const list = store.readsFeeds.map(f => {
      return f.spec === feed.spec ? { ...f, enabled } : { ...f };
    });

    updateReadsFeeds(list);
  };

  const isFeedAdded: (f: PrimalArticleFeed, d: 'home' | 'reads') => boolean = (feed: PrimalArticleFeed, destination: 'home' | 'reads') => {
    if (destination === 'reads') {
      return store.readsFeeds.find(f => f.spec === feed.spec) !== undefined;
    }
    return store.homeFeeds.find(f => f.spec === feed.spec) !== undefined;
  }

  const addHomeFeed = (feed: PrimalArticleFeed) => {
    const list = [ ...store.homeFeeds, {...feed}];

    updateHomeFeeds(list);
  };

  const addReadsFeed = (feed: PrimalArticleFeed) => {
    const list = [ ...store.readsFeeds, {...feed}];

    updateReadsFeeds(list);
  };

  const updateNotificationSettingsBulk = (entries: Record<string, boolean>, temp?: boolean) => {
    const update = Object.entries(entries).reduce<Record<string, boolean>>((acc, [key, value]) => {
      return { ...acc, [key]: value };
    }, {})
    updateStore('notificationSettings', () => ({ ...update }));


    !temp && saveSettings();
  };

  const updateNotificationSettings = (key: string, value: boolean, temp?: boolean) => {
    updateStore('notificationSettings', () => ({ [key]: value }));


    !temp && saveSettings();
  };

  const updateNotificationAdditionalSettings = (key: string, value: boolean, temp?: boolean) => {
    updateStore('notificationAdditionalSettings', () => ({ [key]: value }));

    !temp && saveSettings();
  };

  const restoreDefaultFeeds = () => {

    // const subid = `restore_default_${APP_ID}`;

    // const unsub = subscribeTo(subid, async (type, subId, content) => {

    //   if (type === 'EVENT' && content?.content) {
    //     try {
    //       const settings = JSON.parse(content?.content);

    //       let feeds = settings.feeds as PrimalFeed[];

    //       if (account?.hasPublicKey()) {
    //         feeds.unshift({
    //           name: feedLatestWithRepliesLabel,
    //           hex: account?.publicKey,
    //           npub: hexToNpub(account?.publicKey),
    //           includeReplies: true,
    //         });
    //         feeds.unshift({
    //           name: feedLatestLabel,
    //           hex: account?.publicKey,
    //           npub: hexToNpub(account?.publicKey),
    //         });
    //       }

    //       updateStore('availableFeeds',
    //         () => replaceAvailableFeeds(account?.publicKey, feeds),
    //       );

    //       updateStore('defaultFeed', () => store.availableFeeds[0]);

    //       saveSettings();
    //     }
    //     catch (e) {
    //       logError('Error parsing settings response: ', e);
    //     }
    //   }

    //   if (type === 'NOTICE') {
    //     toaster?.sendWarning(intl.formatMessage({
    //       id: 'settings.loadFail',
    //       defaultMessage: 'Failed to load settings. Will be using local settings.',
    //       description: 'Toast message after settings have failed to be loaded from the server',
    //     }));
    //   }

    //   unsub();
    //   return;
    // });

    // getDefaultSettings(subid)
  };

  const modifyContentModeration = (name: string, content = true, trending = true) => {
    let scopes: string[] = [];
    if (content) scopes.push(contentScope);
    if (trending) scopes.push(trendingScope);

    updateStore('contentModeration', x => x.name === name, () => ({ scopes }));


    saveSettings();
  };

  const saveSettings = (then?: () => void) => {
    let notificationsAdditional = { ...store.notificationAdditionalSettings };

    for (let notifType in NotificationType) {
      if (notificationsAdditional[notifType] !== undefined) {
        delete notificationsAdditional[notifType];
      }
    }

    const settings = {
      theme: store.theme,
      feeds: store.availableFeeds,
      zapDefault: store.defaultZap,
      zapConfig: store.availableZapOptions,
      defaultZapAmount: store.defaultZapAmountOld,
      zapOptions: store.zapOptionsOld,
      notifications: store.notificationSettings,
      notificationsAdditional,
      applyContentModeration: store.applyContentModeration,
      contentModeration: store.contentModeration,
      proxyThroughPrimal: account?.proxyThroughPrimal || false,
      animated: store.isAnimated,
    };

    const subid = `save_settings_${APP_ID}`;

    const unsub = subsTo(subid, {
      onNotice: () => {
        toaster?.sendWarning(intl.formatMessage({
          id: 'settings.saveFail',
          defaultMessage: 'Failed to save settings',
          description: 'Toast message after settings have failed to be saved on the server',
        }));
      },
      onEose: () => {
        unsub();
      }
    });

    sendSettings(settings, subid);
  }

  const loadDefaults = () => {

    const subid = `load_defaults_${APP_ID}`;

    const unsub = subsTo(subid, {
      onEvent: (_, content) => {
        if (!content) return;

        try {
          const settings = JSON.parse(content.content || '{}');

          const feeds = settings.feeds as PrimalFeed[];
          const notificationSettings = settings.notifications as Record<string, boolean>;
          const notificationAdditionalSettings = settings.notificationsAdditional as Record<string, boolean>;

          updateStore('availableFeeds',
            () => replaceAvailableFeeds(account?.publicKey, feeds),
          );

          updateStore('defaultFeed', () => store.availableFeeds.find(x => x.hex === nostrHighlights) || store.availableFeeds[0]);

          updateStore('notificationSettings', () => ({ ...notificationSettings } || { ...defaultNotificationSettings }));
          updateStore('notificationAdditionalSettings', () => ({ ...notificationAdditionalSettings } || { ...defaultNotificationAdditionalSettings }));
          updateStore('applyContentModeration', () => true);

          let zapOptions = settings.zapConfig;
          let zapAmount = settings.zapDefault;

          updateStore('defaultZap', () => zapAmount);
          updateStore('availableZapOptions', () => zapOptions);
        }
        catch (e) {
          logError('Error parsing settings response: ', e);
        }
      },
      onNotice: () => {
        toaster?.sendWarning(intl.formatMessage({
          id: 'settings.loadFail',
          defaultMessage: 'Failed to load settings. Will be using local settings.',
          description: 'Toast message after settings have failed to be loaded from the server',
        }));
      },
      onEose: () => {
        unsub();
      },
    });

    getDefaultSettings(subid);
    getDefaultHomeFeeds();
    getDefaultReadsFeeds();
    getRecomendedBlossomServers();
  };

  const loadSettings = (pubkey: string | undefined, then?: () => void) => {

    if (!pubkey) {
      return;
    }

    updateStore('homeFeeds', () => [ ...loadHomeFeeds(pubkey) ])
    updateStore('readsFeeds', () => [ ...loadReadsFeeds(pubkey) ])

    const settingsSubId = `load_settings_${APP_ID}`;
    const settingsHomeSubId = `load_home_settings_${APP_ID}`;
    const settingsReadsSubId = `load_reads_settings_${APP_ID}`;
    const settingsNWCSubId = `load_nwc_settings_${APP_ID}`;

    const unsubSettings = subsTo(settingsSubId, {
      onEvent: (_, content) => {
        if (!content) return;

        try {
          const {
            animated,
            theme,
            zapDefault,
            zapConfig,
            defaultZapAmount,
            zapOptions,
            notifications,
            notificationsAdditional,
            applyContentModeration,
            contentModeration,
            proxyThroughPrimal,
          } = JSON.parse(content.content || '{}');

          if (store.useSystemTheme) {

            runColorMode((isDark) => {
              if (['sunrise', 'sunset'].includes(theme)) {
                setThemeByName(isDark ? 'sunset' : 'sunrise', true);
              } else {
                setThemeByName(isDark ? 'midnight' : 'ice', true);
              }
            }, () => {
              theme && setThemeByName(theme, true);
            })
          }
          else if (theme) {
            setThemeByName(theme, true);
          }

          setAnimation(animated, true);

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

          if (notificationsAdditional) {
            updateStore('notificationAdditionalSettings', () => ({ ...notificationsAdditional }));
          }
          else {
            updateStore('notificationAdditionalSettings', () => ({ ...defaultNotificationAdditionalSettings }));
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

          account?.actions.setProxyThroughPrimal(proxyThroughPrimal);
        }
        catch (e) {
          logError('Error parsing settings response: ', e);
        }
      },
      onNotice: () => {
        toaster?.sendWarning(intl.formatMessage({
          id: 'settings.loadFail',
          defaultMessage: 'Failed to load settings. Will be using local settings.',
          description: 'Toast message after settings have failed to be loaded from the server',
        }));
      },
      onEose: () => {
        then && then();
        unsubSettings();
      },
    });

    pubkey && getSettings(pubkey, settingsSubId);

    const unsubHomeSettings = subsTo(settingsHomeSubId, {
      onEvent: (_, content) => {
        const feeds = JSON.parse(content?.content || '[]');

        updateStore('homeFeeds', () => [...feeds]);
      },
      onEose: () => {
        if (store.homeFeeds.length === 0) {
          getDefaultHomeFeeds();
        }
        saveHomeFeeds(pubkey, store.homeFeeds);
        unsubHomeSettings();
      }
    });

    pubkey && getHomeSettings(settingsHomeSubId);

    const unsubReadsSettings = subsTo(settingsReadsSubId, {
      onEvent: (_, content) => {
        const feeds = JSON.parse(content?.content || '[]');

        updateStore('readsFeeds', [...feeds])
      },
      onEose: () => {
        if (store.readsFeeds.length === 0) {
          getDefaultReadsFeeds();
        }
        saveReadsFeeds(pubkey, store.readsFeeds);
        unsubReadsSettings();
      }
    });

    pubkey && getReadsSettings(settingsReadsSubId);

    let nwcList: string[][] = [];
    let activeNWC: string[] = [];

    const unsubNWCSettings = subsTo(settingsNWCSubId, {
      onEvent: (_, content) => {
        const nwcSettings = JSON.parse(content?.content || '{}');

        nwcList = nwcSettings.nwcList;
        activeNWC = nwcSettings.nwcActive;
      },
      onEose: () => {
        if (store.readsFeeds.length === 0) {
          getDefaultReadsFeeds();
        }
        saveNWC(pubkey, nwcList)
        activeNWC.length > 0 && saveNWCActive(pubkey, activeNWC[0], activeNWC[1]);
        unsubNWCSettings();
      }
    });

    pubkey && getNWCSettings(settingsNWCSubId);

    getRecomendedBlossomServers();
  }

  const refreshMobileReleases = () => {
    const subid = `mobile_releases_${APP_ID}`;

    const unsub = subsTo(subid, {
      onEvent: (_, content) => {
        const releases = JSON.parse(content?.content || '{}') as MobileReleases;
        updateStore('mobileReleases', () => ({ ...releases }));
      },
      onEose: () => {
        unsub();
      },
    });

    getMobileReleases(subid);
  };

  const getDefaultReadsFeeds = () => {
    const subId = `article_feeds_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        const feeds = JSON.parse(content.content || '[]');

        updateStore('readsFeeds', () => [...feeds]);
      },
      onEose: () => {
        unsub();
        initReadsFeeds(account?.publicKey, store.readsFeeds);
      },
    });

    fetchDefaultArticleFeeds(subId);
  }

  const getDefaultHomeFeeds = () => {
    const subId = `home_feeds_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        const feeds = JSON.parse(content.content || '[]');

        updateStore('homeFeeds', () => [...feeds]);
      },
      onEose: () => {
        unsub();
        initHomeFeeds(account?.publicKey, store.homeFeeds)
      },
    });

    fetchDefaultHomeFeeds(subId);
  }

  const resolveTheme = () => {
    const storedTheme = localStorage.getItem('theme') || 'sunrise';
    const pubkey = localStorage.getItem('pubkey') || undefined;
    const useSystemDarkMode = readSystemDarkMode(pubkey);

    updateStore('useSystemTheme', () => useSystemDarkMode || false);

    if (useSystemDarkMode) {
      runColorMode((isDark) => {
        if (['sunrise', 'sunset'].includes(storedTheme)) {
          setThemeByName(isDark ? 'sunset' : 'sunrise', true);
        } else {
          setThemeByName(isDark ? 'midnight' : 'ice', true);
        }
      }, () => {
        setThemeByName(storedTheme, true);
      })
    } else {
      setThemeByName(storedTheme, true);
    }
  }

// EFFECTS --------------------------------------

  onMount(() => {
    const forced = localStorage.getItem('forceTheme');

    if (forced && ['sunrise', 'sunset', 'midnight', 'ice'].includes(forced)) {
      updateStore('theme', () => forced);
      return;
    }

    // Set global theme, this is done to avoid changing the theme
    // when waiting for pubkey (like when reloading a page).
    resolveTheme();
    // const storedTheme = localStorage.getItem('theme');
    // setThemeByName(storedTheme, true);

    const storedAnimated = localStorage.getItem('animated') || 'true';
    const anim = storedAnimated === 'true' ? true : false;
    setAnimation(anim, true);

    refreshMobileReleases();
  });

  // Initial setup for a user with a public key
  createEffect(() => {
    if (!account?.hasPublicKey() && account?.isKeyLookupDone) {
      loadDefaults();
      return;
    }

    const publicKey = account?.publicKey;

    if (!isConnected()) return;

    loadSettings(publicKey, () => {
    });
  });

  createEffect(() => {
    const html: HTMLElement | null = document.querySelector('html');
    localStorage.setItem('theme', store.theme);
    html?.setAttribute('data-theme', store.theme);
  });

  createEffect(() => {
    const html: HTMLElement | null = document.querySelector('html');
    localStorage.setItem('animated', `${store.isAnimated}`);
    html?.setAttribute('data-animated', `${store.isAnimated}`);
  });

// STORES ---------------------------------------


  const [store, updateStore] = createStore<SettingsContextStore>({
    ...initialData,
    actions: {
      setTheme,
      setThemeByName,
      addAvailableFeed,
      removeAvailableFeed,
      setAvailableFeeds,
      moveAvailableFeed,
      renameAvailableFeed,
      addProfileHomeFeed,
      removeProfileHomeFeed,
      hasProfileFeedAtHome,
      moveHomeFeed,
      renameHomeFeed,
      saveSettings,
      loadSettings,
      restoreDefaultFeeds,
      setDefaultZapAmount,
      setZapOptions,
      resetZapOptionsToDefault,
      updateNotificationSettings,
      updateNotificationSettingsBulk,
      updateNotificationAdditionalSettings,
      setApplyContentModeration,
      modifyContentModeration,
      refreshMobileReleases,
      setProxyThroughPrimal,
      getDefaultReadsFeeds,
      getDefaultHomeFeeds,
      restoreReadsFeeds,
      restoreHomeFeeds,

      moveFeed,
      renameFeed,
      enableFeed,
      addFeed,
      removeFeed,
      isFeedAdded,

      setAnimation,

      getRecomendedBlossomServers,
      setUseSystemTheme,
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
