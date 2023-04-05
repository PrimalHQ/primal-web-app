import { noKey } from "../constants"

export type LocalStore = {
  following: string[],
  followingSince: number,
};

export const storageName = (pubkey?: string) => {
  if (!pubkey || pubkey === noKey) {
    return 'anon';
  }

  return `store_${pubkey}`;
};

export const getStorage = (pubkey?: string) => {
  const name = storageName(pubkey);

  return JSON.parse(localStorage.getItem(name) || '{}') as LocalStore;
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
