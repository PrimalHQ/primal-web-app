import { TopicStat } from "../megaFeeds";
import { convertToUser, userName } from "../stores/profile";
import { EmojiOption, NostrRelays, NostrStats, PrimalArticleFeed, PrimalDVM, PrimalFeed, PrimalUser, SelectionOption, SenderMessageCount, UserRelation, UserStats } from "../types/primal";
import { StreamingData } from "./streaming";

export type LocalStore = {
  following: string[],
  followingSince: number,
  muted: string[],
  mutedPrivate: string,
  mutedSince: number,
  streamMuted: string[],
  streamMutedPrivate: string,
  streamMutedSince: number,
  relaySettings: NostrRelays,
  likes: string[],
  feeds: PrimalFeed[];
  homeFeeds: PrimalArticleFeed[],
  readsFeeds: PrimalArticleFeed[],
  theme: string,
  homeSidebarSelection: SelectionOption | undefined,
  userProfile: PrimalUser | undefined,
  bookmarks: string[],
  recomended: {
    profiles: PrimalUser[],
    stats: Record<string, UserStats>,
  },
  msgContacts: {
    profiles: Record<UserRelation, Record<string, PrimalUser>>,
    counts: Record<string, SenderMessageCount>,
  },
  dmConversations: {
    profiles: Record<string, PrimalUser>,
    counts: Record<string, SenderMessageCount>,
  },
  emojiHistory: EmojiOption[],
  noteDraft: Record<string, string>,
  noteDraftUserRefs: Record<string, Record<string, PrimalUser>>,
  uploadTime: Record<string, number>,
  selectedFeed: PrimalFeed | undefined,
  selectedHomeFeed: PrimalArticleFeed | undefined,
  selectedReadsFeed: PrimalArticleFeed | undefined,
  selectedBookmarksFeed: string | undefined,
  animated: boolean,
  dmLastConversation: string | undefined,
  dmLastRelation: UserRelation | undefined,
  premiumReminder: number,
  dvms: PrimalDVM[] | undefined,
  usePrimalRelay: boolean | undefined,
  nwc: string[][] | undefined,
  nwcActive: string[] | undefined,
  useSystemDarkMode: boolean | undefined,
  liveStreams: StreamingData[] | undefined,
  liveAuthors: PrimalUser[] | undefined,
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
  streamMuted: [],
  streamMutedPrivate: '',
  streamMutedSince: 0,
  relaySettings: {},
  likes: [],
  feeds: [],
  homeFeeds: [],
  readsFeeds: [],
  msgContacts: { profiles: { other: {}, follows: {}, any: {} }, counts: {} },
  dmConversations: { profiles: {}, counts: {} },
  theme: 'sunrise',
  homeSidebarSelection: undefined,
  userProfile: undefined,
  recomended: { profiles: [], stats: {} },
  emojiHistory: [],
  noteDraft: {},
  noteDraftUserRefs: {},
  uploadTime: defaultUploadTime,
  selectedFeed: undefined,
  bookmarks: [],
  animated: true,
  selectedHomeFeed: undefined,
  selectedReadsFeed: undefined,
  selectedBookmarksFeed: undefined,
  dmLastConversation: undefined,
  dmLastRelation: undefined,
  premiumReminder: 0,
  dvms: undefined,
  usePrimalRelay: false,
  nwc: [],
  nwcActive: undefined,
  useSystemDarkMode: false,
  liveStreams: undefined,
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

export const saveStreamMuteList = (pubkey: string | undefined, muted: string[], mutedPrivate: string, since: number) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.streamMuted = [...muted];
  store.streamMutedPrivate = mutedPrivate;
  store.streamMutedSince = since;

  setStorage(pubkey, store);
}

export const saveStreamMuted = (pubkey: string | undefined, muted: string[], since: number) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.streamMuted = [...muted];
  store.streamMutedSince = since;

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

export const savePrimalRelaySettings = (pubkey: string | undefined, usePrimalRelay: boolean) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.usePrimalRelay = usePrimalRelay;

  setStorage(pubkey, store);
}

