import { UserStats } from "../contexts/ProfileContext";
import { EmojiOption, NostrRelays, PrimalFeed, PrimalUser, SelectionOption, SenderMessageCount, UserRelation } from "../types/primal";

export type LocalStore = {
  following: string[],
  followingSince: number,
  muted: string[],
  mutedPrivate: string,
  mutedSince: number,
  relaySettings: NostrRelays,
  likes: string[],
  feeds: PrimalFeed[];
  theme: string,
  homeSidebarSelection: SelectionOption | undefined,
  userProfile: PrimalUser | undefined,
  recomended: {
    profiles: PrimalUser[],
    stats: Record<string, UserStats>,
  },
  msgContacts: {
    profiles: Record<UserRelation, Record<string, PrimalUser>>,
    counts: Record<string, SenderMessageCount>,
  },
  emojiHistory: EmojiOption[],
  noteDraft: Record<string, string>,
  noteDraftUserRefs: Record<string, Record<string, PrimalUser>>,
  uploadTime: Record<string, number>,
  selectedFeed: PrimalFeed | undefined,
};

export type UploadTime = {
  small: number,
  medium: number,
  large: number,
  huge: number,
  final: number,
}

export const defaultUploadTime: UploadTime = {
  small: 250,
  medium: 250,
  large: 250,
  huge: 250,
  final: 100,
};

export const emptyStorage: LocalStore = {
  following: [],
  followingSince: 0,
  muted: [],
  mutedPrivate: '',
  mutedSince: 0,
  relaySettings: {},
  likes: [],
  feeds: [],
  msgContacts: { profiles: { other: {}, follows: {}, any: {} }, counts: {} },
  theme: 'sunset',
  homeSidebarSelection: undefined,
  userProfile: undefined,
  recomended: { profiles: [], stats: {} },
  emojiHistory: [],
  noteDraft: {},
  noteDraftUserRefs: {},
  uploadTime: defaultUploadTime,
  selectedFeed: undefined,
}

export const storageName = (pubkey?: string) => {
  if (!pubkey) {
    return 'anon';
  }

  return `store_${pubkey}`;
};

export const getStorage = (pubkey?: string) => {
  if (!pubkey) {
    return {} as LocalStore;
  }

  const name = storageName(pubkey);
  const storage = localStorage.getItem(name);

  return storage ?
    JSON.parse(storage) as LocalStore :
    { ...emptyStorage };
};

export const setStorage = (pubkey: string | undefined, data: LocalStore) => {
  if (!pubkey) {
    return;
  }

  const name = storageName(pubkey);
  const value = JSON.stringify(data);

  localStorage.setItem(name, value);
}

export const saveFollowing = (pubkey: string | undefined, following: string[], since: number) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.following = [...following];
  store.followingSince = since;

  setStorage(pubkey, store);
}

export const saveMuteList = (pubkey: string | undefined, muted: string[], mutedPrivate: string, since: number) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.muted = [...muted];
  store.mutedPrivate = mutedPrivate;
  store.mutedSince = since;

  setStorage(pubkey, store);
}

export const saveMuted = (pubkey: string | undefined, muted: string[], since: number) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.muted = [...muted];
  store.mutedSince = since;

  setStorage(pubkey, store);
}

export const saveRelaySettings = (pubkey: string | undefined, settings: NostrRelays) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.relaySettings = { ...settings };

  setStorage(pubkey, store);
}

export const saveLikes = (pubkey: string | undefined, likes: string[]) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.likes = [ ...likes ];

  setStorage(pubkey, store);
};

export const saveFeeds = (pubkey: string | undefined, feeds: PrimalFeed[]) => {
  if (!pubkey) {
    return;
  }
  const store = getStorage(pubkey);

  store.feeds = [ ...feeds ];

  setStorage(pubkey, store);
};

export const saveTheme = (pubkey: string | undefined, theme: string) => {
  if (!pubkey) {
    return;
  }
  const store = getStorage(pubkey);

  store.theme = theme;

  setStorage(pubkey, store);
};

export const saveRecomendedUsers = (pubkey: string | undefined, recomended: { profiles: PrimalUser[], stats: Record<string, UserStats> }) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.recomended = recomended;

  setStorage(pubkey, store);
}

export const readRecomendedUsers = (pubkey: string | undefined) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  const recomended = store.recomended;

  return recomended ? recomended as { profiles: PrimalUser[], stats: Record<string, UserStats> } : undefined;
}

export const saveEmojiHistory = (pubkey: string | undefined, emojis: EmojiOption[]) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.emojiHistory = emojis;

  setStorage(pubkey, store);
}

