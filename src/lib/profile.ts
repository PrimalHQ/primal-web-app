// @ts-ignore Bad types in nostr-tools
import { Relay, Event, nip05, nip19 } from "nostr-tools";
import { unwrap } from "solid-js/store";
import { Kind, minKnownProfiles } from "../constants";
import { sendMessage } from "../sockets";
import { userName } from "../stores/profile";
import { Filterlist, NostrRelays, NostrWindow, PrimalUser, VanityProfiles } from "../types/primal";
import { getStorage } from "./localStore";
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


export const getProfileZapList = (pubkey: string | undefined, subid: string, until = 0, offset = 0, extended = false) => {
  if (!pubkey) {
    return;
  }

  let payload = {
    receiver: pubkey,
    limit: 20,
    offset,
  };

  if (until > 0) {
    // @ts-ignore
    payload.until = until;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_zaps_by_satszapped", payload]},
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

export const getLikes = (pubkey: string | undefined, relays: Relay[], callback: (likes: string[]) => void) => {
  if (!pubkey) {
    return;
  }

  const win = window as NostrWindow;
  const nostr = win.nostr;
  const storage = getStorage(pubkey);

  let likes = new Set<string>(storage.likes);

  if (!nostr) {
    callback(storage.likes);
    return;
  }

  // Request Reactions from all relays
  try {
    // const signedNote = await nostr.signEvent(event);

    relays.forEach(relay => {

      const sub = relay.sub([
        {
          kinds: [Kind.Reaction],
          authors: [pubkey],
        },
      ]);

      sub.on('event', (event: Event) => {
        const e = event.tags.find((t: string[]) => t[0] === 'e');

        e && e[1] && likes.add(e[1]);
      })

      sub.on('eose', () => {
        const likeArray = Array.from(likes);

        callback(likeArray);

        sub.unsub();
      })
    });

  } catch (e) {
    logError('Failed sending note: ', e);
  }
};

export const fetchKnownProfiles: (vanityName: string) => Promise<VanityProfiles> = async (vanityName: string) => {
  try {
    const name = vanityName.toLowerCase();
    const content = await fetch(`${window.location.origin}/.well-known/nostr.json?name=${name}`);

    return await content.json();
  } catch (e) {
    logError('Failed to fetch known users: ', e);

    return { ...minKnownProfiles };
  }
};

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


export const sendProfile = async (metaData: any, relays: Relay[], relaySettings?: NostrRelays) => {
  const event = {
    content: JSON.stringify(metaData),
    kind: Kind.Metadata,
    tags: [],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays, relaySettings);
};

export const reportUser = async (pubkey: string, subid: string, user?: PrimalUser) => {
  if (!pubkey) {
    return false;
  }

  const event = {
    content: `{ "description": "report user '${userName(user)}'"}`,
    kind: Kind.Settings,
    tags: [["d", "Primal-Web App"]],
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

export const sendFilterlists = async (filterLists: Filterlist[], date: number, content: string, relays: Relay[], relaySettings?: NostrRelays) => {
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

  return await sendEvent(event, relays, relaySettings);
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

export const sendAllowList = async (allowlist: string[], date: number, content: string, relays: Relay[], relaySettings?: NostrRelays) => {
  const tags = allowlist.reduce((acc, pk) => {
    return [...acc, ['p', pk]];
  }, [['d', 'allowlist']]);

  const event = {
    content,
    kind: Kind.CategorizedPeople,
    tags,
    created_at: date,
  };

  return await sendEvent(event, relays, relaySettings);
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


export const sendRelays = async (relays: Relay[], relaySettings: NostrRelays) => {
  const tags = Object.entries(relaySettings).reduce<string[][]>((acc, [url, config]) => {
    if (config.read && config.write) {
      return [ ...acc, ['r', url]];
    }

    if (!config.read && !config.write) {
      return acc;
    }

    const permission = config.read ? 'read' : 'write';

    return [ ...acc, ['r', url, permission]];
  }, []);

  const event = {
    content: '',
    kind: Kind.RelayList,
    tags: [...tags],
    created_at: Math.floor((new Date()).getTime() / 1000),
  };

  return await sendEvent(event, relays, relaySettings);
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
