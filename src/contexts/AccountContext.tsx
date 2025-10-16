import { createStore, unwrap } from "solid-js/store";
import {
  createContext,
  createEffect,
  JSXElement,
  on,
  onCleanup,
  onMount,
  useContext
} from "solid-js";
import {
  ContactsData,
  EmojiOption,
  Filterlist,
  NostrContactsContent,
  NostrEOSE,
  NostrEvent,
  NostrMutedContent,
  NostrRelays,
  NostrWindow,
  MembershipStatus,
  PrimalNote,
  PrimalUser,
  NostrEventContent,
  PrimalArticle,
  NostrEvents,
  PrimalDVM,
  NostrBlossom,
} from '../types/primal';
import { Kind, pinEncodePrefix, primalBlossom, relayConnectingTimeout, sevenDays, supportedBookmarkTypes } from "../constants";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket, reset, subTo, readData, subsTo } from "../sockets";
import { getReplacableEvent, sendBlossomEvent, sendContacts, sendEvent, sendLike, sendMuteList, sendStreamMuteList, triggerImportEvents } from "../lib/notes";
import { generatePrivateKey, Relay, getPublicKey as nostrGetPubkey, nip19, utils, relayInit } from "../lib/nTools";
import { APP_ID } from "../App";
import { getLikes, getFilterlists, getProfileContactList, getProfileMuteList, getUserProfiles, sendFilterlists, getAllowlist, sendAllowList, getRelays, sendRelays, extractRelayConfigFromTags, getBookmarks } from "../lib/profile";
import { clearSec, getStorage, getStoredProfile, readBookmarks, readEmojiHistory, readPremiumReminder, readPrimalRelaySettings, readSecFromStorage, saveBookmarks, saveEmojiHistory, saveFollowing, saveLikes, saveMuted, saveMuteList, savePremiumReminder, savePrimalRelaySettings, saveRelaySettings, saveStreamMuted, setStoredProfile, storeSec } from "../lib/localStore";
import { connectRelays, connectToRelay, getDefaultRelays, getPreConfiguredRelays } from "../lib/relays";
import { getPublicKey } from "../lib/nostrAPI";
import EnterPinModal from "../components/EnterPinModal/EnterPinModal";
import CreateAccountModal from "../components/CreateAccountModal/CreateAccountModal";
import LoginModal from "../components/LoginModal/LoginModal";
import { logError, logInfo, logWarning } from "../lib/logger";
import { useToastContext } from "../components/Toaster/Toaster";
import { useIntl } from "@cookbook/solid-intl";
import { account as tAccount, bookmarks, followWarning, forgotPin, settings } from "../translations";
import { getMembershipStatus } from "../lib/membership";
import ConfirmModal from "../components/ConfirmModal/ConfirmModal";
import { useAppContext } from "./AppContext";
import { areUrlsSame, handleSubscription } from "../utils";

export type FollowData = {
  tags: string[][],
  date: number,
  relayInfo: string,
  openDialog: boolean,
  following: string[],
};

export type AccountContextStore = {
  likes: string[],
  defaultRelays: string[],
  relays: Relay[],
  suspendedRelays: Relay[],
  relaySettings: NostrRelays,
  publicKey: string | undefined,
  activeUser: PrimalUser | undefined,
  showNewNoteForm: boolean,
  following: string[],
  followingSince: number,
  followInProgress: string,
  muted: string[],
  mutedTags: string[][],
  mutedPrivate: string,
  mutedSince: number,
  streamMuted: string[],
  streamMutedTags: string[][],
  streamMutedPrivate: string,
  streamMutedSince: number,
  hasPublicKey: () => boolean,
  isKeyLookupDone: boolean,
  quotedNote: string | undefined,
  connectToPrimaryRelays: boolean,
  contactsTags: string[][],
  contactsContent: string,
  mutelists: Filterlist[],
  mutelistSince: number,
  allowlist: string[],
  allowlistSince: number,
  sec: string | undefined,
  showPin: string,
  showForgot: boolean,
  showGettingStarted: boolean,
  showLogin: boolean,
  emojiHistory: EmojiOption[],
  membershipStatus: MembershipStatus,
  bookmarks: string[],
  proxyThroughPrimal: boolean,
  proxySettingSet: boolean,
  activeRelays: Relay[],
  followData: FollowData,
  premiumReminder: boolean,
  activeNWC:string[],
  nwcList: string[][],
  blossomServers: string[],
  mirrorBlossom: boolean,
  actions: {
    showNewNoteForm: () => void,
    hideNewNoteForm: () => void,
    setActiveUser: (user: PrimalUser) => void,
    addLike: (note: PrimalNote | PrimalArticle | PrimalDVM) => Promise<boolean>,
    setPublicKey: (pubkey: string | undefined) => void,
    updateAccountProfile: (pubkey: string) => void,
    addFollow: (pubkey: string, cb?: (remove: boolean, pubkey: string) => void) => void,
    removeFollow: (pubkey: string, cb?: (remove: boolean, pubkey: string) => void) => void,
    quoteNote: (noteId: string | undefined) => void,
    addToMuteList: (pubkey: string, muteKind?: 'user' | 'word' | 'hashtag' | 'thread', then?: (success?: boolean) => void) => void,
    removeFromMuteList: (pubkey: string, muteKind?: 'user' | 'word' | 'hashtag' | 'thread', then?: (success?: boolean) => void) => void,
    addToStreamMuteList: (pubkey: string, then?: (success?: boolean) => void) => void,
    removeFromStreamMuteList: (pubkey: string, then?: (success?: boolean) => void) => void,
    addRelay: (url: string) => void,
    removeRelay: (url: string) => void,
    setConnectToPrimaryRelays: (flag: boolean) => void,
    changeCachingService: (url?: string) => void,
    dissconnectDefaultRelays: () => void,
    connectToRelays: (relaySettings: NostrRelays) => void,
    addFilterList: (pubkey: string | undefined) => void,
    removeFilterList: (pubkey: string | undefined) => void,
    updateFilterList: (pubkey: string | undefined, content?: boolean, trending?: boolean) => void,
    addToAllowlist: (pubkey: string | undefined, then?: () => void) => void,
    removeFromAllowlist: (pubkey: string | undefined) => void,
    setSec: (sec: string | undefined, force?: boolean) => void,
    logout: () => void,
    showGetStarted: () => void,
    saveEmoji: (emoji: EmojiOption) => void,
    checkNostrKey: () => void,
    fetchBookmarks: () => void,
    updateBookmarks: (bookmarks: string[]) => void,
    resetRelays: (relays: Relay[]) => void,
    setProxyThroughPrimal: (shouldProxy: boolean) => void,
    updateRelays: () => void,
    updateContactsList: () => void,
    setFlag: (key: string, flag: boolean) => void,
    setString: (key: string, string: string) => void,
    setFollowData: (followData: FollowData) => void,
    resolveContacts: (
      pubkey: string,
      following: string[],
      date: number,
      tags: string[][],
      relayInfo: string,
      cb?: (remove: boolean, pubkey: string) => void,
    ) => Promise<void>,
    replaceContactList: (
      date: number,
      tags: string[][],
      relayInfo: string,
      cb?: (remove: boolean, pubkey: string | undefined) => void,
    ) => Promise<void>,
    clearPremiumRemider: () => void,
    setShowPin: (sec: string, cb?: () => void) => void,
    setActiveNWC: (nwc: string[]) => void,
    updateNWCList: (list: string[][]) => void,
    insertIntoNWCList: (nwc: string[], index?: number) => void,
    addBlossomServers: (url: string) => void,
    appendBlossomServers: (url: string) => void,
    removeBlossomServers: (url: string) => void,
    setBlossomServers: (urls: string[]) => void,
    removeBlossomMirrors: (then?: () => void) => void,
  },
}

