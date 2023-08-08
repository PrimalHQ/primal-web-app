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
  NostrMutedContent,
  NostrRelay,
  NostrRelays,
  NostrWindow,
  PrimalNote,
  PrimalUser,
} from '../types/primal';
import { Kind, relayConnectingTimeout } from "../constants";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket, subscribeTo, reset } from "../sockets";
import { sendContacts, sendLike, sendMuteList } from "../lib/notes";
// @ts-ignore Bad types in nostr-tools
import { Relay, relayInit } from "nostr-tools";
import { APP_ID } from "../App";
import { getLikes, getProfileContactList, getProfileMuteList, getUserProfiles } from "../lib/profile";
import { getStorage, saveFollowing, saveLikes, saveMuted, saveMuteList, saveRelaySettings } from "../lib/localStore";
import { closeRelays, connectRelays, connectToRelay, getDefaultRelays, getPreConfiguredRelays } from "../lib/relays";
import { account } from "../translations";

export type AccountContextStore = {
  likes: string[],
  defaultRelays: string[],
  relays: Relay[],
  relaySettings: NostrRelays,
  publicKey: string | undefined,
  activeUser: PrimalUser | undefined,
  showNewNoteForm: boolean,
  following: string[],
  followingSince: number,
  muted: string[],
  mutedPrivate: string,
  mutedSince: number,
  hasPublicKey: () => boolean,
  isKeyLookupDone: boolean,
  quotedNote: string | undefined,
  connectToPrimaryRelays: boolean,
  actions: {
    showNewNoteForm: () => void,
    hideNewNoteForm: () => void,
    setActiveUser: (user: PrimalUser) => void,
    addLike: (note: PrimalNote) => Promise<boolean>,
    setPublicKey: (pubkey: string | undefined) => void,
    addFollow: (pubkey: string) => void,
    removeFollow: (pubkey: string) => void,
    quoteNote: (noteId: string | undefined) => void,
    addToMuteList: (pubkey: string) => void,
    removeFromMuteList: (pubkey: string) => void,
    addRelay: (url: string) => void,
    removeRelay: (url: string) => void,
    setConnectToPrimaryRelays: (flag: boolean) => void,
    changeCachingService: (url?: string) => void,
    dissconnectDefaultRelays: () => void,
  },
}

const initialData = {
  likes: [],
  defaultRelays: [],
  relays: [],
  relaySettings: {},
  publicKey: undefined,
  activeUser: undefined,
  showNewNoteForm: false,
  following: [],
  followingSince: 0,
  muted: [],
  mutedPrivate: '',
  mutedSince: 0,
  isKeyLookupDone: false,
  quotedNote: undefined,
  connectToPrimaryRelays: true,
};

export const AccountContext = createContext<AccountContextStore>();

