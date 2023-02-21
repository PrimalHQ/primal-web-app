import { createStore, SetStoreFunction } from "solid-js/store";
import { NostrEventContent, PrimalUser } from "../types/primal";

export type ProfileStoreData = {
  publicKey: string | undefined,
  activeUser: PrimalUser | undefined,
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

export default {
  data: profile,
  setProfile,
  setPublicKey,
  proccessUserProfile,
};