const initialData = {
  likes: [],
  defaultRelays: [],
  relays: [],
  activeRelays: [],
  suspendedRelays: [],
  relaySettings: {},
  publicKey: undefined,
  activeUser: undefined,
  showNewNoteForm: false,
  following: [],
  followingSince: 0,
  followInProgress: '',
  muted: [],
  mutedTags: [],
  mutedPrivate: '',
  mutedSince: 0,
  streamMuted: [],
  streamMutedTags: [],
  streamMutedPrivate: '',
  streamMutedSince: 0,
  isKeyLookupDone: false,
  quotedNote: undefined,
  connectToPrimaryRelays: true,
  contactsTags: [],
  contactsContent: '',
  mutelists: [],
  mutelistSince: 0,
  allowlist: [],
  allowlistSince: 0,
  sec: undefined,
  showPin: '',
  showForgot: false,
  showGettingStarted: false,
  showLogin: false,
  emojiHistory: [],
  membershipStatus: {},
  bookmarks: [],
  proxyThroughPrimal: false,
  proxySettingSet: false,
  premiumReminder: false,
  activeNWC: [],
  nwcList: [],
  blossomServers: [],
  mirrorBlossom: false,
  followData: {
    tags: [],
    date: 0,
    relayInfo: '',
    openDialog: false,
    following: [],
  }
};

export const AccountContext = createContext<AccountContextStore>();

