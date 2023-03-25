import { noteEncode } from "nostr-tools/nip19";
import { createStore, unwrap } from "solid-js/store";
import { useToastContext } from "../components/Toaster/Toaster";
import { getThread, getUserFeed } from "../lib/feed";
import { convertToNotes, sortByRecency } from "../stores/note";
import { profile, setPublicKey } from "../stores/profile";
import { defaultFeeds, Kind, noKey, trendingFeed } from "../constants";
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
  FeedPage,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  NostrWindow,
  PrimalFeed,
  PrimalNote,
  PrimalUser,
} from "../types/primal";
import { APP_ID } from "../App";
import { initAvailableFeeds, removeFromAvailableFeeds, replaceAvailableFeeds, updateAvailableFeeds, updateAvailableFeedsTop } from "../lib/availableFeeds";
import { hexToNpub } from "../lib/keys";
import { getLikes } from "../lib/notes";
import { fetchLikes, getUserProfile } from "../lib/profile";
import { Relay, relayInit } from "nostr-tools";

export type SettingsContextStore = {
  theme: string,
  likes: string[],
  relays: Relay[],
  publicKey: string | undefined,
  activeUser: PrimalUser | undefined,
  availableFeeds: PrimalFeed[],
  actions: {
    setTheme: (theme: string | null) => void,
    addAvailableFeed: (feed: PrimalFeed, addToTop?: boolean) => void,
    removeAvailableFeed: (feed: PrimalFeed) => void,
    setAvailableFeeds: (feedList: PrimalFeed[]) => void,
  }
}

export const initialData = {
  theme: 'sunset',
  likes: [],
  relays: [],
  publicKey: undefined,
  activeUser: undefined,
  availableFeeds: [ ...defaultFeeds ],
};


export const SettingsContext = createContext<SettingsContextStore>();

export const SettingsProvider = (props: { children: ContextChildren }) => {

  const toaster = useToastContext();

// ACTIONS --------------------------------------

  const setTheme = (theme: string | null) => {
    if (!theme) {
      return;
    }

    updateStore('theme', () => theme);
  }

  const addAvailableFeed = (feed: PrimalFeed, addToTop = false) => {
    if (!feed) {
      return;
    }
    if (profile.publicKey) {
      const add = addToTop ? updateAvailableFeedsTop : updateAvailableFeeds;

      updateStore('availableFeeds', (feeds) => add(profile.publicKey, feed, feeds));
    }
  };

  const removeAvailableFeed = (feed: PrimalFeed) => {
    if (!feed) {
      return;
    }

    if (profile.publicKey) {
      updateStore('availableFeeds',
        (feeds) => removeFromAvailableFeeds(profile.publicKey, feed, feeds),
      );
      toaster?.sendSuccess(`"${feed.name}" has been removed from your home page`);
    }
  };

  const setAvailableFeeds = (feedList: PrimalFeed[]) => {
    if (profile.publicKey) {
      updateStore('availableFeeds',
        () => replaceAvailableFeeds(profile.publicKey, feedList),
      );
    }
  };

  let extensionAttempt = 0;

  const fetchNostrKey = async () => {
    const win = window as NostrWindow;
    const nostr = win.nostr;

    if (nostr === undefined) {
      console.log('No WebLn extension');
      // Try again after one second if extensionAttempts are not exceeded
      if (extensionAttempt < 1) {
        extensionAttempt += 1;
        setTimeout(fetchNostrKey, 1000);
        return;
      }
    }

    try {
      const key = await nostr.getPublicKey();

      if (key === undefined) {
        setTimeout(fetchNostrKey, 1000);
      }
      else {
        setPublicKey(key);
        localStorage.setItem('pubkey', key);
      }
    } catch (e: any) {
      if (e.message === 'User rejected') {
        setPublicKey(noKey);
        localStorage.setItem('pubkey', noKey);
      }
      console.log('error fetching public key: ', e);
    }
  }

  const getRelays = async () => {
    const win = window as NostrWindow;
    const nostr = win.nostr;

    if (nostr) {
      const rels = await nostr.getRelays();


      if (rels) {
        const addresses = Object.keys(rels);
        if (store.relays.length > 0) {
          for (let i=0; i< store.relays.length; i++) {
            await store.relays[i].close();
          }
        }

        const relObjects = addresses.map(address => {
          return relayInit(address);
        })

        let connectedRelays: Relay[] = [];

        for (let i=0; i < relObjects.length; i++) {
          try {
            if (relObjects[i].status === WebSocket.CLOSED) {
              await relObjects[i].connect();
              connectedRelays.push(relObjects[i]);
            }
          } catch (e) {
            console.log('error connecting to relay: ', e);
          }
        }

        updateStore('relays', () => connectedRelays);

        console.log('Connected relays: ', unwrap(connectedRelays))
      }
    }
  };

  const saveLikes = (likes: Set<string>) => {
    updateStore('likes', () => Array.from(likes));
  };

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `user_profile_${APP_ID}`) {
      if (!content) {
        return;
      }

      const user = JSON.parse(content.content);

      updateStore('activeUser', () => user);
    }
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
    setTheme(localStorage.getItem('theme'));

    setTimeout(() => {
      fetchNostrKey();
    }, 1000);
  });

  createEffect(() => {
    if (profile.publicKey) {
      updateStore('availableFeeds', () => initAvailableFeeds(profile.publicKey));
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
