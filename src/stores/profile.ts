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

const metaString = (value: unknown) => typeof value === 'string' ? value : '';

// Kind 0 content is arbitrary JSON from the profile owner. It may be `null`, an
// array, or have non-string fields (e.g. `{"display_name": {"nodeType": 1}}`,
// which Solid would try to insert as a DOM node). Only keep string fields.
export const parseUserMetadata = (content: string | undefined) => {
  let meta: any = {};

  try {
    meta = JSON.parse(content || '{}');
  } catch (e) {
    logError('Error in user meta JSON: ', e);
  }

  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    meta = {};
  }

  return {
    name: metaString(meta.name),
    about: metaString(meta.about),
    picture: metaString(meta.picture),
    nip05: metaString(meta.nip05),
    banner: metaString(meta.banner),
    display_name: metaString(meta.display_name),
    location: metaString(meta.location),
    lud06: metaString(meta.lud06),
    lud16: metaString(meta.lud16),
    website: metaString(meta.website),
  };
};

export const convertToUser = (user: NostrUserContent, pubkey: string, stats?: Record<string, UserStats>) => {
  if (!user) return emptyUser(pubkey);

  const userMeta = parseUserMetadata(user.content);

  return {
    id: user.id,
    pubkey: user.pubkey,
    tags: user.tags,
    npub: hexToNpub(user.pubkey),
    name: userMeta.name,
    about: userMeta.about,
    picture: userMeta.picture,
    nip05: userMeta.nip05,
    banner: userMeta.banner,
    displayName: userMeta.display_name,
    location: userMeta.location,
    lud06: userMeta.lud06,
    lud16: userMeta.lud16,
    website: userMeta.website,
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