export function AccountProvider(props: { children: JSXElement }) {

  const app = useAppContext();
  const toast = useToastContext();
  const intl = useIntl();

  let relayAtempts: Record<string, number> = {};
  const relayAtemptLimit = 10;
  let relaysExplicitlyClosed: string[] = [];

  let relayReliability: Record<string, number> = {};

  let connectedRelaysCopy: Relay[] = [];

  let membershipSocket: WebSocket | undefined;

  // onMount(() => {
  //   setInterval(() => {
  //     checkNostrChange();
  //   }, 1_000);
  // });

  const suspendRelays = () => {
    if (store.relays.length === 0) {
      const urls: string[] = Object.keys(store.relaySettings || {}).map(utils.normalizeURL);
      const suspendedRelays = urls.map(relayInit);
      updateStore('suspendedRelays', () => suspendedRelays);
    }
    else {
      updateStore('suspendedRelays', () => store.relays);

      for (let i=0; i<store.relays.length; i++) {
        const relay = store.relays[i];
        relay.close();
      }
    }

    const priorityRelays: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

    for (let i=0; i<priorityRelays.length; i++) {
      const pr = priorityRelays[i];

      if (!store.suspendedRelays.find(r => r.url === pr)) {
        updateStore('suspendedRelays', store.suspendedRelays.length, () => relayInit(pr));
      }
    }

    updateStore('relays', () => []);
    updateStore('activeRelays', () => [...store.suspendedRelays]);
  }

  const reconnectSuspendedRelays = async () => {
    const relaysToConnect = store.suspendedRelays.length > 0 ?
    store.suspendedRelays.reduce((acc, r) => {
      return {
        ...acc,
        [r.url]: { ...store.relaySettings[r.url] ?? { read: true, write: true} },
      };
    }, {}) :
    store.relaySettings;

    await connectToRelays(relaysToConnect);

    updateStore('suspendedRelays', () => []);
    updateStore('activeRelays', () => store.relays);
  }

  const setProxyThroughPrimal = async (shouldProxy: boolean) => {
    updateStore('proxyThroughPrimal', () => shouldProxy);

    if (!store.proxySettingSet) {
      updateStore('proxySettingSet', () => true);
    }

    if (shouldProxy) {
      suspendRelays();
    }
    else {
      reconnectSuspendedRelays();
    }
  }


  createEffect(on(() => app?.appState, (v, p) => {
    if (v === 'sleep') {
      suspendRelays();
      return;
    }

    if (v === 'waking' && p === 'sleep') {
      reconnectSuspendedRelays();
    }
  }))

  const checkNostrChange = async () => {
    if (location.pathname === '/') return;

    const win = window as NostrWindow;
    const nostr = win.nostr;

    if (!nostr) return;

    const storedKey = localStorage.getItem('pubkey');

    try {
      const key = await getPublicKey();

      if (key === storedKey) return;

      updateStore('isKeyLookupDone', () => false);

      setPublicKey(key);

      // Read profile from storage
      const storedUser = getStoredProfile(key);

      if (storedUser) {
        // If it exists, set it as active user
        updateStore('activeUser', () => ({...storedUser}));
      }

      // Fetch it anyway, maybe there is an update
      updateAccountProfile(key);
    } catch (e: any) {
      setPublicKey(undefined);
      localStorage.removeItem('pubkey');
      logError('error fetching public key: ', e);
    }
  };

  const updateAccountProfile = (pubkey: string) => {
    if (pubkey !== store.publicKey) return;

    const subId = `user_profile_${APP_ID}`;

    handleSubscription(
      subId,
      () => getUserProfiles([pubkey], subId),
      handleUserProfileEvent,
    );

    // const unsub = subsTo(subId, {
    //   onEvent: handleUserProfileEvent,
    //   onEose: () => {
    //     unsub();
    //   },
    // });

    // getUserProfiles([pubkey], subId);
  };

  const openMembershipSocket = (onOpen: () => void) => {
    membershipSocket = new WebSocket('wss://wallet.primal.net/v1');

    membershipSocket.addEventListener('close', () => {
      logInfo('MEMBERSHIP SOCKET CLOSED');
    });

    membershipSocket.addEventListener('open', () => {
      logInfo('MEMBERSHIP SOCKET OPENED');
      onOpen();
    });
  }

  const checkMembershipStatus = () => {
    openMembershipSocket(() => {
      if (!membershipSocket || membershipSocket.readyState !== WebSocket.OPEN) return;

      const subId = `ps_${APP_ID}`;

      let gotEvent = false;

      const unsub = subTo(membershipSocket, subId, (type, _, content) => {
        if (type === 'EVENT') {
          const status: MembershipStatus = JSON.parse(content?.content || '{}');

          gotEvent = true;
          updateStore('membershipStatus', () => ({ ...status }));
        }

        if (type === 'EOSE') {
          unsub();
          membershipSocket?.close();

          if (!gotEvent) {
            updateStore('membershipStatus', () => ({ tier: 'none' }));
          }

          checkPremiumRemider()
        }
      });

      getMembershipStatus(store.publicKey, subId, membershipSocket);
    });
  };

  const checkPremiumRemider = () => {
    if (['premium', 'premium-legend'].includes(store.membershipStatus.tier || '')) {
      updateStore('premiumReminder', () => false);
      return;
    };

    const now = (new Date()).getTime();
    const reminder = readPremiumReminder(store.publicKey) || 0;

    if (now - reminder > sevenDays) {
      updateStore('premiumReminder', () => true);
    }
  }

  const clearPremiumRemider = () => {
    const now = (new Date()).getTime();
    updateStore('premiumReminder', () => false);

    savePremiumReminder(store.publicKey, now);

    setTimeout(() => {
      checkPremiumRemider()
    }, sevenDays)
  }

  const showGetStarted = () => {
    updateStore('showGettingStarted', () => true);
  }

  const logout = () => {
    updateStore('sec', () => undefined);
    updateStore('publicKey', () => undefined);
    localStorage.removeItem('pubkey');
    clearSec();
  };

  const setSec = (sec: string | undefined, force?: boolean) => {
    if (!sec) {
      logout();
      return;
    }

    const decoded = nip19.decode(sec);

    if (decoded.type === 'nsec' && decoded.data) {
      updateStore('sec', () => sec);

      const pubkey = nostrGetPubkey(decoded.data);

      if (pubkey !== store.publicKey || force) {
        setPublicKey(pubkey);
      }

      // Read profile from storage
      const storedUser = getStoredProfile(pubkey);

      if (storedUser) {
        // If it exists, set it as active user
        updateStore('activeUser', () => ({...storedUser}));
      }

      // Fetch it anyway, maybe there is an update
      updateAccountProfile(pubkey);
    }
  }

  const setPublicKey = (pubkey: string | undefined) => {

    if(pubkey && pubkey.length > 0) {
      updateStore('publicKey', () => pubkey);
      localStorage.setItem('pubkey', pubkey);
      checkMembershipStatus();

      const bks = readBookmarks(pubkey);
      updateStore('bookmarks', () => [...bks]);
      fetchBookmarks();
    }
    else {
      updateStore('publicKey', () => undefined);
      localStorage.removeItem('pubkey');
    }

    updateStore('isKeyLookupDone', () => true);
  };

  const hasPublicKey: () => boolean = () => {
    return !!store.publicKey;
  };

  const resetRelays = (relays: Relay[]) => {
    const settings = relays.reduce((acc, r) => ({ ...acc, [r.url]: { write: true, read: true }}), {});

    setRelaySettings({ ...settings }, true);
    connectToRelays({ ...settings }, true);
  };

  const setRelaySettings = (stgns: NostrRelays, replace?: boolean) => {

    let settings = { ...stgns };

    if (Object.keys(settings).length === 0) {
      settings = attachDefaultRelays(settings);
    }

    if (replace) {
      for (let url in store.relaySettings) {
        if (settings[url]) {
          continue;
        }
        updateStore('relaySettings', () => ({[url]: undefined}));
        const relay = store.relays.find(r => r.url === url);

        if (relay) {
          relay.close();
          const filtered = store.relays.filter(r => r.url !== url);
          updateStore('relays', () => filtered);
        }
      }

      updateStore('relaySettings', () => ({...settings}));
      connectToRelays(settings)
      saveRelaySettings(store.publicKey, settings);
      return true;
    }

    const rs = store.relaySettings;

    let toSave = Object.keys(settings).reduce((acc, url) => {
      if (rs[url]) {
        return acc;
      }

      return { ...acc, [url]: settings[url] };
    }, rs);

    if (Object.keys(toSave).length === 0) {
      return true;
    }

    updateStore('relaySettings', () => ({ ...toSave }));
    saveRelaySettings(store.publicKey, toSave);
    return true;
  }

  const attachDefaultRelays = (relaySettings: NostrRelays) => {
    const defaultRelays = getPreConfiguredRelays();

    return { ...relaySettings, ...defaultRelays };
  };

  const setConnectToPrimaryRelays = (flag: boolean) => {
    updateStore('connectToPrimaryRelays', () => flag);
  }

  const connectToRelays = async (relaySettings: NostrRelays, sendRelayList?: boolean) => {

    if (!store.proxySettingSet || store.proxyThroughPrimal) return;

    if (Object.keys(relaySettings).length === 0) {
      const defaultRelaysId = `default_relays_${APP_ID}`;
      handleSubscription(
        defaultRelaysId,
        () => getDefaultRelays(defaultRelaysId),
        handleDefaultRelaysEvent,
      );
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

      // connectedRelay.onclose = () => {
      //   console.log('Relay closed');
      //   setTimeout(async () => {
      //     await connectToRelay(connectedRelay, relayConnectingTimeout, onConnect, onFail, true);
      //   }, 200)
      // }

      if (sendRelayList) {
        sendRelays([connectedRelay], relaySettings, store.proxyThroughPrimal);
      }

      if (store.relays.find(r => r.url === connectedRelay.url)) {
        return;
      }

      // Reset atempts after stable connection
      relayReliability[connectedRelay.url] = setTimeout(() => {
        relayAtempts[connectedRelay.url] = 0;
      }, 3 * relayConnectingTimeout)

      updateStore('relays', (rs) => [ ...rs, connectedRelay ]);
    };

    const onFail = (failedRelay: Relay, reasons: any) => {
      logWarning('Connection failed to relay ', failedRelay.url, ' because: ', reasons);

      // connection is unstable, clear reliability timeout
      relayReliability[failedRelay.url] && clearTimeout(relayReliability[failedRelay.url]);

      updateStore('relays', (rs) => rs.filter(r => r.url !== failedRelay.url));

      if (relaysExplicitlyClosed.includes(failedRelay.url)) {
        relaysExplicitlyClosed = relaysExplicitlyClosed.filter(u => u !== failedRelay.url);
        return;
      }

      if (reasons === 'close') return;

      if ((relayAtempts[failedRelay.url] || 0) < relayAtemptLimit) {
        relayAtempts[failedRelay.url] = (relayAtempts[failedRelay.url] || 0) + 1;

        // Reconnect with a progressive delay
        setTimeout(() => {
          logInfo('Reconnect to ', failedRelay.url, ' , try', relayAtempts[failedRelay.url], '/', relayAtemptLimit);
          connectToRelay(failedRelay, relayConnectingTimeout * relayAtempts[failedRelay.url], onConnect, onFail, true);
        }, relayConnectingTimeout * relayAtempts[failedRelay.url]);
        return;
      }
      logWarning('Reached atempt limit ', failedRelay.url)
    };

    await connectRelays(relaysToConnect, onConnect, onFail);

  };

  let extensionAttempt = 0;

  const fetchNostrKey = async () => {
    const win = window as NostrWindow;
    const nostr = win.nostr;

    const storedKey = localStorage.getItem('pubkey');

    if (storedKey) {
      setPublicKey(storedKey);

      // Read profile from storage
      const storedUser = getStoredProfile(storedKey);

      if (storedUser) {
        // If it exists, set it as active user
        updateStore('activeUser', () => ({...storedUser}));
      }
    }

    if (nostr === undefined) {
      logError('Nostr extension not found');
      // Try again after one second if extensionAttempts are not exceeded
      if (extensionAttempt < 4) {
        extensionAttempt += 1;
        logInfo('Nostr extension retry attempt: ', extensionAttempt)
        setTimeout(fetchNostrKey, 250);
        return;
      }

      const sec = readSecFromStorage();

      if (sec) {
        if (sec.startsWith(pinEncodePrefix)) {
          updateStore('showPin', () => sec);
        }
        else {
          setSec(sec);
        }
      } else {
        updateStore('publicKey', () => undefined);
      }

      updateStore('isKeyLookupDone', () => true);
      return;
    }
    else {
      updateStore('sec', () => undefined);
      storeSec(undefined);
    }

    try {
      const key = await getPublicKey();

      if (key === undefined) {
        setTimeout(fetchNostrKey, 250);
      }
      else {
        if (key !== storedKey) {
          setPublicKey(key);

          // Read profile from storage
          const storedUser = getStoredProfile(key);

          if (storedUser) {
            // If it exists, set it as active user
            updateStore('activeUser', () => ({...storedUser}));
          }
        }

        // Fetch it anyway, maybe there is an update
        updateAccountProfile(key);
      }
    } catch (e: any) {
      setPublicKey(undefined);
      localStorage.removeItem('pubkey');
      logError('error fetching public key: ', e);
    }
  }

  const setShowPin = (sec: string) => {
    updateStore('showPin', () => sec);
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

  const addLike = async (note: PrimalNote | PrimalArticle | PrimalDVM) => {
    if (store.likes.includes(note.id)) {
      return false;
    }

    const { success } = await sendLike(note, store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

    if (success) {
      updateStore('likes', (likes) => [ ...likes, note.id]);
      saveLikes(store.publicKey, store.likes);
    }

    return success;
  };

  const addRelay = (url: string) => {
    const relay: NostrRelays = { [url]: { write: true, read: true }};

    setRelaySettings(relay);
    connectToRelays(relay)

    // Remove relay from the list of explicitly closed relays
    relaysExplicitlyClosed = relaysExplicitlyClosed.filter(u => u !== url);

    const unsub = subsTo(`before_add_relay_${APP_ID}`, {
      onEvent: (_, content) => {
        const relayInfo: NostrRelays = JSON.parse(content?.content || '{}');

        const relays = { ...store.relaySettings, ...relayInfo };

        setRelaySettings(relays, true);
      },
      onEose: () => {
        sendRelays(store.activeRelays, store.relaySettings, store.proxyThroughPrimal);

        unsub();
      },
    });

    getRelays(store.publicKey, `before_add_relay_${APP_ID}`);
  };

  const removeRelay = (url: string) => {
    const urlVariants = [url, url.endsWith('/') ? url.slice(0, -1) : `${url}/`];

    const relay: Relay = store.relays.find(r => {
      return urlVariants.includes(r.url);
    });

    // if relay is connected, close it and remove it from the list of open relays
    if (relay) {
      relay.close();
      const filtered = store.relays.filter(r => !urlVariants.includes(r.url));
      updateStore('relays', () => filtered);

      const filteredActive = store.activeRelays.filter(r => !urlVariants.includes(r.url));
      updateStore('activeRelays', () => filteredActive);
    }

    for (let i = 0; i<urlVariants.length; i++) {
      const u = urlVariants[i];

      // Add relay to the list of explicitly closed relays
      relaysExplicitlyClosed.push(u);

      // Reset connection attempts
      relayAtempts[u] = 0;

      // Remove relay from the user's relay settings
      updateStore('relaySettings', () => ({ [u]: undefined }));
    }

    saveRelaySettings(store.publicKey, store.relaySettings);

    const unsub = subsTo(`before_remove_relay_${APP_ID}`, {
      onEvent: (_, content) => {
        let relayInfo: NostrRelays = JSON.parse(content?.content || '{}');

        delete relayInfo[url];

        const relays = { ...store.relaySettings, ...relayInfo };

        setRelaySettings(relays, true);
      },
      onEose: () => {

        sendRelays(store.activeRelays, store.relaySettings, store.proxyThroughPrimal);

        unsub();
      },
    });

    getRelays(store.publicKey, `before_remove_relay_${APP_ID}`);
  };

  const updateContacts = (content: NostrContactsContent) => {

    const followingSince = content.created_at;
    const tags = content.tags;
    const relayInfo = content.content;

    const contacts = tags.reduce((acc, t) => {
      return t[0] === 'p' ? [ ...acc, t[1] ] : acc;
    }, []);

    // const relaySettings = JSON.parse(content.content || '{}');

    // setRelaySettings(relaySettings, true);

    updateStore('following', () => contacts);
    updateStore('followingSince', () => followingSince || 0);
    updateStore('contactsTags', () => [...tags]);
    updateStore('contactsContent', () => relayInfo);

    saveFollowing(store.publicKey, contacts, followingSince || 0);
  };

  const extractContacts = (content: NostrContactsContent) => {

    if (content.created_at && content.created_at < store.followingSince) {
      const storage = getStorage(store.publicKey);

      return {
        following: storage.following,
        created_at: storage.followingSince || 0,
        tags: store.contactsTags,
        content: store.contactsContent,
      };
    }

    const following = content.tags.reduce((acc, t) => {
      return t[0] === 'p' ? [ ...acc, t[1] ] : acc;
    }, []);

    return {
      following,
      created_at: content.created_at || 0,
      tags: content.tags,
      content: content.content,
    };
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

    updateStore('mutedTags', () => [...tags]);
    updateStore('muted', (ml) => [ ...ml, ...muted]);
    updateStore('mutedPrivate', () => content.content);
    updateStore('mutedSince', () => mutedSince || 0);

    saveMuteList(store.publicKey, muted, content.content, mutedSince || 0);
  };

  const updateStreamMuted = (content: NostrMutedContent) => {

    const mutedSince = content.created_at;
    const tags = content.tags;

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

    updateStore('streamMutedTags', () => [...tags]);
    updateStore('streamMuted', (ml) => [ ...ml, ...muted]);
    updateStore('streamMutedPrivate', () => content.content);
    updateStore('streamMutedSince', () => mutedSince || 0);

    saveMuteList(store.publicKey, muted, content.content, mutedSince || 0);
  };

  const resolveContacts = async (
    pubkey: string,
    following: string[],
    date: number,
    tags: string[][],
    relayInfo: string,
    cb?: (remove: boolean, pubkey: string) => void,
  ) => {
    const { success, note: event } = await sendContacts(tags, date, relayInfo, store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

    if (success && event) {
      updateStore('following', () => following);
      updateStore('followingSince', () => date);
      updateStore('contactsTags', () => [...tags]);
      updateStore('contactsContent', () => relayInfo);
      saveFollowing(store.publicKey, following, date);

      triggerImportEvents([event], `import_follow_contacts_${APP_ID}`, () => {
        cb && cb(false, pubkey);
      });
    }
  };

  const replaceContactList = async (
    date: number,
    tags: string[][],
    relayInfo: string,
    cb?: (remove: boolean, pubkey: string | undefined) => void,
  ) => {
    const { success, note: event } = await sendContacts(tags, date, relayInfo, store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

    if (success && event) {
      const following = event.tags.reduce<string[]>((acc, t) => t[0] === 'p' ? [...acc, t[1]] : acc, []);

      updateStore('following', () => following);
      updateStore('followingSince', () => date);
      updateStore('contactsTags', () => [...tags]);
      updateStore('contactsContent', () => relayInfo);
      saveFollowing(store.publicKey, following, date);

      triggerImportEvents([event], `import_follow_contacts_${APP_ID}`, () => {
        cb && cb(false, store.publicKey);
      });
    }
  };

  const addFollow = (pubkey: string, cb?: (remove: boolean, pubkey: string) => void) => {
    if (!store.publicKey || store.following.includes(pubkey)) {
      return;
    }

    updateStore('followInProgress', () => pubkey);

    // let contactsReceived = false;

    let contactData: ContactsData = {
      content: '',
      created_at: 0,
      tags: [],
      following: [],
    };

    let rawContacts: NostrEventContent[] = [];

    const unsub = subsTo(`before_follow_${APP_ID}`, {
      onEvent: (_, content) => {
        if (!content || content.kind !== Kind.Contacts) return;

        rawContacts.push(content);

        logInfo('FOLLOW DATE CONTENT: ', content.created_at);
        logInfo('FOLLOW DATE STORE: ', store.followingSince);
        logInfo('FOLLOW DATE DIFF: ', (content.created_at || 0) - store.followingSince);

        contactData = extractContacts(content);

        logWarning('FOLLOW DATA PRE CHANGE: ', contactData);

        if (!contactData.following.includes(pubkey)) {

          const relayInfo = contactData.content;
          const date = Math.floor((new Date()).getTime() / 1000);
          const existingTags = contactData.tags;
          const following = [...contactData.following, pubkey];

          const tags = [ ...existingTags, ['p', pubkey]];

          if (following.length < 2 || tags.length < 2) {
            logWarning('FOLLOW ISSUE: ', `before_follow_${APP_ID}`);
            logWarning('FOLLOW CONTENT: ', rawContacts);
            logWarning('FOLLOW DATA: ', contactData);

            updateStore('followData', () => ({
              openDialog: true,
              date,
              tags,
              relayInfo,
              following,
            }));
          }
          else {
            resolveContacts(pubkey, following, date, tags, relayInfo, cb);
          }
        }
      },
      onEose: () => {
        if (store.following.length === 0) {
          const date = Math.floor((new Date()).getTime() / 1000);
          const tags = [['p', pubkey]];
          resolveContacts(pubkey, [pubkey], date, tags, store.relays[0].url, cb);
        }
        updateStore('followInProgress', () => '');
        unsub();
      },
    });

    getProfileContactList(store.publicKey, `before_follow_${APP_ID}`);

  }

  const removeFollow = (pubkey: string, cb?: (remove: boolean, pubkey: string) => void) => {
    if (
      !store.publicKey ||
      !store.following.includes(pubkey) ||
      store.publicKey === pubkey
    ) {
      return;
    }

    updateStore('followInProgress', () => pubkey);

    let contactData: ContactsData = {
      content: '',
      created_at: 0,
      tags: [],
      following: [],
    };

    let rawContacts: NostrEventContent[] = [];

    const unsub = subsTo(`before_unfollow_${APP_ID}`, {
      onEvent: (_, content) => {
        if (!content || content.kind !== Kind.Contacts) return;

        rawContacts.push(content);

        logInfo('FOLLOW DATE CONTENT: ', content.created_at);
        logInfo('FOLLOW DATE STORE: ', store.followingSince);
        logInfo('FOLLOW DATE DIFF: ', (content.created_at || 0) - store.followingSince);

        contactData = extractContacts(content);

        logWarning('FOLLOW DATA PRE CHANGE: ', contactData);

        if (contactData.following.includes(pubkey)) {

          const relayInfo = contactData.content;
          const date = Math.floor((new Date()).getTime() / 1000);
          const existingTags = contactData.tags;
          const following = contactData.following.filter(f => f !== pubkey);

          const tags = existingTags.filter(t => t[0] !== 'p' || t[1] !== pubkey);

          if (following.length < 2 || tags.length < 2) {
            logWarning('FOLLOW ISSUE: ', `before_unfollow_${APP_ID}`);
            logWarning('FOLLOW CONTENT: ', rawContacts);
            logWarning('FOLLOW DATA: ', contactData);

            updateStore('followData', () => ({
              openDialog: true,
              date,
              tags,
              relayInfo,
              following,
            }));
          }
          else {
            resolveContacts(pubkey, following, date, tags, relayInfo, cb);
          }
        }

      },
      onEose: () => {
        updateStore('followInProgress', () => '');
        unsub();
      },
    });

    getProfileContactList(store.publicKey, `before_unfollow_${APP_ID}`);

  }

  const quoteNote = (noteId: string | undefined) => {
    updateStore('quotedNote', () => noteId);
  }

  const addToMuteList = (pubkey: string, kind?: 'user' | 'word' | 'hashtag' | 'thread', then?: (success: boolean) => void) => {

    if (!store.publicKey /*|| !store.muted || store.muted.includes(pubkey) */) {
      return;
    }

    if (!store.sec || store.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        setShowPin(sec);
        return;
      }
    }

    const muteKind = kind || 'user';

    const subId = `before_mute_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content &&
          (content.kind === Kind.MuteList || content.kind === Kind.CategorizedPeople) &&
          content.created_at &&
          content.created_at > store.mutedSince
        ) {
          updateMuted(content);
        }
      },
      onEose: async () => {
        unsub();

        if (muteKind === 'user') {
          if (store.muted.includes(pubkey)) return;

          const date = Math.floor((new Date()).getTime() / 1000);
          const muted = [...unwrap(store.muted), pubkey];

          const tags = [ ...unwrap(store.mutedTags), ['p', pubkey]];

          const { success, note } = await sendMuteList(tags, date, store.mutedPrivate, store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

          if (success) {
            updateStore('muted', () => muted);
            updateStore('mutedTags', () => tags);
            updateStore('mutedSince', () => date);
            saveMuted(store.publicKey, muted, date);
            note && triggerImportEvents([note], `import_mutelists_event_add_${APP_ID}`);
          }

          then && then(success);
        }

        if (['word', 'hashtag', 'thread'].includes(muteKind)) {
          const date = Math.floor((new Date()).getTime() / 1000);

          const flags: Record<string, string> = {
            word: 'word',
            hashtag: 't',
            thread: 'e',
          }

          const tags = [ ...unwrap(store.mutedTags), [flags[muteKind], pubkey]];

          const { success, note } = await sendMuteList(tags, date, store.mutedPrivate, store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

          if (success) {
            updateStore('mutedTags', () => tags);
            updateStore('mutedSince', () => date);
            note && triggerImportEvents([note], `import_mute_list_word_add_${APP_ID}`);
          }

          then && then(success);
        }
      },
    });

    getProfileMuteList(store.publicKey, subId);
  };

  const removeFromMuteList = (pubkey: string, kind?: 'user' | 'word' | 'hashtag' | 'thread', then?: (success?: boolean) => void) => {
    if (!store.publicKey /* || !store.muted || !store.muted.includes(pubkey)*/ ) {
      return;
    }

    if (!store.sec || store.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        setShowPin(sec);
        return;
      }
    }

    const muteKind = kind || 'user';

    const unsub = subsTo(`before_unmute_${APP_ID}`, {
      onEvent: (_, content) => {
        if (content &&
          ([Kind.MuteList, Kind.CategorizedPeople].includes(content.kind)) &&
          content.created_at &&
          content.created_at > store.followingSince
        ) {
          updateMuted(content as NostrMutedContent);
        }
      },
      onEose: async () => {
        unsub();

        if (muteKind === 'user') {
          if (!store.muted.includes(pubkey)) return;

          const date = Math.floor((new Date()).getTime() / 1000);
          const muted = unwrap(store.muted).filter(m => m !== pubkey);

          const tags = unwrap(store.mutedTags).filter(t => t[0] !== 'p' || t[1] !== pubkey);

          const { success, note } = await sendMuteList(tags, date, store.mutedPrivate, store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

          if (success) {
            updateStore('muted', () => muted);
            updateStore('mutedTags', () => tags);
            updateStore('mutedSince', () => date);
            saveMuted(store.publicKey, muted, date);
            note && triggerImportEvents([note], `import_mute_list_remove_${APP_ID}`);
          }

          then && then(success);
        }

        if (['word', 'hashtag', 'thread'].includes(muteKind)) {
          const date = Math.floor((new Date()).getTime() / 1000);

          const flags: Record<string, string> = {
            word: 'word',
            hashtag: 't',
            thread: 'e',
          }

          const tags = unwrap(store.mutedTags).filter(t => t[0] !== flags[muteKind] || t[1] !== pubkey).filter(t => t[1] !== "");

          const { success, note } = await sendMuteList(tags, date, store.mutedPrivate, store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

          if (success) {
            updateStore('mutedTags', () => tags);
            updateStore('mutedSince', () => date);
            note && triggerImportEvents([note], `import_mute_list_word_remove_${APP_ID}`);
          }

          then && then(success);
        }
      }
    });

    getProfileMuteList(store.publicKey, `before_unmute_${APP_ID}`);
  };


  const addToStreamMuteList = (pubkey: string, then?: (success: boolean) => void) => {

    if (!store.publicKey /*|| !store.muted || store.muted.includes(pubkey) */) {
      return;
    }

    if (!store.sec || store.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        setShowPin(sec);
        return;
      }
    }

    const subId = `before_stream_mute_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content &&
          [Kind.StreamMuteList].includes(content.kind) &&
          content.created_at &&
          content.created_at > store.streamMutedSince
        ) {
          updateStreamMuted(content as NostrMutedContent);
        }
      },
      onEose: async () => {
        unsub();

        if (store.streamMuted.includes(pubkey)) return;

        const date = Math.floor((new Date()).getTime() / 1000);
        const muted = [...unwrap(store.streamMuted), pubkey];

        const tags = [ ...unwrap(store.streamMutedTags), ['p', pubkey]];

        const { success, note } = await sendStreamMuteList(tags, date, store.streamMutedPrivate, store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

        if (success) {
          updateStore('streamMuted', () => muted);
          updateStore('streamMutedTags', () => tags);
          updateStore('streamMutedSince', () => date);
          saveStreamMuted(store.publicKey, muted, date);
          note && triggerImportEvents([note], `import_stream_mute_list_add_${APP_ID}`);
        }

        then && then(success);
      },
    });

    getReplacableEvent(store.publicKey, Kind.StreamMuteList, subId);
  };

  const removeFromStreamMuteList = (pubkey: string, then?: (success?: boolean) => void) => {
    if (!store.publicKey /* || !store.muted || !store.muted.includes(pubkey)*/ ) {
      return;
    }

    if (!store.sec || store.sec.length === 0) {
      const sec = readSecFromStorage();
      if (sec) {
        setShowPin(sec);
        return;
      }
    }

    const subId = `before_stream_unmute_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content &&
          ([Kind.StreamMuteList].includes(content.kind)) &&
          content.created_at &&
          content.created_at > store.followingSince
        ) {
          updateStreamMuted(content as NostrMutedContent);
        }
      },
      onEose: async () => {
        unsub();

        if (!store.streamMuted.includes(pubkey)) return;

        const date = Math.floor((new Date()).getTime() / 1000);
        const muted = unwrap(store.streamMuted).filter(m => m !== pubkey);

        const tags = unwrap(store.streamMutedTags).filter(t => t[0] !== 'p' || t[1] !== pubkey);

        const { success, note } = await sendStreamMuteList(tags, date, store.streamMutedPrivate, store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

        if (success) {
          updateStore('streamMuted', () => muted);
          updateStore('streamMutedTags', () => tags);
          updateStore('streamMutedSince', () => date);
          saveStreamMuted(store.publicKey, muted, date);
          note && triggerImportEvents([note], `import_stream_mute_list_remove_${APP_ID}`);
        }

        then && then(success);
      }
    });

    getReplacableEvent(store.publicKey, Kind.StreamMuteList, subId);
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
    for(let i=0; i < store.defaultRelays.length; i++) {
      const url = store.defaultRelays[i];

      const relay = store.relays.find(r => r.url === url);

      if (relay) {
        relay.close();
        const filtered = store.relays.filter(r => r.url !== url);
        updateStore('relays', () => filtered);
      }

      // Add relay to the list of explicitly closed relays
      relaysExplicitlyClosed.push(url);

      // Reset connection attempts
      relayAtempts[url] = 0;
    }
  };

  const updateFilterlists = (mutelists: NostrMutedContent) => {

    let filterlists: Filterlist[] = [...store.mutelists];
    const since = mutelists.created_at;
    const tags = mutelists.tags;

    if (mutelists.kind !== Kind.CategorizedPeople || !tags.find(t => t[0] === 'd' && t[1] === 'mutelists')) {
      return [...store.mutelists];
    }

    updateStore('mutelistSince', () => since || 0);

    if (!tags || tags.length === 0) {
      return [];
    }

    for (let i=0;i<tags.length;i++) {
      const tag = tags[i];

      if (tag[0] === 'd') {
        continue;
      }

      if (tag[0] === 'p') {
        const content = tag[4] && tag[4].includes('content') ? true : false;
        const trending = tag[4] && tag[4].includes('trending') ? true : false;

        const index = store.mutelists.findIndex(m => m.pubkey === tag[1]);

        const newList = {
          pubkey: tag[1],
          relay: tag[2] || '',
          petname: tag[3] || '',
          content,
          trending,
        };

        if (index === -1) {
          filterlists.push(newList)
          continue;
        }

        filterlists[index] = newList;
        continue;
      }
    }

    return filterlists;
  };

  const getFilterLists = (pubkey: string | undefined) => {
    if (!pubkey) {
      return;
    }

    const random = generatePrivateKey();
    const subId = `fl_${random}_${APP_ID}`;
    let filterlists: Filterlist[] = [];


    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        filterlists = updateFilterlists(content as NostrMutedContent);
      },
      onEose: () => {
        if (store.publicKey && !filterlists.find(l => l.pubkey === store.publicKey)) {
          filterlists.unshift({ pubkey: store.publicKey, content: true, trending: true });
        }
        updateStore('mutelists', () => [...filterlists]);
        unsub();
      },
    });

    getFilterlists(pubkey, subId);
  };

  const addFilterList = async (pubkey: string | undefined) => {
    if (!pubkey) {
      return;
    }

    const random = generatePrivateKey();
    const subId = `bma_${random}_${APP_ID}`;

    let filterlists: Filterlist[] = [...store.mutelists];

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content &&
          content.kind === Kind.CategorizedPeople &&
          content.created_at &&
          content.created_at > store.mutelistSince
        ) {
          filterlists = [...updateFilterlists(content)];
        }
      },
      onEose: async () => {
        updateStore('mutelists', () => [...filterlists]);

        if (store.mutelists.find(m => m.pubkey === pubkey)) {
          return;
        }

        const date = Math.floor((new Date()).getTime() / 1000);

        updateStore('mutelists', (mls) => [ ...mls, { pubkey, content: true, trending: true } ]);

        const { success, note } = await sendFilterlists(store.mutelists, date, '', store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

        if (success) {
          note && triggerImportEvents([note], `import_mutelists_event_add_${APP_ID}`);
        }

        unsub();
      },
    });

    getFilterlists(store.publicKey, subId);

  };

  const removeFilterList = (pubkey: string | undefined) => {
    if (!pubkey || pubkey === store.publicKey) {
      return;
    }

    const random = generatePrivateKey();
    const subId = `bmr_${random}_${APP_ID}`;
    let filterlists: Filterlist[] = [...store.mutelists];

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {if (content &&
        content.kind === Kind.CategorizedPeople &&
        content.created_at &&
        content.created_at > store.mutelistSince
      ) {
        filterlists = updateFilterlists(content);
      }
      },
      onEose: async () => {
        updateStore('mutelists', () => [...filterlists]);

        const modified = store.mutelists.filter(m => m.pubkey !== pubkey);
        const date = Math.floor((new Date()).getTime() / 1000);

        updateStore('mutelists', () => [ ...modified ]);

        const { success, note } = await sendFilterlists(store.mutelists, date, '', store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

        if (success) {
          note && triggerImportEvents([note], `import_mutelists_event_remove_${APP_ID}`);
        }

        unsub();
      },
    });

    getFilterlists(store.publicKey, subId);
  };

  const updateFilterList = (pubkey: string | undefined, content = true, trending = true) => {
    if (!pubkey) {
      return;
    }
    const random = generatePrivateKey();
    const subId = `bmu_${random}_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {if (content &&
        content.kind === Kind.CategorizedPeople &&
        content.created_at &&
        content.created_at > store.mutelistSince
      ) {
        updateFilterlists(content);
      }
      },
      onEose: async () => {

        if (!store.mutelists.find(m => m.pubkey === pubkey)) {
          unsub();
          return;
        }

        const date = Math.floor((new Date()).getTime() / 1000);

        updateStore('mutelists',
          m => m.pubkey === pubkey,
          () => ({ content, trending }),
        );

        const { success, note } = await sendFilterlists(store.mutelists, date, '', store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

        if (success) {
          note && triggerImportEvents([note], `import_mutelists_event_update_${APP_ID}`);
        }

        unsub();
      },
    });

    getFilterlists(store.publicKey, subId);

  };



  const updateAllowlist = (allowlist: NostrMutedContent) => {

    const since = allowlist.created_at;
    const tags = allowlist.tags;

    if (allowlist.kind !== Kind.CategorizedPeople || !tags.find(t => t[0] === 'd' && t[1] === 'allowlist')) {
      return;
    }

    updateStore('mutelistSince', () => since || 0);

    const pubkeys = tags.reduce((acc, t) => {
      return t[0] === 'p' ? [...acc, t[1]] : acc;
    }, []);

    updateStore('allowlist', () => pubkeys);
  }

  const getAllowList = (pubkey: string | undefined) => {
    if (!pubkey) {
      return;
    }

    const subId = `allowlist_${APP_ID}`;


    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        updateAllowlist(content as NostrMutedContent);
      },
      onEose: () => {
        unsub();
      }
    });

    getAllowlist(pubkey, subId);
  };

  const addToAllowlist = (pubkey: string | undefined, then?: () => void) => {
    if (!pubkey) {
      return;
    }
    const random = generatePrivateKey();
    const subId = `baa_${random}_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content &&
          content.kind === Kind.CategorizedPeople &&
          content.created_at &&
          content.created_at > store.allowlistSince
        ) {
          updateAllowlist(content);
        }
      },
      onEose: async () => {

        if (store.allowlist.includes(pubkey)) {
          return;
        }

        const date = Math.floor((new Date()).getTime() / 1000);

        updateStore('allowlist', store.allowlist.length, () => pubkey);

        const { success, note } = await sendAllowList(store.allowlist, date, '', store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

        if (success) {
          note && triggerImportEvents([note], `import_allowlist_event_add_${APP_ID}`)
        }

        then && then();
        unsub();
      },
    });

    getAllowlist(store.publicKey, subId);

  };

  const removeFromAllowlist = (pubkey: string | undefined) => {
    if (!pubkey) {
      return;
    }
    const random = generatePrivateKey();
    const subId = `allow_list_remove_${random}_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content &&
          content.kind === Kind.CategorizedPeople &&
          content.created_at &&
          content.created_at > store.allowlistSince
        ) {
          updateAllowlist(content);
        }
      },
      onEose: async () => {
        if (!store.allowlist.includes(pubkey)) {
          return;
        }

        const date = Math.floor((new Date()).getTime() / 1000);
        const newList = store.allowlist.filter(pk => pk !== pubkey);

        updateStore('allowlist', () => [...newList]);

        const { success, note } = await sendAllowList(store.allowlist, date, '', store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

        if (success) {
          note && triggerImportEvents([note], `import_allowlist_event_remove_${APP_ID}`)
          return;
        }

        unsub();
      },
    });

    getAllowlist(store.publicKey, subId);

  };

  const saveEmoji = (emoji: EmojiOption) => {
    const history = store.emojiHistory;

    if (history.find(e => e.name === emoji.name)) {
      let sorted = [...history];
      sorted.sort((a, b) => a.name === emoji.name ? -1 : b.name === emoji.name ? 1 : 0);

      updateStore('emojiHistory', () => [...sorted]);
      saveEmojiHistory(store.publicKey, store.emojiHistory);

      return;
    }

    updateStore('emojiHistory', (h) => [emoji, ...h].slice(0, 40));
    saveEmojiHistory(store.publicKey, store.emojiHistory);
  };

  const checkNostrKey = () => {
    if (store.publicKey) return;
    updateStore('isKeyLookupDone', () => false);
    fetchNostrKey();
  };

  const fetchBookmarks = () => {
    const bookmarksId = `user_bookmarks_${APP_ID}`;

    handleSubscription(
      bookmarksId,
      () => getBookmarks(store.publicKey, bookmarksId),
      handleUserBookmarksEvent,
      handleUserBookmarksEose,
    );
  }

  const updateBookmarks = (bookmarks: string[]) => {
    updateStore('bookmarks', () => [...bookmarks]);
  };

  const updateRelays = () => {
    const relaysId = `user_relays_${APP_ID}`;

    handleSubscription(
      relaysId,
      () => getRelays(store.publicKey, relaysId),
      handleUserRelaysEvent,
    );
  }

  const updateContactsList = () => {

    const contactsId = `user_contacts_${APP_ID}`;

    handleSubscription(
      contactsId,
      () =>   getProfileContactList(store.publicKey, contactsId),
      handleUserContactsEvent,
    );
  }

