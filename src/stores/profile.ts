import { hexToNpub } from "../lib/keys";
import { NostrUserContent, PrimalUser } from "../types/primal";

export const truncateNpub = (npub: string) => {
  if (npub.length < 24) {
    return npub;
  }
  return `${npub.slice(0, 8)}..${npub.slice(-5)}`;
};

export const convertToUser: (user: NostrUserContent) => PrimalUser = (user: NostrUserContent) => {
  const userMeta = JSON.parse(user.content || '{}');

  return {
    id: user.id,
    pubkey: user.pubkey,
    tags: user.tags,
    npub: hexToNpub(user.pubkey),
    name: (userMeta.name || '') as string,
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

export const emptyUser = (pubkey: string) => {
  return {
    id: '',
    pubkey,
    tags: '',
    npub: hexToNpub(pubkey),
    name: '',
    about: '',
    picture: '',
    nip05: '',
    banner: '',
    displayName: '',
    location: '',
    lud06: '',
    lud16: '',
    website: '',
  };
};

export const userName = (user: PrimalUser | undefined) => {
  if (!user) {
    return '';
  }
  return truncateNpub(
    user.name ||
    user.display_name ||
    user.displayName ||
    user.npub ||
    hexToNpub(user.pubkey) || '');
};

export const authorName = (user: PrimalUser | undefined) => {
  if (!user) {
    return '';
  }
  return truncateNpub(
    user.display_name ||
    user.displayName ||
    user.name ||
    user.npub ||
    hexToNpub(user.pubkey) || '');
};
