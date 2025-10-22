import { createStore, Part, unwrap } from "solid-js/store";
import { APP_ID } from "../App";
import { getMembershipStatus } from "../lib/membership";

import {
  areUrlsSame,
  handleSubscription,
} from "../utils";

import {
  getPublicKey,
} from "../lib/nostrAPI";

import { NostrEventContent,
  MembershipStatus,
  EmojiOption,
  NostrRelays,
  PrimalUser,
  Filterlist,
  PrimalNote,
  PrimalArticle,
  PrimalDVM,
  ContactsData,
  NostrContactsContent,
  NostrMutedContent,
  NostrWindow,
  NostrBlossom,
} from "../types/primal";

import {
  generatePrivateKey,
  Relay,
  getPublicKey as nostrGetPubkey,
  nip19,
  utils,
  relayInit,
} from "../lib/nTools";

import {
  getStoredProfile,
  readPremiumReminder,
  savePremiumReminder,
  clearSec,
  readBookmarks,
  saveRelaySettings,
  saveLikes,
  saveFollowing,
  getStorage,
  saveMuteList,
  readSecFromStorage,
  saveMuted,
  saveStreamMuted,
  saveEmojiHistory,
  setStoredProfile,
  saveBookmarks,
} from "../lib/localStore";

import {
  sendLike,
  sendContacts,
  triggerImportEvents,
  sendMuteList,
  sendStreamMuteList,
  getReplacableEvent,
  sendBlossomEvent,
} from "../lib/notes";

import {
  getUserProfiles,
  sendRelays,
  getProfileContactList,
  getProfileMuteList,
  getFilterlists,
  sendFilterlists,
  getAllowlist,
  sendAllowList,
  getBookmarks,
  extractRelayConfigFromTags,
  getRelays,
} from "../lib/profile";

import {
  getPreConfiguredRelays,
  getDefaultRelays,
  connectToRelay,
  connectRelays,
} from "../lib/relays";

import {
  sevenDays,
  relayConnectingTimeout,
  Kind,
  supportedBookmarkTypes,
  primalBlossom,
} from "../constants";

import {
  logError,
  logInfo,
  logWarning,
} from "../lib/logger";

import {
  subTo,
  subsTo,
  reset,
} from "../sockets";


export type FollowData = {
  tags: string[][],
  date: number,
  relayInfo: string,
  openDialog: boolean,
  following: string[],
};

export type AccountStore = {
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
}

const PRIMAL_PUBKEY = '532d830dffe09c13e75e8b145c825718fc12b0003f61d61e9077721c7fff93cb';

let relayAtempts: Record<string, number> = {};
const relayAtemptLimit = 10;
let relaysExplicitlyClosed: string[] = [];

let relayReliability: Record<string, number> = {};

let connectedRelaysCopy: Relay[] = [];

let membershipSocket: WebSocket | undefined;

export const initAccountStore = {
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
  },
};

