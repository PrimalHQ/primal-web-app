import { createStore } from "solid-js/store";
import {
  createContext,
  createEffect,
  JSX,
  onCleanup,
  onMount,
  useContext
} from "solid-js";
import {
  NostrContactsContent,
  NostrEOSE,
  NostrEvent,
  NostrRelays,
  NostrWindow,
  PrimalNote,
  PrimalUser,
} from '../types/primal';
import { Kind, relayConnectingTimeout } from "../constants";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket, subscribeTo } from "../sockets";
import { sendContacts, sendLike } from "../lib/notes";
// @ts-ignore Bad types in nostr-tools
import { Relay } from "nostr-tools";
import { APP_ID } from "../App";
import { getLikes, getProfileContactList, getUserProfiles } from "../lib/profile";
import { getStorage, saveFollowing, saveLikes, saveRelaySettings } from "../lib/localStore";
import { closeRelays, connectRelays, getPreConfiguredRelays } from "../lib/relays";
import { account } from "../translations";

export type AccountContextStore = {
  likes: string[],
  relays: Relay[],
  relaySettings: NostrRelays,
  publicKey: string | undefined,
  activeUser: PrimalUser | undefined,
  showNewNoteForm: boolean,
  following: string[],
  followingSince: number,
  hasPublicKey: () => boolean,
  isKeyLookupDone: boolean,
  actions: {
    showNewNoteForm: () => void,
    hideNewNoteForm: () => void,
    setActiveUser: (user: PrimalUser) => void,
    addLike: (note: PrimalNote) => Promise<boolean>,
    setPublicKey: (pubkey: string | undefined) => void,
    addFollow: (pubkey: string) => void,
    removeFollow: (pubkey: string) => void,
  },
}

const initialData = {
  likes: [],
  relays: [],
  relaySettings: {},
  publicKey: undefined,
  activeUser: undefined,
  showNewNoteForm: false,
  following: [],
  followingSince: 0,
  isKeyLookupDone: false,
};

export const AccountContext = createContext<AccountContextStore>();

export function AccountProvider(props: { children: number | boolean | Node | JSX.ArrayElement | JSX.FunctionElement | (string & {}) | null | undefined; }) {

  const setPublicKey = (pubkey: string | undefined) => {
    updateStore('publicKey', () => pubkey);
    pubkey ? localStorage.setItem('pubkey', pubkey) : localStorage.removeItem('pubkey');
    updateStore('isKeyLookupDone', true);
  };

  const hasPublicKey: () => boolean = () => {
    return !!store.publicKey;
  };

  const setRelaySettings = (settings: NostrRelays) => {
    updateStore('relaySettings', () => ({ ...settings }));
    saveRelaySettings(store.publicKey, settings)
  }

  const attachDefaultRelays = (relaySettings: NostrRelays) => {
    const defaultRelays = getPreConfiguredRelays();

    return { ...relaySettings, ...defaultRelays };

  };

  let connecting = false;

  const connectToRelays = (relaySettings: NostrRelays) => {

    if (connecting) {
      setTimeout(() => { connectToRelays(relaySettings) }, relayConnectingTimeout);
      return;
    }

    connecting = true

    const relaysToConnect = attachDefaultRelays(relaySettings);

    closeRelays(store.relays,
      () => {
        connectRelays(relaysToConnect, (connected) => {
          updateStore('relays', () => [ ...connected ]);
          console.log('Connected relays: ', connected);
          connecting = false;
        });
      },
      () => {
        console.log('Failed to close all relays');
        connecting = false;
      },
    );

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

      updateStore('isKeyLookupDone', true);
      return;
    }

    try {
      const key = await nostr.getPublicKey();

      if (key === undefined) {
        setTimeout(fetchNostrKey, 1000);
      }
      else {
        setPublicKey(key);
        getUserProfiles([key], `user_profile_${APP_ID}`);
      }
    } catch (e: any) {
      setPublicKey(undefined);
      localStorage.removeItem('pubkey');
      console.log('error fetching public key: ', e);
    }
  }

  const setActiveUser = (user: PrimalUser) => {
    updateStore('activeUser', () => ({...user}));
  };

  const showNewNoteForm = () => {
    updateStore('showNewNoteForm', () => true);
  };

  const hideNewNoteForm = () => {
    updateStore('showNewNoteForm', () => false);
  };

  const addLike = async (note: PrimalNote) => {
    if (store.likes.includes(note.post.id)) {
      return false;
    }

    const { success } = await sendLike(note, store.relays);

    if (success) {
      updateStore('likes', (likes) => [ ...likes, note.post.id]);
      saveLikes(store.publicKey, store.likes);
    }

    return success;
  };

  const updateContacts = (content: NostrContactsContent) => {

    const followingSince = content.created_at;
    const tags = content.tags;

    const contacts = tags.reduce((acc, t) => {
      return t[0] === 'p' ? [ ...acc, t[1] ] : acc;
    }, []);

    setRelaySettings(JSON.parse(content.content || '{}'));
    updateStore('following', () => contacts);
    updateStore('followingSince', () => followingSince || 0);
    saveFollowing(store.publicKey, contacts, followingSince || 0);
  };

  const addFollow = (pubkey: string) => {
    if (!store.publicKey || store.following.includes(pubkey)) {
      return;
    }

    const unsub = subscribeTo(`before_follow_${APP_ID}`, async (type, subId, content) => {
      if (type === 'EOSE') {

        if (!store.following.includes(pubkey)) {
          const relayInfo = JSON.stringify(store.relaySettings);
          const date = Math.floor((new Date()).getTime() / 1000);
          const following = [...store.following, pubkey];

          const { success } = await sendContacts(following, date, relayInfo, store.relays);

          if (success) {
            updateStore('following', () => following);
            updateStore('followingSince', () => date);
            saveFollowing(store.publicKey, following, date);
          }
        }

        unsub();
        return;
      }

      if (content &&
        content.kind === Kind.Contacts &&
        content.created_at &&
        content.created_at > store.followingSince
      ) {
        updateContacts(content);
      }
    });

    getProfileContactList(store.publicKey, `before_follow_${APP_ID}`);

  }

  const removeFollow = (pubkey: string) => {
    if (!store.publicKey || !store.following.includes(pubkey)) {
      return;
    }

    const unsub = subscribeTo(`before_unfollow_${APP_ID}`, async (type, subId, content) => {
      if (type === 'EOSE') {
        if (store.following.includes(pubkey)) {
          const relayInfo = JSON.stringify(store.relaySettings);
          const date = Math.floor((new Date()).getTime() / 1000);
          const following = store.following.filter(f => f !== pubkey);

          const { success } = await sendContacts(following, date, relayInfo, store.relays);

          if (success) {
            updateStore('following', () => following);
            updateStore('followingSince', () => date);
            saveFollowing(store.publicKey, following, date);
          }
        }

        unsub();
        return;
      }

      if (content &&
        content.kind === Kind.Contacts &&
        content.created_at &&
        content.created_at > store.followingSince
      ) {
        updateContacts(content);
      }
    });

    getProfileContactList(store.publicKey, `before_unfollow_${APP_ID}`);

  }