// EFFECTS --------------------------------------

  createEffect(() => {
    const pubkey = store.publicKey;

    if (!pubkey) {
      return;
    }

    const storage = getStorage(pubkey);

    let relaySettings = { ...storage.relaySettings };

    updateStore('relaySettings', () => ({ ...storage.relaySettings }));

    let nwcActive = storage.nwcActive;

    nwcActive && setActiveNWC(nwcActive);

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
    if (store.isKeyLookupDone && store.publicKey) {

      const storage = getStorage(store.publicKey);

      if (store.followingSince < storage.followingSince) {
        updateStore('following', () => ({ ...storage.following }));
        updateStore('followingSince', () => storage.followingSince);
      }

      updateContactsList();
      updateRelays();
      updateStore('emojiHistory', () => readEmojiHistory(store.publicKey))
      updateStore('connectToPrimaryRelays', () => readPrimalRelaySettings(store.publicKey))
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

      const mutelistId = `mutelist_${APP_ID}`;

      handleSubscription(
        mutelistId,
        () => getProfileMuteList(store.publicKey, mutelistId),
        handleMuteListEvent,
      );

      if (store.mutedSince < storage.mutedSince) {
        updateStore('streamMuted', () => ({ ...storage.streamMuted }));
        updateStore('streamMutedSince', () => storage.streamMutedSince);
        updateStore('streamMutedPrivate', () => storage.streamMutedPrivate);
      }

      const streamMuteListid = `streammutelist_${APP_ID}`;

      handleSubscription(
        streamMuteListid,
        () => getReplacableEvent(store.publicKey, Kind.StreamMuteList, streamMuteListid),
        handleStreamMuteListEvent,
      );

      getFilterLists(store.publicKey);
      getAllowList(store.publicKey);
    }
  });

  createEffect(() => {
    setTimeout(() => {
      connectedRelaysCopy = [...store.relays];
      if (!store.publicKey || store.relays.length === 0 || !store.proxySettingSet || store.proxyThroughPrimal) return;

      getLikes(store.publicKey, store.activeRelays, (likes: string[]) => {
        updateStore('likes', () => [...likes]);
        saveLikes(store.publicKey, likes);
      });
    }, 100)
  });

  createEffect(on(() => store.connectToPrimaryRelays, () => {
    const rels: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

    savePrimalRelaySettings(store.publicKey, store.connectToPrimaryRelays);

    if (store.connectToPrimaryRelays) {
      const aru = store.suspendedRelays.map(r => r.url) as string[];

      const relaySettings = rels.
        filter(u => !aru.includes(u) && !aru.includes(`${u}/`)).
        reduce((acc, r) => ({
          ...acc,
          [r]: { read: true, write: true } ,
        }), {});

      connectToRelays(relaySettings)
    }
    else {
      for (let i = 0; i < rels.length; i++) {
        const url = rels[i];
        const urlVariants = [url, url.endsWith('/') ? url.slice(0, -1) : `${url}/`];

        for (let i = 0; i < urlVariants.length;i++) {
          const u = urlVariants[i]
          const relay = store.relays.find(r => r.url === u);

          if (relay) {
            relay.close();
            const filtered = store.relays.filter(r => r.url !== u);
            updateStore('relays', () => filtered);

            const filteredActive = store.activeRelays.filter(r => r.url !== u);
            updateStore('activeRelays', () => filtered);
          }
        }
      }
    }
  }));

