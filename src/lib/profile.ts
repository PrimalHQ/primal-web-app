import { nip05, nip19 } from "../lib/nTools";
import { Kind, minKnownProfiles, settingsApp, settingsDescription } from "../constants";
import { sendMessage } from "../sockets";
import { userName } from "../stores/profile";
import { Filterlist, NostrRelays, PrimalUser, VanityProfiles } from "../types/primal";
import { logError } from "./logger";
import { signEvent } from "./nostrAPI";
import { sendEvent } from "./notes";

export const getUserProfiles = (pubkeys: string[], subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_infos", { pubkeys }]},
  ]));
}

export const getUsersRelayInfo = (pubkeys: string[], subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_user_relays_2", { pubkeys }]},
  ]));
}

export const getUserProfileInfo = (pubkey: string | undefined, user_pubkey: string | undefined, subid: string) => {
  if (!pubkey) {
    return;
  }

  let payload: any = {
    pubkey,
  };

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_profile", payload]},
  ]));
}

export const isUserFollowing = (pubkey: string | undefined, user_pubkey: string | undefined, subid: string) => {
  if (!pubkey || !user_pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["is_user_following", { pubkey, user_pubkey }]},
  ]));
};

export const getProfileContactList = (pubkey: string | undefined, subid: string, extended = false) => {
  if (!pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["contact_list", { pubkey, extended_response: extended }]},
  ]));
}

export const getProfileFollowerList = (pubkey: string | undefined, subid: string, extended = false) => {
  if (!pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_followers", { pubkey }]},
  ]));
}


export const getProfileZapList = (pubkey: string | undefined, subid: string, until = 0, offset = 0, limit = 20, extended = false) => {
  if (!pubkey) {
    return;
  }

  let payload = {
    sender: pubkey,
    limit,
    offset,
  };

  if (until > 0) {
    // @ts-ignore
    payload.until = until;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_zaps_sent", payload]},
  ]));
}

export const getProfileMuteList = (pubkey: string | undefined, subid: string, extended?: boolean) => {
  if (!pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["mutelist", { pubkey, extended_response: extended }]},
  ]));
}

export const getCategorizedList = (pubkey: string | undefined, category: string, subid: string, extended?: boolean) => {
  if (!pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["parameterized_replaceable_list", { pubkey, identifier: category, extended_response: extended }]},
  ]));
}

export const getProfileScoredNotes = (pubkey: string | undefined, user_pubkey: string | undefined, subid: string, limit = 5) => {
  if (!pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_profile_scored_content", { pubkey, limit, user_pubkey }]},
  ]));
}

export const getCommonFollowers = (pubkey: string | undefined, user_pubkey: string | undefined, subId: string, limit = 5) => {
  if (!pubkey || !user_pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subId,
    {cache: ["user_profile_followed_by", { pubkey, limit, user_pubkey }]},
  ]));
}



export const getTrendingUsers = (subid: string, user_pubkey: string | undefined) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["scored_users_24h", { user_pubkey }]},
  ]));
}


export const trimVerification = (address: string | undefined) => {
  if (address === undefined) {
    return '';
  }

  return address.split('@');
}

export const fetchKnownProfiles: (vanityName: string) => Promise<VanityProfiles> = async (vanityName: string) => {
  try {
    const name = vanityName.toLowerCase();
    const origin = window.location.origin.startsWith('http://localhost') ? 'https://dev.primal.net' : window.location.origin;

    const content = await fetch(`${origin}/.well-known/nostr.json?name=${name}`);

    return await content.json();
  } catch (e) {
    logError('Failed to fetch known users: ', vanityName, e);

    return { ...minKnownProfiles };
  }
};

export const isVerifiedByPrimal = async (user: PrimalUser | undefined) => {
  const nip05 = user?.nip05;

  const isVerified = await checkVerification(user);

  return isVerified && nip05 && nip05.endsWith && nip05.endsWith('primal.net');
}

export const checkVerification: (user: PrimalUser | undefined) => Promise<boolean> = async (user: PrimalUser | undefined) => {
  const nip05 = user?.nip05;

  if (!user || !nip05) {
    return false;
  }

  const profile = await isAccountVerified(nip05);

  return profile ? profile.pubkey === user?.pubkey : false;
}

export const isAccountVerified: (domain: string | undefined) => Promise<nip19.ProfilePointer | null> = async (domain: string | undefined) => {
  if (!domain) return null;

  try {
    const profile = await nip05.queryProfile(domain);

    return profile || null;
  } catch (e) {
    logError('Failed to nip05 verify user: ', e);

    return null;
  }
};


export const sendProfile = async (metaData: any) => {
  const event = {
    content: JSON.stringify(metaData),
    kind: Kind.Metadata,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event);
};