// ACTIONS ---------------------------------------------------------------------

  export const suspendRelays = () => {
    if (accountStore.relays.length === 0) {
      const urls: string[] = Object.keys(accountStore.relaySettings || {}).map(utils.normalizeURL);
      const suspendedRelays = urls.map(relayInit);
      updateAccountStore('suspendedRelays', () => suspendedRelays);
    }
    else {
      updateAccountStore('suspendedRelays', () => accountStore.relays);

      for (let i=0; i<accountStore.relays.length; i++) {
        const relay = accountStore.relays[i];
        relay.close();
      }
    }

    const priorityRelays: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

    for (let i=0; i<priorityRelays.length; i++) {
      const pr = priorityRelays[i];

      if (!accountStore.suspendedRelays.find(r => r.url === pr)) {
        updateAccountStore('suspendedRelays', accountStore.suspendedRelays.length, () => relayInit(pr));
      }
    }

    updateAccountStore('relays', () => []);
    updateAccountStore('activeRelays', () => [...accountStore.suspendedRelays]);
  }

  export const reconnectSuspendedRelays = async () => {
    const relaysToConnect = accountStore.suspendedRelays.length > 0 ?
    accountStore.suspendedRelays.reduce((acc, r) => {
      return {
        ...acc,
        [r.url]: { ...accountStore.relaySettings[r.url] ?? { read: true, write: true} },
      };
    }, {}) :
    accountStore.relaySettings;

    await connectToRelays(relaysToConnect);

    updateAccountStore('suspendedRelays', () => []);
    updateAccountStore('activeRelays', () => accountStore.relays);
  }

  export const setProxyThroughPrimal = async (shouldProxy: boolean) => {
    updateAccountStore('proxyThroughPrimal', () => shouldProxy);

    if (!accountStore.proxySettingSet) {
      updateAccountStore('proxySettingSet', () => true);
    }

    if (shouldProxy) {
      suspendRelays();
    }
    else {
      reconnectSuspendedRelays();
    }
  }

  export const checkNostrChange = async () => {
    if (location.pathname === '/') return;

    const win = window as NostrWindow;
    const nostr = win.nostr;

    if (!nostr) return;

    const storedKey = localStorage.getItem('pubkey');

    try {
      const key = await getPublicKey();

      if (key === storedKey) return;

      updateAccountStore('isKeyLookupDone', () => false);

      setPublicKey(key);

      // Read profile from storage
      const storedUser = getStoredProfile(key);

      if (storedUser) {
        // If it exists, set it as active user
        updateAccountStore('activeUser', () => ({...storedUser}));
      }

      // Fetch it anyway, maybe there is an update
      updateAccountProfile(key);
    } catch (e: any) {
      setPublicKey(undefined);
      localStorage.removeItem('pubkey');
      logError('error fetching public key: ', e);
    }
  };

  export const updateAccountProfile = (pubkey: string) => {
    if (pubkey !== accountStore.publicKey) return;

    const subId = `user_profile_${APP_ID}`;

    handleSubscription(
      subId,
      () => getUserProfiles([pubkey], subId),
      handleUserProfileEvent,
    );
  };

  export const openMembershipSocket = (onOpen: () => void) => {
    membershipSocket = new WebSocket('wss://wallet.primal.net/v1');

    membershipSocket.addEventListener('close', () => {
      logInfo('MEMBERSHIP SOCKET CLOSED');
    });

    membershipSocket.addEventListener('open', () => {
      logInfo('MEMBERSHIP SOCKET OPENED');
      onOpen();
    });
  }

  export const checkMembershipStatus = () => {
    openMembershipSocket(() => {
      if (!membershipSocket || membershipSocket.readyState !== WebSocket.OPEN) return;

      const subId = `ps_${APP_ID}`;

      let gotEvent = false;

      const unsub = subTo(membershipSocket, subId, (type, _, content) => {
        if (type === 'EVENT') {
          const status: MembershipStatus = JSON.parse(content?.content || '{}');

          gotEvent = true;
          updateAccountStore('membershipStatus', () => ({ ...status }));
        }

        if (type === 'EOSE') {
          unsub();
          membershipSocket?.close();

          if (!gotEvent) {
            updateAccountStore('membershipStatus', () => ({ tier: 'none' }));
          }

          checkPremiumRemider()
        }
      });

      getMembershipStatus(accountStore.publicKey, subId, membershipSocket);
    });
  };

  export const checkPremiumRemider = () => {
    if (['premium', 'premium-legend'].includes(accountStore.membershipStatus.tier || '')) {
      updateAccountStore('premiumReminder', () => false);
      return;
    };

    const now = (new Date()).getTime();
    const reminder = readPremiumReminder(accountStore.publicKey) || 0;

    if (now - reminder > sevenDays) {
      updateAccountStore('premiumReminder', () => true);
    }
  }

  export const clearPremiumRemider = () => {
    const now = (new Date()).getTime();
    updateAccountStore('premiumReminder', () => false);

    savePremiumReminder(accountStore.publicKey, now);

    setTimeout(() => {
      checkPremiumRemider()
    }, sevenDays)
  }

  export const showGetStarted = () => {
    updateAccountStore('showGettingStarted', () => true);
  }

  export const logout = () => {
    updateAccountStore('sec', () => undefined);
    updateAccountStore('publicKey', () => undefined);
    localStorage.removeItem('pubkey');
    clearSec();
  };

  export const setSec = (sec: string | undefined, force?: boolean) => {
    if (!sec) {
      logout();
      return;
    }

    const decoded = nip19.decode(sec);

    if (decoded.type === 'nsec' && decoded.data) {
      updateAccountStore('sec', () => sec);

      const pubkey = nostrGetPubkey(decoded.data);

      if (pubkey !== accountStore.publicKey || force) {
        setPublicKey(pubkey);
      }

      // Read profile from storage
      const storedUser = getStoredProfile(pubkey);

      if (storedUser) {
        // If it exists, set it as active user
        updateAccountStore('activeUser', () => ({...storedUser}));
      }

      // Fetch it anyway, maybe there is an update
      updateAccountProfile(pubkey);
    }
  }

  export const setPublicKey = (pubkey: string | undefined) => {

    if(pubkey && pubkey.length > 0) {
      updateAccountStore('publicKey', () => pubkey);
      localStorage.setItem('pubkey', pubkey);
      checkMembershipStatus();

      const bks = readBookmarks(pubkey);
      updateAccountStore('bookmarks', () => [...bks]);
      fetchBookmarks();
    }
    else {
      updateAccountStore('publicKey', () => undefined);
      localStorage.removeItem('pubkey');
    }

    updateAccountStore('isKeyLookupDone', () => true);
  };

  export const hasPublicKey: () => boolean = () => {
    return !!accountStore.publicKey;
  };

  export const resetRelays = (relays: Relay[]) => {
    const settings = relays.reduce((acc, r) => ({ ...acc, [r.url]: { write: true, read: true }}), {});

    setRelaySettings({ ...settings }, true);
    connectToRelays({ ...settings }, true);
  };

  export const setRelaySettings = (stgns: NostrRelays, replace?: boolean) => {

    let settings = { ...stgns };

    if (Object.keys(settings).length === 0) {
      settings = attachDefaultRelays(settings);
    }

    if (replace) {
      for (let url in accountStore.relaySettings) {
        if (settings[url]) {
          continue;
        }
        updateAccountStore('relaySettings', () => ({[url]: undefined}));
        const relay = accountStore.relays.find(r => r.url === url);

        if (relay) {
          relay.close();
          const filtered = accountStore.relays.filter(r => r.url !== url);
          updateAccountStore('relays', () => filtered);
        }
      }

      updateAccountStore('relaySettings', () => ({...settings}));
      connectToRelays(settings)
      saveRelaySettings(accountStore.publicKey, settings);
      return true;
    }

    const rs = accountStore.relaySettings;

    let toSave = Object.keys(settings).reduce((acc, url) => {
      if (rs[url]) {
        return acc;
      }

      return { ...acc, [url]: settings[url] };
    }, rs);

    if (Object.keys(toSave).length === 0) {
      return true;
    }

    updateAccountStore('relaySettings', () => ({ ...toSave }));
    saveRelaySettings(accountStore.publicKey, toSave);
    return true;
  }

  export const attachDefaultRelays = (relaySettings: NostrRelays) => {
    const defaultRelays = getPreConfiguredRelays();

    return { ...relaySettings, ...defaultRelays };
  };

  export const setConnectToPrimaryRelays = (flag: boolean) => {
    updateAccountStore('connectToPrimaryRelays', () => flag);
  }

  export const connectToRelays = async (relaySettings: NostrRelays, sendRelayList?: boolean) => {

    if (!accountStore.proxySettingSet || accountStore.proxyThroughPrimal) return;

    if (Object.keys(relaySettings).length === 0) {
      const defaultRelaysId = `default_relays_${APP_ID}`;
      handleSubscription(
        defaultRelaysId,
        () => getDefaultRelays(defaultRelaysId),
        handleDefaultRelaysEvent,
      );
      return;
    }

    const relaysToConnect = accountStore.connectToPrimaryRelays ?
      attachDefaultRelays(relaySettings) :
      relaySettings;

    for (let i = 0; i < connectedRelaysCopy.length; i ++) {
      const relay = connectedRelaysCopy[i];

      if (relaysToConnect[relay.url]) {
        delete relaysToConnect[relay.url];
      }
    }

    const onConnect = (connectedRelay: Relay) => {
      if (sendRelayList) {
        sendRelays([connectedRelay], relaySettings, accountStore.proxyThroughPrimal);
      }

      if (accountStore.relays.find(r => r.url === connectedRelay.url)) {
        return;
      }

      // Reset atempts after stable connection
      relayReliability[connectedRelay.url] = setTimeout(() => {
        relayAtempts[connectedRelay.url] = 0;
      }, 3 * relayConnectingTimeout)

      updateAccountStore('relays', (rs) => [ ...rs, connectedRelay ]);
    };

    const onFail = (failedRelay: Relay, reasons: any) => {
      logWarning('Connection failed to relay ', failedRelay.url, ' because: ', reasons);

      // connection is unstable, clear reliability timeout
      relayReliability[failedRelay.url] && clearTimeout(relayReliability[failedRelay.url]);

      updateAccountStore('relays', (rs) => rs.filter(r => r.url !== failedRelay.url));

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

  export const setShowPin = (sec: string) => {
    updateAccountStore('showPin', () => sec);
  }

  export const setActiveUser = (user: PrimalUser) => {
    updateAccountStore('activeUser', () => ({...user}));
  };

  export const showNewNoteForm = () => {
    updateAccountStore('showNewNoteForm', () => true);
  };

  export const hideNewNoteForm = () => {
    updateAccountStore('showNewNoteForm', () => false);
  };

  export const addLike = async (note: PrimalNote | PrimalArticle | PrimalDVM) => {
    if (accountStore.likes.includes(note.id)) {
      return false;
    }

    const { success } = await sendLike(note, accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

    if (success) {
      updateAccountStore('likes', (likes) => [ ...likes, note.id]);
      saveLikes(accountStore.publicKey, accountStore.likes);
    }

    return success;
  };

  export const addRelay = (url: string) => {
    const relay: NostrRelays = { [url]: { write: true, read: true }};

    setRelaySettings(relay);
    connectToRelays(relay)

    // Remove relay from the list of explicitly closed relays
    relaysExplicitlyClosed = relaysExplicitlyClosed.filter(u => u !== url);

    const unsub = subsTo(`before_add_relay_${APP_ID}`, {
      onEvent: (_, content) => {
        const relayInfo: NostrRelays = JSON.parse(content?.content || '{}');

        const relays = { ...accountStore.relaySettings, ...relayInfo };

        setRelaySettings(relays, true);
      },
      onEose: () => {
        sendRelays(accountStore.activeRelays, accountStore.relaySettings, accountStore.proxyThroughPrimal);

        unsub();
      },
    });

    getRelays(accountStore.publicKey, `before_add_relay_${APP_ID}`);
  };

  export const removeRelay = (url: string) => {
    const urlVariants = [url, url.endsWith('/') ? url.slice(0, -1) : `${url}/`];

    const relay: Relay = accountStore.relays.find(r => {
      return urlVariants.includes(r.url);
    });

    // if relay is connected, close it and remove it from the list of open relays
    if (relay) {
      relay.close();
      const filtered = accountStore.relays.filter(r => !urlVariants.includes(r.url));
      updateAccountStore('relays', () => filtered);

      const filteredActive = accountStore.activeRelays.filter(r => !urlVariants.includes(r.url));
      updateAccountStore('activeRelays', () => filteredActive);
    }

    for (let i = 0; i<urlVariants.length; i++) {
      const u = urlVariants[i];

      // Add relay to the list of explicitly closed relays
      relaysExplicitlyClosed.push(u);

      // Reset connection attempts
      relayAtempts[u] = 0;

      // Remove relay from the user's relay settings
      updateAccountStore('relaySettings', () => ({ [u]: undefined }));
    }

    saveRelaySettings(accountStore.publicKey, accountStore.relaySettings);

    const unsub = subsTo(`before_remove_relay_${APP_ID}`, {
      onEvent: (_, content) => {
        let relayInfo: NostrRelays = JSON.parse(content?.content || '{}');

        delete relayInfo[url];

        const relays = { ...accountStore.relaySettings, ...relayInfo };

        setRelaySettings(relays, true);
      },
      onEose: () => {

        sendRelays(accountStore.activeRelays, accountStore.relaySettings, accountStore.proxyThroughPrimal);

        unsub();
      },
    });

    getRelays(accountStore.publicKey, `before_remove_relay_${APP_ID}`);
  };

  export const updateContacts = (content: NostrContactsContent) => {

    const followingSince = content.created_at;
    const tags = content.tags;
    const relayInfo = content.content;

    const contacts = tags.reduce((acc, t) => {
      return t[0] === 'p' ? [ ...acc, t[1] ] : acc;
    }, []);

    // const relaySettings = JSON.parse(content.content || '{}');

    // setRelaySettings(relaySettings, true);

    updateAccountStore('following', () => contacts);
    updateAccountStore('followingSince', () => followingSince || 0);
    updateAccountStore('contactsTags', () => [...tags]);
    updateAccountStore('contactsContent', () => relayInfo);

    saveFollowing(accountStore.publicKey, contacts, followingSince || 0);
  };

  export const extractContacts = (content: NostrContactsContent) => {

    if (content.created_at && content.created_at < accountStore.followingSince) {
      const storage = getStorage(accountStore.publicKey);

      return {
        following: storage.following,
        created_at: storage.followingSince || 0,
        tags: accountStore.contactsTags,
        content: accountStore.contactsContent,
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

  export const updateMuted = (content: NostrMutedContent) => {

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

      if (accountStore.muted.includes(pubkey)) {
        return acc;
      }

      return [ ...acc, pubkey ];
    }, []);

    updateAccountStore('mutedTags', () => [...tags]);
    updateAccountStore('muted', (ml) => [ ...ml, ...muted]);
    updateAccountStore('mutedPrivate', () => content.content);
    updateAccountStore('mutedSince', () => mutedSince || 0);

    saveMuteList(accountStore.publicKey, muted, content.content, mutedSince || 0);
  };

  export const updateStreamMuted = (content: NostrMutedContent) => {

    const mutedSince = content.created_at;
    const tags = content.tags;

    const muted = tags.reduce((acc, t) => {
      if (t[0] !== 'p') {
        return acc;
      }

      const pubkey = t[1];

      if (accountStore.muted.includes(pubkey)) {
        return acc;
      }

      return [ ...acc, pubkey ];
    }, []);

    updateAccountStore('streamMutedTags', () => [...tags]);
    updateAccountStore('streamMuted', (ml) => [ ...ml, ...muted]);
    updateAccountStore('streamMutedPrivate', () => content.content);
    updateAccountStore('streamMutedSince', () => mutedSince || 0);

    saveMuteList(accountStore.publicKey, muted, content.content, mutedSince || 0);
  };

  export const resolveContacts = async (
    pubkey: string,
    following: string[],
    date: number,
    tags: string[][],
    relayInfo: string,
    cb?: (remove: boolean, pubkey: string) => void,
  ) => {
    const { success, note: event } = await sendContacts(tags, date, relayInfo, accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

    if (success && event) {
      updateAccountStore('following', () => following);
      updateAccountStore('followingSince', () => date);
      updateAccountStore('contactsTags', () => [...tags]);
      updateAccountStore('contactsContent', () => relayInfo);
      saveFollowing(accountStore.publicKey, following, date);

      triggerImportEvents([event], `import_follow_contacts_${APP_ID}`, () => {
        cb && cb(false, pubkey);
      });
    }
  };

  export const replaceContactList = async (
    date: number,
    tags: string[][],
    relayInfo: string,
    cb?: (remove: boolean, pubkey: string | undefined) => void,
  ) => {
    const { success, note: event } = await sendContacts(tags, date, relayInfo, accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

    if (success && event) {
      const following = event.tags.reduce<string[]>((acc, t) => t[0] === 'p' ? [...acc, t[1]] : acc, []);

      updateAccountStore('following', () => following);
      updateAccountStore('followingSince', () => date);
      updateAccountStore('contactsTags', () => [...tags]);
      updateAccountStore('contactsContent', () => relayInfo);
      saveFollowing(accountStore.publicKey, following, date);

      triggerImportEvents([event], `import_follow_contacts_${APP_ID}`, () => {
        cb && cb(false, accountStore.publicKey);
      });
    }
  };

  export const addFollow = (pubkey: string, cb?: (remove: boolean, pubkey: string) => void) => {
    if (!accountStore.publicKey || accountStore.following.includes(pubkey)) {
      return;
    }

    updateAccountStore('followInProgress', () => pubkey);

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
        logInfo('FOLLOW DATE STORE: ', accountStore.followingSince);
        logInfo('FOLLOW DATE DIFF: ', (content.created_at || 0) - accountStore.followingSince);

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

            updateAccountStore('followData', () => ({
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
        if (accountStore.following.length === 0) {
          const date = Math.floor((new Date()).getTime() / 1000);
          const tags = [['p', pubkey]];
          resolveContacts(pubkey, [pubkey], date, tags, accountStore.relays[0].url, cb);
        }
        updateAccountStore('followInProgress', () => '');
        unsub();
      },
    });

    getProfileContactList(accountStore.publicKey, `before_follow_${APP_ID}`);

  }

  export const removeFollow = (pubkey: string, cb?: (remove: boolean, pubkey: string) => void) => {
    if (
      !accountStore.publicKey ||
      !accountStore.following.includes(pubkey) ||
      accountStore.publicKey === pubkey
    ) {
      return;
    }

    updateAccountStore('followInProgress', () => pubkey);

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
        logInfo('FOLLOW DATE STORE: ', accountStore.followingSince);
        logInfo('FOLLOW DATE DIFF: ', (content.created_at || 0) - accountStore.followingSince);

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

            updateAccountStore('followData', () => ({
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
        updateAccountStore('followInProgress', () => '');
        unsub();
      },
    });

    getProfileContactList(accountStore.publicKey, `before_unfollow_${APP_ID}`);

  }

  export const quoteNote = (noteId: string | undefined) => {
    updateAccountStore('quotedNote', () => noteId);
  }

  export const addToMuteList = (pubkey: string, kind?: 'user' | 'word' | 'hashtag' | 'thread', then?: (success: boolean) => void) => {

    if (!accountStore.publicKey /*|| !accountStore.muted || accountStore.muted.includes(pubkey) */) {
      return;
    }

    if (!accountStore.sec || accountStore.sec.length === 0) {
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
          content.created_at > accountStore.mutedSince
        ) {
          updateMuted(content);
        }
      },
      onEose: async () => {
        unsub();

        if (muteKind === 'user') {
          if (accountStore.muted.includes(pubkey)) return;

          const date = Math.floor((new Date()).getTime() / 1000);
          const muted = [...unwrap(accountStore.muted), pubkey];

          const tags = [ ...unwrap(accountStore.mutedTags), ['p', pubkey]];

          const { success, note } = await sendMuteList(tags, date, accountStore.mutedPrivate, accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

          if (success) {
            updateAccountStore('muted', () => muted);
            updateAccountStore('mutedTags', () => tags);
            updateAccountStore('mutedSince', () => date);
            saveMuted(accountStore.publicKey, muted, date);
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

          const tags = [ ...unwrap(accountStore.mutedTags), [flags[muteKind], pubkey]];

          const { success, note } = await sendMuteList(tags, date, accountStore.mutedPrivate, accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

          if (success) {
            updateAccountStore('mutedTags', () => tags);
            updateAccountStore('mutedSince', () => date);
            note && triggerImportEvents([note], `import_mute_list_word_add_${APP_ID}`);
          }

          then && then(success);
        }
      },
    });

    getProfileMuteList(accountStore.publicKey, subId);
  };

  export const removeFromMuteList = (pubkey: string, kind?: 'user' | 'word' | 'hashtag' | 'thread', then?: (success?: boolean) => void) => {
    if (!accountStore.publicKey /* || !accountStore.muted || !accountStore.muted.includes(pubkey)*/ ) {
      return;
    }

    if (!accountStore.sec || accountStore.sec.length === 0) {
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
          content.created_at > accountStore.followingSince
        ) {
          updateMuted(content as NostrMutedContent);
        }
      },
      onEose: async () => {
        unsub();

        if (muteKind === 'user') {
          if (!accountStore.muted.includes(pubkey)) return;

          const date = Math.floor((new Date()).getTime() / 1000);
          const muted = unwrap(accountStore.muted).filter(m => m !== pubkey);

          const tags = unwrap(accountStore.mutedTags).filter(t => t[0] !== 'p' || t[1] !== pubkey);

          const { success, note } = await sendMuteList(tags, date, accountStore.mutedPrivate, accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

          if (success) {
            updateAccountStore('muted', () => muted);
            updateAccountStore('mutedTags', () => tags);
            updateAccountStore('mutedSince', () => date);
            saveMuted(accountStore.publicKey, muted, date);
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

          const tags = unwrap(accountStore.mutedTags).filter(t => t[0] !== flags[muteKind] || t[1] !== pubkey).filter(t => t[1] !== "");

          const { success, note } = await sendMuteList(tags, date, accountStore.mutedPrivate, accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

          if (success) {
            updateAccountStore('mutedTags', () => tags);
            updateAccountStore('mutedSince', () => date);
            note && triggerImportEvents([note], `import_mute_list_word_remove_${APP_ID}`);
          }

          then && then(success);
        }
      }
    });

    getProfileMuteList(accountStore.publicKey, `before_unmute_${APP_ID}`);
  };

  export const addToStreamMuteList = (pubkey: string, then?: (success: boolean) => void) => {

    if (!accountStore.publicKey /*|| !accountStore.muted || accountStore.muted.includes(pubkey) */) {
      return;
    }

    if (!accountStore.sec || accountStore.sec.length === 0) {
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
          content.created_at > accountStore.streamMutedSince
        ) {
          updateStreamMuted(content as NostrMutedContent);
        }
      },
      onEose: async () => {
        unsub();

        if (accountStore.streamMuted.includes(pubkey)) return;

        const date = Math.floor((new Date()).getTime() / 1000);
        const muted = [...unwrap(accountStore.streamMuted), pubkey];

        const tags = [ ...unwrap(accountStore.streamMutedTags), ['p', pubkey]];

        const { success, note } = await sendStreamMuteList(tags, date, accountStore.streamMutedPrivate, accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

        if (success) {
          updateAccountStore('streamMuted', () => muted);
          updateAccountStore('streamMutedTags', () => tags);
          updateAccountStore('streamMutedSince', () => date);
          saveStreamMuted(accountStore.publicKey, muted, date);
          note && triggerImportEvents([note], `import_stream_mute_list_add_${APP_ID}`);
        }

        then && then(success);
      },
    });

    getReplacableEvent(accountStore.publicKey, Kind.StreamMuteList, subId);
  };

  export const removeFromStreamMuteList = (pubkey: string, then?: (success?: boolean) => void) => {
    if (!accountStore.publicKey /* || !accountStore.muted || !accountStore.muted.includes(pubkey)*/ ) {
      return;
    }

    if (!accountStore.sec || accountStore.sec.length === 0) {
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
          content.created_at > accountStore.followingSince
        ) {
          updateStreamMuted(content as NostrMutedContent);
        }
      },
      onEose: async () => {
        unsub();

        if (!accountStore.streamMuted.includes(pubkey)) return;

        const date = Math.floor((new Date()).getTime() / 1000);
        const muted = unwrap(accountStore.streamMuted).filter(m => m !== pubkey);

        const tags = unwrap(accountStore.streamMutedTags).filter(t => t[0] !== 'p' || t[1] !== pubkey);

        const { success, note } = await sendStreamMuteList(tags, date, accountStore.streamMutedPrivate, accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

        if (success) {
          updateAccountStore('streamMuted', () => muted);
          updateAccountStore('streamMutedTags', () => tags);
          updateAccountStore('streamMutedSince', () => date);
          saveStreamMuted(accountStore.publicKey, muted, date);
          note && triggerImportEvents([note], `import_stream_mute_list_remove_${APP_ID}`);
        }

        then && then(success);
      }
    });

    getReplacableEvent(accountStore.publicKey, Kind.StreamMuteList, subId);
  };

  export const changeCachingService = (url?: string) => {
    if (!url) {
      localStorage.removeItem('cacheServer');
    }
    else {
      localStorage.setItem('cacheServer', url);
    }

    reset();
  };

  export const dissconnectDefaultRelays = () => {
    for(let i=0; i < accountStore.defaultRelays.length; i++) {
      const url = accountStore.defaultRelays[i];

      const relay = accountStore.relays.find(r => r.url === url);

      if (relay) {
        relay.close();
        const filtered = accountStore.relays.filter(r => r.url !== url);
        updateAccountStore('relays', () => filtered);
      }

      // Add relay to the list of explicitly closed relays
      relaysExplicitlyClosed.push(url);

      // Reset connection attempts
      relayAtempts[url] = 0;
    }
  };

  export const updateFilterlists = (mutelists: NostrMutedContent) => {

    let filterlists: Filterlist[] = [...accountStore.mutelists];
    const since = mutelists.created_at;
    const tags = mutelists.tags;

    if (mutelists.kind !== Kind.CategorizedPeople || !tags.find(t => t[0] === 'd' && t[1] === 'mutelists')) {
      return [...accountStore.mutelists];
    }

    updateAccountStore('mutelistSince', () => since || 0);

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

        const index = accountStore.mutelists.findIndex(m => m.pubkey === tag[1]);

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

  export const getFilterLists = (pubkey: string | undefined) => {
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
        if (accountStore.publicKey && !filterlists.find(l => l.pubkey === accountStore.publicKey)) {
          filterlists.unshift({ pubkey: accountStore.publicKey, content: true, trending: true });
        }
        updateAccountStore('mutelists', () => [...filterlists]);
        unsub();
      },
    });

    getFilterlists(pubkey, subId);
  };

  export const addFilterList = async (pubkey: string | undefined) => {
    if (!pubkey) {
      return;
    }

    const random = generatePrivateKey();
    const subId = `bma_${random}_${APP_ID}`;

    let filterlists: Filterlist[] = [...accountStore.mutelists];

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (content &&
          content.kind === Kind.CategorizedPeople &&
          content.created_at &&
          content.created_at > accountStore.mutelistSince
        ) {
          filterlists = [...updateFilterlists(content)];
        }
      },
      onEose: async () => {
        updateAccountStore('mutelists', () => [...filterlists]);

        if (accountStore.mutelists.find(m => m.pubkey === pubkey)) {
          return;
        }

        const date = Math.floor((new Date()).getTime() / 1000);

        updateAccountStore('mutelists', (mls) => [ ...mls, { pubkey, content: true, trending: true } ]);

        const { success, note } = await sendFilterlists(accountStore.mutelists, date, '', accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

        if (success) {
          note && triggerImportEvents([note], `import_mutelists_event_add_${APP_ID}`);
        }

        unsub();
      },
    });

    getFilterlists(accountStore.publicKey, subId);

  };

  export const removeFilterList = (pubkey: string | undefined) => {
    if (!pubkey || pubkey === accountStore.publicKey) {
      return;
    }

    const random = generatePrivateKey();
    const subId = `bmr_${random}_${APP_ID}`;
    let filterlists: Filterlist[] = [...accountStore.mutelists];

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {if (content &&
        content.kind === Kind.CategorizedPeople &&
        content.created_at &&
        content.created_at > accountStore.mutelistSince
      ) {
        filterlists = updateFilterlists(content);
      }
      },
      onEose: async () => {
        updateAccountStore('mutelists', () => [...filterlists]);

        const modified = accountStore.mutelists.filter(m => m.pubkey !== pubkey);
        const date = Math.floor((new Date()).getTime() / 1000);

        updateAccountStore('mutelists', () => [ ...modified ]);

        const { success, note } = await sendFilterlists(accountStore.mutelists, date, '', accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

        if (success) {
          note && triggerImportEvents([note], `import_mutelists_event_remove_${APP_ID}`);
        }

        unsub();
      },
    });

    getFilterlists(accountStore.publicKey, subId);
  };

  export const updateFilterList = (pubkey: string | undefined, content = true, trending = true) => {
    if (!pubkey) {
      return;
    }
    const random = generatePrivateKey();
    const subId = `bmu_${random}_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {if (content &&
        content.kind === Kind.CategorizedPeople &&
        content.created_at &&
        content.created_at > accountStore.mutelistSince
      ) {
        updateFilterlists(content);
      }
      },
      onEose: async () => {

        if (!accountStore.mutelists.find(m => m.pubkey === pubkey)) {
          unsub();
          return;
        }

        const date = Math.floor((new Date()).getTime() / 1000);

        updateAccountStore('mutelists',
          m => m.pubkey === pubkey,
          () => ({ content, trending }),
        );

        const { success, note } = await sendFilterlists(accountStore.mutelists, date, '', accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

        if (success) {
          note && triggerImportEvents([note], `import_mutelists_event_update_${APP_ID}`);
        }

        unsub();
      },
    });

    getFilterlists(accountStore.publicKey, subId);

  };

  export const updateAllowlist = (allowlist: NostrMutedContent) => {

    const since = allowlist.created_at;
    const tags = allowlist.tags;

    if (allowlist.kind !== Kind.CategorizedPeople || !tags.find(t => t[0] === 'd' && t[1] === 'allowlist')) {
      return;
    }

    updateAccountStore('mutelistSince', () => since || 0);

    const pubkeys = tags.reduce((acc, t) => {
      return t[0] === 'p' ? [...acc, t[1]] : acc;
    }, []);

    updateAccountStore('allowlist', () => pubkeys);
  }

  export const getAllowList = (pubkey: string | undefined) => {
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

  export const addToAllowlist = (pubkey: string | undefined, then?: () => void) => {
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
          content.created_at > accountStore.allowlistSince
        ) {
          updateAllowlist(content);
        }
      },
      onEose: async () => {

        if (accountStore.allowlist.includes(pubkey)) {
          return;
        }

        const date = Math.floor((new Date()).getTime() / 1000);

        updateAccountStore('allowlist', accountStore.allowlist.length, () => pubkey);

        const { success, note } = await sendAllowList(accountStore.allowlist, date, '', accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

        if (success) {
          note && triggerImportEvents([note], `import_allowlist_event_add_${APP_ID}`)
        }

        then && then();
        unsub();
      },
    });

    getAllowlist(accountStore.publicKey, subId);

  };

  export const removeFromAllowlist = (pubkey: string | undefined) => {
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
          content.created_at > accountStore.allowlistSince
        ) {
          updateAllowlist(content);
        }
      },
      onEose: async () => {
        if (!accountStore.allowlist.includes(pubkey)) {
          return;
        }

        const date = Math.floor((new Date()).getTime() / 1000);
        const newList = accountStore.allowlist.filter(pk => pk !== pubkey);

        updateAccountStore('allowlist', () => [...newList]);

        const { success, note } = await sendAllowList(accountStore.allowlist, date, '', accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

        if (success) {
          note && triggerImportEvents([note], `import_allowlist_event_remove_${APP_ID}`)
          return;
        }

        unsub();
      },
    });

    getAllowlist(accountStore.publicKey, subId);

  };

  export const saveEmoji = (emoji: EmojiOption) => {
    const history = accountStore.emojiHistory;

    if (history.find(e => e.name === emoji.name)) {
      let sorted = [...history];
      sorted.sort((a, b) => a.name === emoji.name ? -1 : b.name === emoji.name ? 1 : 0);

      updateAccountStore('emojiHistory', () => [...sorted]);
      saveEmojiHistory(accountStore.publicKey, accountStore.emojiHistory);

      return;
    }

    updateAccountStore('emojiHistory', (h) => [emoji, ...h].slice(0, 40));
    saveEmojiHistory(accountStore.publicKey, accountStore.emojiHistory);
  };

  export const checkNostrKey = () => {
    if (accountStore.publicKey) return;
    updateAccountStore('isKeyLookupDone', () => false);
    // TODO
    fetchNostrKey();
  };

  export const fetchBookmarks = () => {
    const bookmarksId = `user_bookmarks_${APP_ID}`;

    handleSubscription(
      bookmarksId,
      () => getBookmarks(accountStore.publicKey, bookmarksId),
      handleUserBookmarksEvent,
      handleUserBookmarksEose,
    );
  }

  export const updateBookmarks = (bookmarks: string[]) => {
    updateAccountStore('bookmarks', () => [...bookmarks]);
  };

  export const updateRelays = () => {
    const relaysId = `user_relays_${APP_ID}`;

    handleSubscription(
      relaysId,
      () => getRelays(accountStore.publicKey, relaysId),
      handleUserRelaysEvent,
    );
  }

  export const updateContactsList = () => {

    const contactsId = `user_contacts_${APP_ID}`;

    handleSubscription(
      contactsId,
      () =>   getProfileContactList(accountStore.publicKey, contactsId),
      handleUserContactsEvent,
    );
  }

  export const setString = (key: Part<AccountStore, keyof AccountStore>, str: string) => {
    updateAccountStore(key, () => str);
  }

  export const setFlag = (key: Part<AccountStore, keyof AccountStore>, flag: boolean) => {
    updateAccountStore(key, () => flag);
  }

  export const setFollowData = (followData: FollowData) => {
    updateAccountStore('followData', () => ({ ...followData }));
  }

  export const setActiveNWC = (nwc: string[]) => {
    updateAccountStore('activeNWC', () => [...nwc]);
  }

  export const updateNWCList = (list: string[][]) => {
    updateAccountStore('nwcList', () => [...list]);
  }

  export const insertIntoNWCList = (nwc: string[], index?: number) => {
    if (index === undefined || index < 0) {
      updateAccountStore('nwcList', accountStore.nwcList.length, () => [...nwc]);
      return;
    }
    updateAccountStore('nwcList', index, () => [...nwc]);
  }

  export const fetchBlossomServers = (pubkey: string) => {
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

  export const addBlossomServers = (url: string, append?: boolean) => {
    if (append) {
      appendBlossomServers(url);
      return;
    }

    if (accountStore.blossomServers.find(u => areUrlsSame(u, url))) {
      updateAccountStore('blossomServers', (servers) => [url, ...servers.filter(s => !areUrlsSame(s, url))]);
      updateBlossomEvent();
      return;
    }

    updateAccountStore('blossomServers', (servers) => [url, ...servers]);
    updateBlossomEvent();
  }

  export const appendBlossomServers = (url: string) => {
    if (accountStore.blossomServers.find(u => areUrlsSame(u, url))) {
      updateAccountStore('blossomServers', (servers) => [...servers.filter(s => !areUrlsSame(s, url)), url]);
      updateBlossomEvent();
      return;
    }

    updateAccountStore('blossomServers', (servers) => [...servers, url]);
    updateBlossomEvent();
  }

  export const removeBlossomServers = (url: string) => {
    if (!accountStore.blossomServers.includes(url)) return;

    updateAccountStore('blossomServers', (servers) => servers.filter(s => s !== url));
    updateBlossomEvent();
  }

  export const removeBlossomMirrors = (then?: () => void) => {
    const main = accountStore.blossomServers[0] || primalBlossom;
    updateAccountStore('blossomServers', () => [main]);
    updateBlossomEvent(then);
  }

  export const setBlossomServers = (urls: string[]) => {
    updateAccountStore('blossomServers', () => [ ...urls ]);
    // updateBlossomEvent();
  }

  export const updateBlossomEvent = async (then?: () => void) => {
    const { success, note } = await sendBlossomEvent(accountStore.blossomServers, accountStore.proxyThroughPrimal, accountStore.activeRelays, accountStore.relaySettings);

    if (!success || !note) {
      // toast?.sendWarning('Failed to send server list');
      return;
    }
    triggerImportEvents([note], `import_blossom_list_${APP_ID}`, then);
  }

  export const fetchNostrKey = async () => {

    const storedKey = localStorage.getItem('pubkey');

    if (storedKey) {
      setPublicKey(storedKey);

      // Read profile from storage
      const storedUser = getStoredProfile(storedKey);

      if (storedUser) {
        // If it exists, set it as active user
        updateAccountStore('activeUser', () => ({...storedUser}));
      }
      return;
    }
  };

// NOSTR HANDLERS --------------------------------------------------------------

  const handleUserProfileEvent = (content: NostrEventContent) => {
    if (content?.content) {
      if (content.kind === Kind.Metadata) {
        const user = JSON.parse(content.content);

        updateAccountStore('activeUser', () => ({...user, pubkey: content.pubkey}));
        setStoredProfile(user);
        updateRelays()
      }
    }
  }

  const handleUserContactsEvent = (content: NostrEventContent) => {
    if (content && content.kind === Kind.Contacts) {
      if (!content.created_at || content.created_at < accountStore.followingSince) {
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

      if (!content.created_at || content.created_at < accountStore.mutedSince) {
        return;
      }

      updateMuted(content as NostrMutedContent);
    }
  }

  const handleStreamMuteListEvent = (content: NostrEventContent) => {
    if (content && [Kind.StreamMuteList].includes(content.kind)) {

      if (!content.created_at || content.created_at < accountStore.streamMutedSince) {
        return;
      }

      updateStreamMuted(content as NostrMutedContent);
    }
  }

  const handleDefaultRelaysEvent = (content: NostrEventContent) => {
    const resp = JSON.parse(content.content || '[]');

    updateAccountStore('defaultRelays', () => [...resp]);

    const relaySettings: NostrRelays = resp.reduce((acc: NostrRelays, r: string) => ({ ...acc, [r]: { read: true, write: true }}), {});

    if (Object.keys(relaySettings).length > 0) {
      connectToRelays(relaySettings);
    }
  }

  const handleUserBookmarksEvent = (content: NostrEventContent) => {
    if (!content || content.kind !== Kind.Bookmarks || !content.created_at || content.created_at < accountStore.followingSince) {
      return;
    }

    const notes = content.tags.reduce((acc, t) => {
      if (supportedBookmarkTypes.includes(t[0])) {
        return [...acc, t[1]];
      }
      return [...acc];
    }, []);

    updateAccountStore('bookmarks', () => [...notes]);
  }

  const handleUserBookmarksEose = () => {
    saveBookmarks(accountStore.publicKey, accountStore.bookmarks);
  }

// -----------------------------------------------------------------------------
export const [accountStore, updateAccountStore] = createStore<AccountStore>({
  ...initAccountStore,
});
