import { UserStats } from "../contexts/ProfileContext";
import { NostrRelays, PrimalFeed, PrimalUser, SelectionOption } from "../types/primal";

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
};

export const emptyStorage = {
  following: [],
  followingSince: 0,
  muted: [],
  mutedPrivate: '',
  mutedSince: 0,
  relaySettings: {},
  likes: [],
  feeds: [],
  theme: 'sunset',
  homeSidebarSelection: undefined,
  userProfile: undefined,
  recomended: { profiles: [], stats: {} },
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
