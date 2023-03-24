import { createStore, SetStoreFunction } from "solid-js/store";
import { noKey } from "../constants";
import { hexToNpub } from "../lib/keys";
import { FeedPage, NostrEventContent, NostrUserContent, PrimalUser } from "../types/primal";

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

export const convertToUser: (user: NostrUserContent) => PrimalUser = (user: NostrUserContent) => {
  const userMeta = JSON.parse(user.content || '{}');

  return {
    id: user.id,
    pubkey: user.pubkey,
    tags: user.tags,
    npub: hexToNpub(user.pubkey),
    name: (userMeta.name || user.pubkey || '') as string,
    about: (userMeta.about || '') as string,
    picture: (userMeta.picture || '') as string,
    nip05: (userMeta.nip05 || '') as string,
    banner: (userMeta.banner || '') as string,
    displayName: (userMeta.display_name || '') as string,
    location: (userMeta.location || '') as string,
    lud06: (userMeta.lud06 || '') as string,
    lud16: (userMeta.lud16 || '') as string,
    website: (userMeta.website || '') as string,
  };
}

export default {
  data: profile,
  setProfile,
  setPublicKey,
  proccessUserProfile,
};