export const readEmojiHistory = (pubkey: string | undefined) => {
  if (!pubkey) {
    return [];
  }

  const store = getStorage(pubkey);

  const emojis = store.emojiHistory;

  return emojis || [];
}

export const saveNoteDraft = (pubkey: string | undefined, draft: string, replyTo?: string) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  const key = replyTo || 'root';

  if (!store.noteDraft || typeof store.noteDraft === 'string') {
    store.noteDraft = {};
  }

  store.noteDraft[key] = draft;

  setStorage(pubkey, store);
}

export const readNoteDraft = (pubkey: string | undefined, replyTo?: string) => {
  if (!pubkey) {
    return '';
  }

  const store = getStorage(pubkey);

  if (!store.noteDraft || typeof store.noteDraft === 'string') {
    store.noteDraft = {};
  }

  const key = replyTo || 'root';

  return store.noteDraft[key] || '';
}

export const saveNoteDraftUserRefs = (pubkey: string | undefined, refs: Record<string, PrimalUser>, replyTo?: string) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  const key = replyTo || 'root';

  if (!store.noteDraftUserRefs || typeof store.noteDraftUserRefs === 'string') {
    store.noteDraftUserRefs = {};
  }

  store.noteDraftUserRefs[key] = refs;

  setStorage(pubkey, store);
}

export const readNoteDraftUserRefs = (pubkey: string | undefined, replyTo?: string) => {
  if (!pubkey) {
    return {};
  }

  const store = getStorage(pubkey);

  if (!store.noteDraftUserRefs || typeof store.noteDraftUserRefs === 'string') {
    store.noteDraftUserRefs = {};
  }

  const key = replyTo || 'root';

  return store.noteDraftUserRefs[key] || {};
}

export const saveUploadTime = (pubkey: string | undefined, uploadTime: Record<string, number>) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.uploadTime = { ...store.uploadTime, ...uploadTime };

  setStorage(pubkey, store);
}

export const readUploadTime = (pubkey: string | undefined) => {
  if (!pubkey) {
    return {...defaultUploadTime};
  }

  const store = getStorage(pubkey);

  return { ...defaultUploadTime, ...store.uploadTime } as UploadTime;
}

export const saveHomeSidebarSelection = (pubkey: string | undefined, selection: SelectionOption | undefined) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.homeSidebarSelection = selection ? { ...selection } : undefined;

  setStorage(pubkey, store);
}

export const readHomeSidebarSelection = (pubkey: string | undefined) => {
  if (!pubkey) {
    return undefined;
  }
  const store = getStorage(pubkey)
  const selection = store.homeSidebarSelection;

  return selection ? selection as SelectionOption : undefined;
};

export const readSecFromStorage = () => {
  return localStorage.getItem('primalSec') || undefined;
};

export const storeSec = (sec: string | undefined) => {
  if (!sec) {
    localStorage.removeItem('primalSec');
    return;
  }

  localStorage.setItem('primalSec', sec);

};

export const clearSec = () => {
  localStorage.removeItem('primalSec');
};

export const getStoredProfile = (pubkey: string) => {
  const store = getStorage(pubkey)
  const user = store.userProfile;

  if (user && user.pubkey === pubkey) {
    return user;
  }

  return undefined;
};

export const setStoredProfile = (profile: PrimalUser) => {
  const store = getStorage(profile.pubkey);

  store.userProfile = {...profile};

  setStorage(profile.pubkey, store);
};


export const saveMsgContacts = (pubkey: string | undefined, contacts: Record<string, PrimalUser>, counts: Record<string, SenderMessageCount>, context: UserRelation) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  if (!store.msgContacts) {
    store.msgContacts = { profiles: { follows: {}, other: {}, any: {} }, counts: {} };
  }

  store.msgContacts.profiles[context] = { ...contacts };
  store.msgContacts.counts = { ...counts };

  setStorage(pubkey, store);
}


export const loadMsgContacts = (pubkey: string) => {
  const store = getStorage(pubkey)

  return store.msgContacts || { profiles: {}, counts: {} };
};


export const fetchStoredFeed = (pubkey: string | undefined) => {
  if (!pubkey) return undefined;

  const store = getStorage(pubkey)

  return store.selectedFeed;
};

export const saveStoredFeed = (pubkey: string | undefined, feed: PrimalFeed) => {
  if (!pubkey) return;

  const store = getStorage(pubkey);

  store.selectedFeed = { ...feed };

  setStorage(pubkey, store);
};