// EFFECTS --------------------------------------

  onMount(() => {
    setTimeout(() => {
      updateStore('isKeyLookupDone', false);
      fetchNostrKey();
    }, 1000);
  });

  createEffect(() => {
    const pubkey = store.publicKey;

    if (!pubkey) {
      return;
    }

    const storage = getStorage(pubkey);

    updateStore('relaySettings', () => ({ ...storage.relaySettings }));
  });

  createEffect(() => {
    if (store.publicKey) {

      const storage = getStorage(store.publicKey);

      if (store.followingSince < storage.followingSince) {
        updateStore('following', () => ({ ...storage.following }));
        updateStore('followingSince', () => storage.followingSince);
      }

      getProfileContactList(store.publicKey, `user_contacts_${APP_ID}`);
    }
  });

  createEffect(() => {
    if (store.publicKey && store.relays.length > 0) {
      getLikes(store.publicKey, store.relays, (likes: string[]) => {

        updateStore('likes', () => [...likes]);
        saveLikes(store.publicKey, likes);
      });
    }
  });

  // If user has relays but none is connected, retry connecting after a delay
  // createEffect(() => {
  //   if (
  //     Object.keys(store.relaySettings).length > 0 &&
  //     store.relays.length === 0
  //   ) {
  //     setTimeout(() => {
  //       connectToRelays(store.relaySettings);
  //     }, 200);
  //   }
  // });

  createEffect(() => {
    if (isConnected()) {
      refreshSocketListeners(
        socket(),
        { message: onMessage, close: onSocketClose },
      );
    }
  });

  createEffect(() => {
    connectToRelays(store.relaySettings);
  });

  onCleanup(() => {
    removeSocketListeners(
      socket(),
      { message: onMessage, close: onSocketClose },
    );
    store.relays.forEach(relay => relay.close())
  });

// SOCKET HANDLERS ------------------------------

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    webSocket.removeEventListener('message', onMessage);
    webSocket.removeEventListener('close', onSocketClose);
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `user_profile_${APP_ID}`) {
      if (content?.content) {
        const user = JSON.parse(content.content);

        updateStore('activeUser', () => ({...user}));
      }
      return;
    }

    if (subId === `user_contacts_${APP_ID}`) {
      if (content && content.kind === Kind.Contacts) {
        if (Object.keys(store.relaySettings).length === 0) {
          setRelaySettings(JSON.parse(content.content || '{}'));
        }

        if (!content.created_at || content.created_at <= store.followingSince) {
          return;
        }

        updateContacts(content);
      }
      return;
    }

  };

// STORES ---------------------------------------

const [store, updateStore] = createStore<AccountContextStore>({
  ...initialData,
  hasPublicKey,
  actions: {
    showNewNoteForm,
    hideNewNoteForm,
    setActiveUser,
    addLike,
    setPublicKey,
    addFollow,
    removeFollow,
  },
});

  return (
    <AccountContext.Provider value={store}>
      {props.children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() { return useContext(AccountContext); }