export function AccountProvider(props: { children: number | boolean | Node | JSX.ArrayElement | JSX.FunctionElement | (string & {}) | null | undefined; }) {

  let relayAtempts: Record<string, number> = {};
  const relayAtemptLimit = 10;
  let relaysExplicitlyClosed: string[] = [];

  let relayReliability: Record<string, number> = {};

  let connectedRelaysCopy: Relay[] = [];

  const setPublicKey = (pubkey: string | undefined) => {
    updateStore('publicKey', () => pubkey);
    pubkey ? localStorage.setItem('pubkey', pubkey) : localStorage.removeItem('pubkey');
    updateStore('isKeyLookupDone', true);
  };

  const hasPublicKey: () => boolean = () => {
    return !!store.publicKey;
  };

  const setRelaySettings = (settings: NostrRelays) => {

    const rs = store.relaySettings;

    let toSave = Object.keys(settings).reduce((acc, url) => {
      if (rs[url]) {
        return acc;
      }

      return { ...acc, [url]: settings[url] };
    }, rs);

    if (Object.keys(toSave).length === 0) {
      return;
    }

    updateStore('relaySettings', () => ({ ...toSave }));
    saveRelaySettings(store.publicKey, toSave)
  }

  const attachDefaultRelays = (relaySettings: NostrRelays) => {
    const defaultRelays = getPreConfiguredRelays();

    return { ...relaySettings, ...defaultRelays };

  };

  const setConnectToPrimaryRelays = (flag: boolean) => {
    updateStore('connectToPrimaryRelays', () => flag);
  }

  const connectToRelays = (relaySettings: NostrRelays) => {

    if (Object.keys(relaySettings).length === 0) {
      getDefaultRelays(`default_relays_${APP_ID}`);
      return;
    }

    const relaysToConnect = store.connectToPrimaryRelays ?
      attachDefaultRelays(relaySettings) :
      relaySettings;

    for (let i = 0; i < connectedRelaysCopy.length; i ++) {
      const relay = connectedRelaysCopy[i];

      if (relaysToConnect[relay.url]) {
        delete relaysToConnect[relay.url];
      }
    }

    const onConnect = (connectedRelay: Relay) => {
      if (store.relays.find(r => r.url === connectedRelay.url)) {
        return;
      }

      // Reset atempts after stable connection
      relayReliability[connectedRelay.url] = setTimeout(() => {
        relayAtempts[connectedRelay.url] = 0;
      }, 3 * relayConnectingTimeout)

      updateStore('relays', (rs) => [ ...rs, { ...connectedRelay } ]);
    };

    const onFail = (failedRelay: Relay, reasons: any) => {
      console.log('Connection failed to relay ', failedRelay.url, ' because: ', reasons);

      // connection is unstable, clear reliability timeout
      relayReliability[failedRelay.url] && clearTimeout(relayReliability[failedRelay.url]);

      updateStore('relays', (rs) => rs.filter(r => r.url !== failedRelay.url));

      if (relaysExplicitlyClosed.includes(failedRelay.url)) {
        relaysExplicitlyClosed = relaysExplicitlyClosed.filter(u => u !== failedRelay.url);
        return;
      }

      if ((relayAtempts[failedRelay.url] || 0) < relayAtemptLimit) {
        relayAtempts[failedRelay.url] = (relayAtempts[failedRelay.url] || 0) + 1;

        // Reconnect with a progressive delay
        setTimeout(() => {
          console.log('Reconnect to ', failedRelay.url, ' , try', relayAtempts[failedRelay.url], '/', relayAtemptLimit);
          connectToRelay(failedRelay, relayConnectingTimeout * relayAtempts[failedRelay.url], onConnect, onFail);
        }, relayConnectingTimeout * relayAtempts[failedRelay.url]);
        return;
      }
      console.log('Reached atempt limit ', failedRelay.url)
    };

    connectRelays(relaysToConnect, onConnect, onFail);

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

    const { success } = await sendLike(note, store.relays, store.relaySettings);

    if (success) {
      updateStore('likes', (likes) => [ ...likes, note.post.id]);
      saveLikes(store.publicKey, store.likes);
    }

    return success;
  };

  const addRelay = (url: string) => {
    const relay: NostrRelays = { [url]: { write: true, read: true }};

    setRelaySettings(relay);

    // Remove relay from the list of explicitly closed relays
    relaysExplicitlyClosed = relaysExplicitlyClosed.filter(u => u !== url);

    const unsub = subscribeTo(`before_add_relay_${APP_ID}`, async (type, subId, content) => {
      if (type === 'EOSE') {

        const relayInfo = JSON.stringify(store.relaySettings);
        const date = Math.floor((new Date()).getTime() / 1000);
        const following = [...store.following];

        const { success } = await sendContacts(following, date, relayInfo, store.relays, store.relaySettings);

        if (success) {
          updateStore('following', () => following);
          updateStore('followingSince', () => date);
          saveFollowing(store.publicKey, following, date);
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

    getProfileContactList(store.publicKey, `before_add_relay_${APP_ID}`);
  };

  const removeRelay = (url: string) => {
    const relay: Relay = store.relays.find(r => r.url === url);

    // if relay is connected, close it and remove it from the list of open relays
    if (relay) {
      relay.close();
      updateStore('relays', () => [...store.relays.filter(r => r.url !== url)]);
    }

    // Add relay to the list of explicitly closed relays
    relaysExplicitlyClosed.push(url);

    // Reset connection attempts
    relayAtempts[url] = 0;

    // Remove relay from the user's relay settings
    updateStore('relaySettings', () => ({ [url]: undefined }));

    saveRelaySettings(store.publicKey, store.relaySettings);

    const unsub = subscribeTo(`before_remove_relay_${APP_ID}`, async (type, subId, content) => {
      if (type === 'EOSE') {

        const relayInfo = JSON.stringify(store.relaySettings);
        const date = Math.floor((new Date()).getTime() / 1000);
        const following = [...store.following];

        const { success } = await sendContacts(following, date, relayInfo, store.relays, store.relaySettings);

        if (success) {
          updateStore('following', () => following);
          updateStore('followingSince', () => date);
          saveFollowing(store.publicKey, following, date);
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

    getProfileContactList(store.publicKey, `before_remove_relay_${APP_ID}`);
  };

  const updateContacts = (content: NostrContactsContent) => {

    const followingSince = content.created_at;
    const tags = content.tags;

    const contacts = tags.reduce((acc, t) => {
      return t[0] === 'p' ? [ ...acc, t[1] ] : acc;
    }, []);

    const relaySettings = JSON.parse(content.content || '{}');

    setRelaySettings(relaySettings);

    updateStore('following', () => contacts);
    updateStore('followingSince', () => followingSince || 0);
    saveFollowing(store.publicKey, contacts, followingSince || 0);
  };

  const updateMuted = (content: NostrMutedContent) => {

    const mutedSince = content.created_at;
    const tags = content.tags;

    if (content.kind === Kind.CategorizedPeople && tags.find(t => t[0] === 'd' && t[1] === 'mute')) {
      return;
    }

    const muted = tags.reduce((acc, t) => {
      if (t[0] !== 'p') {
        return acc;
      }

      const pubkey = t[1];

      if (store.muted.includes(pubkey)) {
        return acc;
      }

      return [ ...acc, pubkey ];
    }, []);

    updateStore('muted', (ml) => [ ...ml, ...muted]);
    updateStore('mutedPrivate', () => content.content);
    updateStore('mutedSince', () => mutedSince || 0);

    saveMuteList(store.publicKey, muted, content.content, mutedSince || 0);
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

          const { success } = await sendContacts(following, date, relayInfo, store.relays, store.relaySettings);

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

          const { success } = await sendContacts(following, date, relayInfo, store.relays, store.relaySettings);

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

  const quoteNote = (noteId: string | undefined) => {
    updateStore('quotedNote', () => noteId);
  }

  const addToMuteList = (pubkey: string) => {
    if (!store.publicKey || !store.muted || store.muted.includes(pubkey)) {
      return;
    }

    const unsub = subscribeTo(`before_mute_${APP_ID}`, async (type, subId, content) => {
      if (type === 'EOSE') {

        if (!store.muted.includes(pubkey)) {
          const date = Math.floor((new Date()).getTime() / 1000);
          const muted = [...store.muted, pubkey];

          const { success } = await sendMuteList(muted, date, content?.content || '', store.relays, store.relaySettings);

          if (success) {
            updateStore('muted', () => muted);
            updateStore('mutedSince', () => date);
            saveMuted(store.publicKey, muted, date);
          }
        }

        unsub();
        return;
      }

      if (content &&
        (content.kind === Kind.MuteList || content.kind === Kind.CategorizedPeople) &&
        content.created_at &&
        content.created_at > store.followingSince
      ) {
        updateMuted(content);
      }
    });

    getProfileMuteList(store.publicKey, `before_mute_${APP_ID}`);
  };

  const removeFromMuteList = (pubkey: string) => {
    if (!store.publicKey || !store.muted || !store.muted.includes(pubkey)) {
      return;
    }

    const unsub = subscribeTo(`before_unmute_${APP_ID}`, async (type, subId, content) => {
      if (type === 'EOSE') {

        if (store.muted.includes(pubkey)) {
          const date = Math.floor((new Date()).getTime() / 1000);
          const muted = store.muted.filter(m => m !== pubkey);

          const { success } = await sendMuteList(muted, date, content?.content || '', store.relays, store.relaySettings);

          if (success) {
            updateStore('muted', () => muted);
            updateStore('mutedSince', () => date);
            saveMuted(store.publicKey, muted, date);
          }
        }

        unsub();
        return;
      }

      if (content &&
        ([Kind.MuteList, Kind.CategorizedPeople].includes(content.kind)) &&
        content.created_at &&
        content.created_at > store.followingSince
      ) {
        updateMuted(content as NostrMutedContent);
      }
    });

    getProfileMuteList(store.publicKey, `before_unmute_${APP_ID}`);
  };

  const changeCachingService = (url?: string) => {
    if (!url) {
      localStorage.removeItem('cacheServer');
    }
    else {
      localStorage.setItem('cacheServer', url);
    }

    reset();
  };

  const dissconnectDefaultRelays = () => {
    console.log('dissconnectDefaultRelays');
    for(let i=0; i < store.defaultRelays.length; i++) {
      const url = store.defaultRelays[i];

      const relay = store.relays.find(r => r.url === url);

      if (relay) {
        console.log('dissconnectDefaultRelays: ', relay.url);
        relay.close();
        updateStore('relays', () => store.relays.filter(r => r.url !== url));
      }

      // Add relay to the list of explicitly closed relays
      relaysExplicitlyClosed.push(url);

      // Reset connection attempts
      relayAtempts[url] = 0;
    }

  };


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
    if (store.isKeyLookupDone && store.publicKey) {

      const storage = getStorage(store.publicKey);

      if (store.followingSince < storage.followingSince) {
        updateStore('following', () => ({ ...storage.following }));
        updateStore('followingSince', () => storage.followingSince);
      }

      getProfileContactList(store.publicKey, `user_contacts_${APP_ID}`);
    }
  });

  createEffect(() => {
    if (store.isKeyLookupDone && hasPublicKey()) {
      const storage = getStorage(store.publicKey);

      if (store.mutedSince < storage.mutedSince) {
        updateStore('muted', () => ({ ...storage.muted }));
        updateStore('mutedSince', () => storage.mutedSince);
        updateStore('mutedPrivate', () => storage.mutedPrivate);
      }

      getProfileMuteList(store.publicKey, `mutelist_${APP_ID}`);
    }
  });

  createEffect(() => {
    connectedRelaysCopy = [...store.relays];
    if (store.publicKey && store.relays.length > 0) {
      getLikes(store.publicKey, store.relays, (likes: string[]) => {
        updateStore('likes', () => [...likes]);
        saveLikes(store.publicKey, likes);
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

  createEffect(() => {
    let relaySettings = { ...store.relaySettings };

    if (Object.keys(relaySettings).length > 0) {
      connectToRelays(relaySettings);
      return;
    }

    if (store.isKeyLookupDone && store.publicKey) {
      relaySettings = { ...getStorage(store.publicKey).relaySettings };
      connectToRelays(relaySettings);
      return;
    }
  });

  createEffect(() => {
    const rels: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

    if (store.connectToPrimaryRelays) {
      const relaySettings = rels.reduce((acc, r) => ({ ...acc, [r]: { read: true, write: true } }), {});

      connectToRelays(relaySettings)
    }
    else {
      for (let i = 0; i < rels.length; i++) {
        const url = rels[i];
        const relay = store.relays.find(r => r.url === url);

        if (relay) {
          relay.close();
          updateStore('relays', () => [...store.relays.filter(r => r.url !== url)]);
        }
      }
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

    if (subId === `mutelist_${APP_ID}`) {
      if (content && [Kind.MuteList, Kind.CategorizedPeople].includes(content.kind)) {

        if (!content.created_at || content.created_at <= store.mutedSince) {
          return;
        }

        updateMuted(content as NostrMutedContent);
      }
      return;
    }

    if (subId === `default_relays_${APP_ID}`) {
      if (type === 'EVENT') {
        const resp = JSON.parse(content.content || '[]');

        updateStore('defaultRelays', () => [...resp]);

        const relaySettings: NostrRelays = resp.reduce((acc: NostrRelays, r: string) => ({ ...acc, [r]: { read: true, write: true }}), {});

        if (Object.keys(relaySettings).length > 0) {
          connectToRelays(relaySettings);
        }
      }
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
    quoteNote,
    addToMuteList,
    removeFromMuteList,
    addRelay,
    removeRelay,
    setConnectToPrimaryRelays,
    changeCachingService,
    dissconnectDefaultRelays,
  },
});

  return (
    <AccountContext.Provider value={store}>
      {props.children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() { return useContext(AccountContext); }
