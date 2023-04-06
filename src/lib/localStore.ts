import { noKey } from "../constants"
import { NostrRelays } from "../types/primal";

export type LocalStore = {
  following: string[],
  followingSince: number,
  relaySettings: NostrRelays,
};

export const emptyStorage = {
  following: [],
  followingSince: 0,
  relaySettings: {},
}

export const storageName = (pubkey?: string) => {
  if (!pubkey || pubkey === noKey) {
    return 'anon';
  }

  return `store_${pubkey}`;
};

export const getStorage = (pubkey?: string) => {
  const name = storageName(pubkey);
  const storage = localStorage.getItem(name);

  return storage ?
    JSON.parse(storage) as LocalStore :
    { ...emptyStorage };
};

export const setStorage = (pubkey: string | undefined, data: LocalStore) => {
  const name = storageName(pubkey);
  const value = JSON.stringify(data);

  localStorage.setItem(name, value);
}

export const saveFollowing = (pubkey: string | undefined, following: string[], since: number) => {
  const store = getStorage(pubkey);

  store.following = [...following];
  store.followingSince = since;

  setStorage(pubkey, store);
}

export const saveRelaySettings = (pubkey: string | undefined, settings: NostrRelays) => {
  const store = getStorage(pubkey);

  store.relaySettings = { ...settings };

  setStorage(pubkey, store);
}