// EVENT HANDLERS ------------------------------


  const handleUserProfileEvent = (content: NostrEventContent) => {
    if (content?.content) {
      if (content.kind === Kind.Metadata) {
        const user = JSON.parse(content.content);

        updateStore('activeUser', () => ({...user, pubkey: content.pubkey}));
        setStoredProfile(user);
        updateRelays()
      }
    }
  }

  const handleUserContactsEvent = (content: NostrEventContent) => {
    if (content && content.kind === Kind.Contacts) {
      if (!content.created_at || content.created_at < store.followingSince) {
        return;
      }

      updateContacts(content);
    }
  }

  const handleUserRelaysEvent = (content: NostrEventContent) => {
    if (content && content.kind === Kind.UserRelays) {
      const relays = extractRelayConfigFromTags(content.tags);

      setRelaySettings(relays, true);
    }
  }

  const handleMuteListEvent = (content: NostrEventContent) => {
    if (content && [Kind.MuteList, Kind.CategorizedPeople].includes(content.kind)) {

      if (!content.created_at || content.created_at < store.mutedSince) {
        return;
      }

      updateMuted(content as NostrMutedContent);
    }
  }

  const handleStreamMuteListEvent = (content: NostrEventContent) => {
    if (content && [Kind.StreamMuteList].includes(content.kind)) {

      if (!content.created_at || content.created_at < store.streamMutedSince) {
        return;
      }

      updateStreamMuted(content as NostrMutedContent);
    }
  }

  const handleDefaultRelaysEvent = (content: NostrEventContent) => {
    const resp = JSON.parse(content.content || '[]');

    updateStore('defaultRelays', () => [...resp]);

    const relaySettings: NostrRelays = resp.reduce((acc: NostrRelays, r: string) => ({ ...acc, [r]: { read: true, write: true }}), {});

    if (Object.keys(relaySettings).length > 0) {
      connectToRelays(relaySettings);
    }
  }

  const handleUserBookmarksEvent = (content: NostrEventContent) => {
    if (!content || content.kind !== Kind.Bookmarks || !content.created_at || content.created_at < store.followingSince) {
      return;
    }

    const notes = content.tags.reduce((acc, t) => {
      if (supportedBookmarkTypes.includes(t[0])) {
        return [...acc, t[1]];
      }
      return [...acc];
    }, []);

    updateStore('bookmarks', () => [...notes]);
  }

  const handleUserBookmarksEose = () => {
    saveBookmarks(store.publicKey, store.bookmarks);
  }

  const setString = (key: string, string: string) => {
    // @ts-ignore
    updateStore(key, () => string);
  }

  const setFlag = (key: string, flag: boolean) => {
    // @ts-ignore
    updateStore(key, () => flag);
  }

  const setFollowData = (followData: FollowData) => {
    updateStore('followData', () => ({ ...followData }));
  }

  const setActiveNWC = (nwc: string[]) => {
    updateStore('activeNWC', () => [...nwc]);
  }

  const updateNWCList = (list: string[][]) => {
    updateStore('nwcList', () => [...list]);
  }

  const insertIntoNWCList = (nwc: string[], index?: number) => {
    if (index === undefined || index < 0) {
      updateStore('nwcList', store.nwcList.length, () => [...nwc]);
      return;
    }
    updateStore('nwcList', index, () => [...nwc]);
  }

  createEffect(() => {
    if (!store.publicKey) return;

    fetchBlossomServers(store.publicKey);
  })

  const fetchBlossomServers = (pubkey: string) => {
    const settingsBlossomSubId = `blossom_${APP_ID}`;
    const unsubBlossomSettings = subsTo(settingsBlossomSubId, {
      onEvent: (_, content) => {
        const servers = ((content as NostrBlossom).tags || []).reduce((acc, t) => {
          if (t[0] !== 'server') return acc;

          return [...acc, t[1]];
        }, []);

        setBlossomServers(servers);
      },
      onEose: () => {
        unsubBlossomSettings();
      }
    });

    getReplacableEvent(pubkey, Kind.Blossom, settingsBlossomSubId);

  }

  const addBlossomServers = (url: string, append?: boolean) => {
    if (append) {
      appendBlossomServers(url);
      return;
    }

    if (store.blossomServers.find(u => areUrlsSame(u, url))) {
      updateStore('blossomServers', (servers) => [url, ...servers.filter(s => !areUrlsSame(s, url))]);
      updateBlossomEvent();
      return;
    }

    updateStore('blossomServers', (servers) => [url, ...servers]);
    updateBlossomEvent();
  }

  const appendBlossomServers = (url: string) => {
    if (store.blossomServers.find(u => areUrlsSame(u, url))) {
      updateStore('blossomServers', (servers) => [...servers.filter(s => !areUrlsSame(s, url)), url]);
      updateBlossomEvent();
      return;
    }

    updateStore('blossomServers', (servers) => [...servers, url]);
    updateBlossomEvent();
  }

  const removeBlossomServers = (url: string) => {
    if (!store.blossomServers.includes(url)) return;

    updateStore('blossomServers', (servers) => servers.filter(s => s !== url));
    updateBlossomEvent();
  }

  const removeBlossomMirrors = (then?: () => void) => {
    const main = store.blossomServers[0] || primalBlossom;
    updateStore('blossomServers', () => [main]);
    updateBlossomEvent(then);
  }

  const setBlossomServers = (urls: string[]) => {
    updateStore('blossomServers', () => [ ...urls ]);
    // updateBlossomEvent();
  }

  const updateBlossomEvent = async (then?: () => void) => {
    const { success, note } = await sendBlossomEvent(store.blossomServers, store.proxyThroughPrimal, store.activeRelays, store.relaySettings);

    if (!success || !note) {
      toast?.sendWarning('Failed to send server list');
      return;
    }
    triggerImportEvents([note], `import_blossom_list_${APP_ID}`, then);
  }

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
    updateAccountProfile,
    addFollow,
    removeFollow,
    quoteNote,
    addToMuteList,
    removeFromMuteList,
    addToStreamMuteList,
    removeFromStreamMuteList,
    addRelay,
    removeRelay,
    setConnectToPrimaryRelays,
    changeCachingService,
    dissconnectDefaultRelays,
    connectToRelays,
    addFilterList,
    removeFilterList,
    updateFilterList,
    addToAllowlist,
    removeFromAllowlist,
    setSec,
    logout,
    showGetStarted,
    saveEmoji,
    checkNostrKey,
    fetchBookmarks,
    updateBookmarks,
    resetRelays,
    setProxyThroughPrimal,
    updateRelays,
    updateContactsList,
    setString,
    setFlag,
    setFollowData,
    resolveContacts,
    replaceContactList,
    clearPremiumRemider,
    setShowPin,
    setActiveNWC,
    updateNWCList,
    insertIntoNWCList,
    addBlossomServers,
    appendBlossomServers,
    removeBlossomServers,
    setBlossomServers,
    removeBlossomMirrors,
  },
});

  return (
    <AccountContext.Provider value={store}>
      {props.children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() { return useContext(AccountContext); }
