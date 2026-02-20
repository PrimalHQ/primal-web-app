import { Kind } from "../constants";
import { hexToNpub } from "../lib/keys";
import { logError } from "../lib/logger";
import { NostrUserContent, PrimalUser, UserStats } from "../types/primal";

export const truncateNpub = (npub: string) => {
  if (npub.length < 26) {
    return npub;
  }

  return `${npub.slice(0, 15)}..${npub.slice(-10)}`;
};

export const truncateName = (name: string, limit = 20) => {
  if (name.length < limit) {
    return name;
  }
  return `${name.slice(0, limit)}...`;
};

export const convertToUser = (user: NostrUserContent, pubkey: string, stats?: Record<string, UserStats>) => {
  if (!user) return emptyUser(pubkey);

  let userMeta: any = {};

  try {
    userMeta = JSON.parse(user.content || '{}');
  } catch (e) {
    logError('Error in user meta JSON: ', e);
    userMeta = {};
  }

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
    msg: { ...user },
    userStats: stats ? { ...stats[user.pubkey] } : undefined,
  } as PrimalUser;
}

export const emptyUser = (pubkey: string) => {
  return {
    id: '',
    pubkey,
    tags: [],
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
    msg: {
      kind: Kind.Metadata,
      content: '',
      id: '',
      pubkey,
      sig: '',
      tags: [],
    }
  } as PrimalUser;
};

export const userName = (user: PrimalUser | undefined, pubkey?: string) => {
  if (!user) {
    return pubkey ? hexToNpub(pubkey) : '';
  }

  const npub = user.npub || hexToNpub(user.pubkey) || '';

  const name = user.display_name ||
    user.displayName ||
    user.name ||
    truncateNpub(npub);

  return name ?
    name :
    truncateNpub(hexToNpub(user.pubkey) || '');
};

export const authorName = (user: PrimalUser | undefined) => {
  if (!user) {
    return '';
  }
  const npub = user.npub || hexToNpub(user.pubkey) || '';

  const name = user.display_name ||
    user.displayName ||
    user.name ||
    truncateNpub(npub);

  return name ?
    name :
    truncateNpub(hexToNpub(user.pubkey) || '');
};

export const nip05Verification = (user: PrimalUser | undefined) => {
  if (!user || typeof user.nip05 !== 'string') {
    return '';
  }

  if (user.nip05?.startsWith('_@')) {
    return user.nip05.slice(2);
  }

  return user.nip05;
};