export const readPrimalRelaySettings = (pubkey: string | undefined) => {
  if (!pubkey) {
    return false;
  }

  const store = getStorage(pubkey);

  return store.usePrimalRelay || false;
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

export const saveHomeFeeds = (pubkey: string | undefined, feeds: PrimalArticleFeed[]) => {
  if (!pubkey) {
    return;
  }
  const store = getStorage(pubkey);

  store.homeFeeds = [ ...feeds ];

  setStorage(pubkey, store);
};

export const saveReadsFeeds = (pubkey: string | undefined, feeds: PrimalArticleFeed[]) => {
  if (!pubkey) {
    return;
  }
  const store = getStorage(pubkey);

  store.readsFeeds = [ ...feeds ];

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

export const readTheme = (pubkey: string | undefined) => {
  if (!pubkey) {
    return false;
  }

  const store = getStorage(pubkey);

  return store.theme || 'sunrise';
}


export const saveSystemDarkMode = (pubkey: string | undefined, flag: boolean) => {
  if (!pubkey) {
    return;
  }
  const store = getStorage(pubkey);

  store.useSystemDarkMode = flag;

  setStorage(pubkey, store);
};

export const readSystemDarkMode = (pubkey: string | undefined) => {
  if (!pubkey) {
    return false;
  }

  const store = getStorage(pubkey);

  return store.useSystemDarkMode || false;
}

export const saveAnimated = (pubkey: string | undefined, animated: boolean) => {
  if (!pubkey) {
    return;
  }
  const store = getStorage(pubkey);

  store.animated = animated;

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

export const savePremiumReminder = (pubkey: string | undefined, timestamp: number) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.premiumReminder = timestamp;

  setStorage(pubkey, store);
}

export const readPremiumReminder = (pubkey: string | undefined) => {
  if (!pubkey) {
    return undefined;
  }
  const store = getStorage(pubkey)

  return store.premiumReminder;
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


export const saveDmConversations = (pubkey: string | undefined, contacts: Record<string, PrimalUser>, counts: Record<string, SenderMessageCount>) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  if (!store.dmConversations) {
    store.dmConversations = { profiles: {}, counts: {} };
  }

  store.dmConversations.profiles = { ...store.dmConversations.profiles, ...contacts };
  store.dmConversations.counts = { ...store.dmConversations.counts, ...counts };

  setStorage(pubkey, store);
}

export const loadDmCoversations = (pubkey: string) => {
  const store = getStorage(pubkey)

  return store.dmConversations || { profiles: {}, counts: {} };
};

export const loadLastDMConversations = (pubkey: string) => {
  const store = getStorage(pubkey)

  return store.dmLastConversation;
};

export const saveLastDMConversations = (pubkey: string, contactPubkey: string) => {
  const store = getStorage(pubkey)
  store.dmLastConversation = contactPubkey;
  setStorage(pubkey, store);
};

export const loadLastDMRelation = (pubkey: string) => {
  const store = getStorage(pubkey)

  return store.dmLastRelation;
};

export const saveLastDMRelation = (pubkey: string, relation: UserRelation) => {
  const store = getStorage(pubkey)
  store.dmLastRelation = relation;
  setStorage(pubkey, store);
};

export const fetchStoredFeed = (pubkey: string | undefined, type: 'home' | 'reads') => {
  if (!pubkey) return undefined;

  const store = getStorage(pubkey)

  if (type === 'reads') {
    return store.selectedReadsFeed;
  }

  return store.selectedHomeFeed;
};

export const saveStoredFeed = (pubkey: string | undefined, type: 'home' | 'reads', feed: PrimalArticleFeed) => {
  if (!pubkey) return;

  const store = getStorage(pubkey);

  if (type === 'home') {
    store.selectedHomeFeed = { ...feed };
  }
  else if (type === 'reads') {
    store.selectedReadsFeed = { ...feed };
  }

  setStorage(pubkey, store);
};



export const fetchBookmarksFeed = (pubkey: string | undefined) => {
  if (!pubkey) return undefined;

  const store = getStorage(pubkey)

  return store.selectedBookmarksFeed;
};

export const saveBookmarksFeed = (pubkey: string | undefined, kind: string) => {
  if (!pubkey) return;

  const store = getStorage(pubkey);

  store.selectedBookmarksFeed = kind;

  setStorage(pubkey, store);
};

export const saveBookmarks = (pubkey: string | undefined, bookmarks: string[]) => {
  if (!pubkey) return;

  const store = getStorage(pubkey);

  store.bookmarks = [ ...bookmarks ];

  setStorage(pubkey, store);
};

export const readBookmarks = (pubkey: string | undefined) => {
  if (!pubkey) return [];

  const store = getStorage(pubkey)

  return store.bookmarks || [];
};


export const saveDVMs = (pubkey: string | undefined, dvms: PrimalDVM[]) => {
  if (!pubkey) return;

  const store = getStorage(pubkey);

  store.dvms = [ ...dvms ];

  setStorage(pubkey, store);
};

export const readDVMs = (pubkey: string | undefined) => {
  if (!pubkey) return [];

  const store = getStorage(pubkey)

  return store.dvms || [];
};

export const saveNostrStats = (stats: NostrStats) => {
  localStorage.setItem('nostrStats', JSON.stringify(stats))
};

export const loadNostrStats = () => {
  const stats = localStorage.getItem('nostrStats') ||
    JSON.stringify({
      users: 0,
      pubkeys: 0,
      pubnotes: 0,
      reactions: 0,
      reposts: 0,
      any: 0,
      zaps: 0,
      satszapped: 0,
    });

  return JSON.parse(stats) as NostrStats;
};

export const saveTrendingUsers = (users: PrimalUser[]) => {
  localStorage.setItem('trendingUsers', JSON.stringify(users));
};

export const loadTrendingUsers = () => {
  const stored = JSON.parse(localStorage.getItem('trendingUsers') || '[]');

  return stored as PrimalUser[];
};


export const saveHotTopics = (topics: TopicStat[]) => {
  localStorage.setItem('hotTopics', JSON.stringify(topics));
};

export const loadHotTopics = () => {
  const stored = JSON.parse(localStorage.getItem('hotTopics') || '[]');

  return stored as TopicStat[];
};

// NWC -----------------------------------------------------------

export const loadNWC = (pubkey: string, name?: string) => {
  const store = getStorage(pubkey);

  if (!name) {
    return store.nwc || [];
  }

  const res = (store.nwc || []).find(r => r[0] === name);

  return res ? [res] : [];
};

export const saveNWC = (pubkey: string, nwcList: string[][]) => {
  let store = getStorage(pubkey);

  store.nwc = [...nwcList];

  setStorage(pubkey, store);
};

export const loadNWCActive = (pubkey: string) => {
  const store = getStorage(pubkey);

  return store.nwcActive
};

export const saveNWCActive = (pubkey: string, name?: string, uri?: string) => {
  let store = getStorage(pubkey);

  if (!name || !uri) {
    store.nwcActive = [];
  } else {
    store.nwcActive = [name, uri];
  }

  setStorage(pubkey, store);
};


export const saveLiveStreams = (pubkey: string | undefined, streams: StreamingData[]) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.liveStreams = [...streams];

  setStorage(pubkey, store);
}


export const loadLiveStreams = (pubkey: string | undefined) => {
  if (!pubkey) {
    return [];
  }
  const store = getStorage(pubkey);

  return store.liveStreams || [];
};

export const saveLiveAuthors = (pubkey: string | undefined, streams: StreamingData[]) => {
  if (!pubkey) {
    return;
  }

  const store = getStorage(pubkey);

  store.liveAuthors = [...streams];

  setStorage(pubkey, store);
}


export const loadLiveAuthors = (pubkey: string | undefined) => {
  if (!pubkey) {
    return [];
  }
  const store = getStorage(pubkey);

  return store.liveAuthors || [];
};