export const reportUser = async (pubkey: string | undefined, subid: string, user?: PrimalUser) => {
  if (!pubkey) {
    return false;
  }

  const event = {
    content: `{ "description": "report user '${userName(user)}'"}`,
    kind: Kind.Settings,
    tags: [["d", settingsApp, settingsDescription.reportUser]],
    created_at: Math.ceil((new Date()).getTime() / 1000),
  };

  try {
    const signedEvent = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["report_user", { pubkey, event_from_user: signedEvent }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to report user: ', reason);
    return false;
  }
};

export const getFilterlists = (pubkey: string | undefined, subid: string, extended?: boolean) => {
  if (!pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["mutelists", { pubkey, extended_response: extended }]},
  ]));
};

export const sendFilterlists = async (filterLists: Filterlist[], date: number, content: string) => {
  const tags = filterLists.reduce((acc, fl) => {
    let s = [];
    if (fl.content) s.push('content');
    if (fl.trending) s.push('trending');

    if (fl.pubkey) {
      return [...acc, ['p', fl.pubkey, fl.relay || '', fl.petname || '', JSON.stringify(s)]];
    }

    return acc;
  }, [['d', 'mutelists']]);


  const event = {
    content,
    kind: Kind.CategorizedPeople,
    tags,
    created_at: date,
  };

  return await sendEvent(event);
};

export const getAllowlist = (pubkey: string | undefined, subid: string, extended?: boolean) => {
  if (!pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["allowlist", { pubkey, extended_response: extended }]},
  ]));
};

export const sendAllowList = async (allowlist: string[], date: number, content: string) => {
  const tags = allowlist.reduce((acc, pk) => {
    return [...acc, ['p', pk]];
  }, [['d', 'allowlist']]);

  const event = {
    content,
    kind: Kind.CategorizedPeople,
    tags,
    created_at: date,
  };

  return await sendEvent(event);
};

export const getSuggestions = async (subid: string) => {

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_suggested_users"]},
  ]));
};


export const getRelays = async (pubkey: string | undefined, subid: string) => {
  if (!pubkey) return;

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_user_relays", { pubkey }]},
  ]));
};


export const sendRelays = async (relaySettings: NostrRelays) => {
  const tags = Object.entries(relaySettings).reduce<string[][]>((acc, [url, config]) => {
    if (config.read && config.write) {
      return [ ...acc, ['r', url]];
    }

    if (!config.read && !config.write) {
      return acc;
    }

    const permission: string = config.read ? 'read' : 'write';

    return [ ...acc, ['r', url, permission]];
  }, []);

  const event = {
    content: '',
    kind: Kind.RelayList,
    tags: [...tags],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  const result = await sendEvent(event);

  return result;
};

export const sendBookmarks = async (tags: string[][], date: number, content: string) => {
  const event = {
    content,
    kind: Kind.Bookmarks,
    tags: [...tags],
    created_at: date,
  };

  return await sendEvent(event);
};

export const getBookmarks = async (pubkey: string | undefined, subid: string) => {
  if (!pubkey) return;

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_bookmarks", { pubkey }]},
  ]));
};

export const extractRelayConfigFromTags = (tags: string[][]) => {
  return tags.reduce((acc, tag) => {
    if (tag[0] !== 'r') return acc;

    let config = { write: true, read: true };

    if (tag[2] === 'write') {
      config.read = false;
    }

    if (tag[2] === 'read') {
      config.write = false;
    }

    return { ...acc, [tag[1]]: config };

  }, {});
};


export const getExplorePeople = async (subid: string, user_pubkey: string | undefined, until: number, limit: number, since: number, offset: number) => {

  let payload:any = { limit: limit || 10, offset: offset || 0 };

  if (until > 0) {
    // @ts-ignore
    payload.until = until;
  }

  if (since > 0) {
    // @ts-ignore
    payload.since = since
  }

  if (user_pubkey) {
    // @ts-ignore
    payload.user_pubkey = user_pubkey
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["explore_people", { ...payload }]},
  ]));
};


export const getExploreZaps = async (subid: string, user_pubkey: string | undefined, until: number, limit: number, since: number, offset: number) => {

  let payload:any = { limit: limit || 20, offset: offset || 0 };

  if (until > 0) {
    // @ts-ignore
    payload.until = until;
  }

  if (since > 0) {
    // @ts-ignore
    payload.since = since
  }

  // if (user_pubkey) {
  //   // @ts-ignore
  //   payload.user_pubkey = user_pubkey
  // }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["explore_zaps", { ...payload }]},
  ]));
};


export const getExploreMedia = async (subid: string, user_pubkey: string | undefined, until: number, limit: number, since: number, offset: number) => {

  let payload:any = { limit: limit || 20, offset: offset || 0 };

  if (until > 0) {
    // @ts-ignore
    payload.until = until;
  }

  if (since > 0) {
    // @ts-ignore
    payload.since = since
  }

  if (user_pubkey) {
    // @ts-ignore
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["explore_media", { ...payload }]},
  ]));
};


export const getExploreTopics = async (subid: string, user_pubkey: string | undefined) => {

  let payload = {};

  if (user_pubkey) {
    // @ts-ignore
    payload.user_pubkey = user_pubkey
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["explore_topics"]},
  ]));
};
