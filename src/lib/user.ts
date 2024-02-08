import { minKnownProfiles } from "../constants";
import { PrimalUser, VanityProfiles } from "../types/primal";
import { logError } from "./logger";
import { isAccountVerified } from "./profile";

export const getUserProfileLink = async (profile: PrimalUser | string | undefined) => {
  if (!profile) return '';
  if (typeof profile === 'string') return `/p/${profile}`;

  const isVerified = await checkVerification(profile.nip05, profile.pubkey);

  if (isVerified && profile.nip05.endsWith('primal.net')) {
    const known = await fetchKnownProfiles()
  }
}

const checkVerification = async (nip05: string | undefined, pubkey: string | undefined) => {

  if (!nip05 || !pubkey) {
    return false;
  }

  const profile = await isAccountVerified(nip05);

  return profile && profile.pubkey === pubkey;
}

export const fetchKnownProfiles: () => Promise<VanityProfiles> = async () => {
  try {
    const content = await fetch(`${window.location.origin}/.well-known/nostr.json`);

    return await content.json();
  } catch (e) {
    logError('Failed to fetch known users: ', e);

    return { ...minKnownProfiles };
  }
};
