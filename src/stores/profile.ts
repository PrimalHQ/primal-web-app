import { createStore, SetStoreFunction } from "solid-js/store";
import { noKey } from "../constants";
import { NostrEventContent, PrimalUser } from "../types/primal";

export const truncateNpub = (npub: string) => {
  return npub ? `${npub.slice(0, 8)}..${npub.slice(-5)}` : '';
};

export type ProfileStoreData = {
  publicKey: string | undefined,
  activeUser: PrimalUser | undefined,
  userStats?: {
    follows_count: number,
    followers_count: number,
    note_count: number,
  },
}

const initialStore: ProfileStoreData = {
  publicKey: undefined,
  activeUser: undefined,
}

export const [profile, setProfile] = createStore<ProfileStoreData>(initialStore);

export const setPublicKey = (key: string | undefined) => {
  setProfile('publicKey', () => key);
};

export const proccessUserProfile = (content: NostrEventContent) => {
  const user = JSON.parse(content.content);

  setProfile('activeUser', () => ({ ...user }));
}

export type ProfileStore = {
  data: ProfileStoreData,
  setProfile: SetStoreFunction<ProfileStoreData>,
  setPublicKey: (key: string | undefined) => void,
  proccessUserProfile: (content: NostrEventContent) => void,
};

export const hasPublicKey = () => {
  return profile.publicKey && profile.publicKey !== noKey;
}

export default {
  data: profile,
  setProfile,
  setPublicKey,
  proccessUserProfile,
};
