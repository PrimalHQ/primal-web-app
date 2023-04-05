import { createStore, unwrap } from "solid-js/store";
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
  NostrWindow,
  PrimalNote,
  PrimalUser,
} from '../types/primal';
import { Kind, noKey } from "../constants";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket, subscribeTo } from "../sockets";
import { getLikes, sendContacts, sendLike, setStoredLikes } from "../lib/notes";
import { Relay, relayInit } from "nostr-tools";
import { APP_ID } from "../App";
import { getProfileContactList, getUserProfile } from "../lib/profile";
import { getStorage, saveFollowing } from "../lib/localStore";

export type AccountContextStore = {
  likes: string[],
  relays: Relay[],
  publicKey: string | undefined,
  activeUser: PrimalUser | undefined,
  showNewNoteForm: boolean,
  following: string[],
  followingSince: number,
  hasPublicKey: () => boolean,
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
  publicKey: undefined,
  activeUser: undefined,
  showNewNoteForm: false,
  following: [],
  followingSince: 0,
};

export const AccountContext = createContext<AccountContextStore>();

export function AccountProvider(props: { children: number | boolean | Node | JSX.ArrayElement | JSX.FunctionElement | (string & {}) | null | undefined; }) {

  const setPublicKey = (pubkey: string | undefined) => {
    updateStore('publicKey', () => pubkey);
  };

  const hasPublicKey: () => boolean = () => {
    return !!store.publicKey && store.publicKey !== noKey;
  };

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

        console.log('Connected relays: ', unwrap(store.relays))
      }
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
      // if (e.message === 'User rejected') {
        setPublicKey(noKey);
        localStorage.setItem('pubkey', noKey);
      // }
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

    const success = await sendLike(note, store.relays);

    if (success) {
      updateStore('likes', (likes) => [ ...likes, note.post.id]);
      setStoredLikes(store.likes);
    }

    return success;
  };

  const updateContacts = (content: NostrContactsContent) => {
    const followingSince = content.created_at;
    const tags = content.tags;

    const contacts = tags.reduce((acc, t) => {
      return t[0] === 'p' ? [ ...acc, t[1] ] : acc;
    }, []);

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
        return;
      }

      if (content && content.kind === Kind.Contacts && content.created_at && content.created_at > store.followingSince) {
        updateContacts(content);
      }

      if (!store.following.includes(pubkey)) {
        const relayInfo = content?.content || '';
        const date = Math.floor((new Date()).getTime() / 1000);
        const following = [...store.following, pubkey];

        const success = await sendContacts(following, date, relayInfo, store.relays);

        if (success) {
          updateStore('following', () => following);
          updateStore('followingSince', () => date);
          saveFollowing(store.publicKey, following, date);
        }
      }

      unsub();
    });

    getProfileContactList(store.publicKey, `before_follow_${APP_ID}`);

  }

  const removeFollow = (pubkey: string) => {
    if (!store.publicKey || !store.following.includes(pubkey)) {
      return;
    }

    const unsub = subscribeTo(`before_unfollow_${APP_ID}`, async (type, subId, content) => {
      if (type === 'EOSE') {
        return;
      }

      if (content && content.kind === Kind.Contacts && content.created_at && content.created_at > store.followingSince) {
          updateContacts(content);
        }

        if (store.following.includes(pubkey)) {
          const relayInfo = content?.content || '';
          const date = Math.floor((new Date()).getTime() / 1000);
          const following = store.following.filter(f => f !== pubkey);

          const success = await sendContacts(following, date, relayInfo, store.relays);

          if (success) {
            updateStore('following', () => following);
            updateStore('followingSince', () => date);
            saveFollowing(store.publicKey, following, date);
          }
        }

        unsub();
    });

    getProfileContactList(store.publicKey, `before_unfollow_${APP_ID}`);

  }


// EFFECTS --------------------------------------

  onMount(() => {
    setTimeout(() => {
      fetchNostrKey();
    }, 1000);
  });

  createEffect(() => {
    if (store.publicKey) {
      updateStore('publicKey', () => store.publicKey);

      const storage = getStorage(store.publicKey);

      if (store.followingSince < storage.followingSince) {
        updateStore('following', () => ({ ...storage.following }));
        updateStore('followingSince', () => storage.followingSince);
      }

      getRelays();
      getUserProfile(store.publicKey, `user_profile_${APP_ID}`);
      getProfileContactList(store.publicKey, `user_contacts_${APP_ID}`);
    }
  });

  createEffect(() => {
    if (store.publicKey && store.relays.length > 0) {
      getLikes(store.publicKey, store.relays, (likes: string[]) => {
        updateStore('likes', () => [...likes]);
      });
    }
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
