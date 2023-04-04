import { Event, Relay } from "nostr-tools";
import { Kind } from "../constants";
import { sendMessage } from "../sockets";
import { NostrWindow, VanityProfiles } from "../types/primal";

export const getUserProfile = (pubkey: string, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_info", { pubkey }]},
  ]));
}

export const getUserProfileInfo = (pubkey: string, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_profile", { pubkey }]},
  ]));
}

export const getOldestProfileEvent = (pubkey: string, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["oldest_event_by_user", { pubkey }]},
  ]));
}

export const getProfileContactList = (pubkey: string, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["contact_list", { pubkey }]},
  ]));
}

export const getProfileScoredNotes = (pubkey: string, subid: string, limit = 5) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_profile_scored_content", { pubkey, limit }]},
  ]));
}

export const getTrendingUsers = (subid: string, limit = 24) => {
  const fourHAgo = Math.floor((new Date().getTime() - (4 * 60 * 60 * 1000)) / 1000);

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["scored_users", { limit, since: fourHAgo }]},
  ]));
}


export const trimVerification = (address: string | undefined) => {
  if (address === undefined) {
    return '';
  }

  const [_, domain] = address.split('@');

  return domain;
}

const getLikesStorageKey = () => {
  const key = localStorage.getItem('pubkey') || 'anon';
  return `likes_${key}`;
};

const getStoredLikes = () => {
  return JSON.parse(localStorage.getItem(getLikesStorageKey()) || '[]');
};

const setStoredLikes = (likes: Set<string>) => {
  return localStorage.setItem(getLikesStorageKey(), JSON.stringify(Array.from(likes)));
};

export const fetchLikes = (userId: string, relays: Relay[], saveLikes: (likes: Set<string>) => void) => {
  const win = window as NostrWindow;
  const nostr = win.nostr;

  let storedLikes: Set<string> = new Set(getStoredLikes());

  if (nostr === undefined) {
    saveLikes(storedLikes);
  }

  try {
    relays?.forEach(relay => {
      const sub = relay.sub([
        {
          kinds: [Kind.Reaction],
          authors: [userId],
        },
      ]);

      sub.on('event', (event: Event) => {
        const e = event.tags.find(t => t[0] === 'e');

        if (!e) {
          return;
        }

        storedLikes.add(e[1]);

        setStoredLikes(storedLikes);
        saveLikes(storedLikes);
      })
      sub.on('eose', () => {
        sub.unsub();
      })
    });

  } catch (e) {
    console.log('Failed sending note: ', e);
  }
};

export const fetchKnownProfiles: () => Promise<VanityProfiles> = async () => {
  try {
    const content = await fetch(`${window.location.origin}/.well-known/nostr.json`);

    return await content.json();
  } catch (e) {
    console.log('Failed to fetch known users: ', e);

    return {
      "names": {
        "miljan": "d61f3bc5b3eb4400efdae6169a5c17cabf3246b514361de939ce4a1a0da6ef4a",
        "marko": "123afae7d187ba36d6ddcd97dbf4acc59aeffe243f782592ff8f25ed579df306",
        "essguess": "0b13870379cf18ae6b6d516d9f0833e0273c7a6758652a698e11f04c9c1a0d29",
        "pr": "dd9b989dfe5e0840a92538f3e9f84f674e5f17ab05932efbacb4d8e6c905f302",
        "marija": "b8a518a60fab9f3969b62238860f4643003b6437b75d60860dd8de34fb21c931",
        "moysie": "2a55ed52ed31f85f8bdef3bdd165aa74265d82c952193d7b76fb4c76cccc4231",
        "nikola": "97b988fbf4f8880493f925711e1bd806617b508fd3d28312288507e42f8a3368",
        "princfilip": "29c07b40860f06df7c1ada6af2cc6b4c541b76a720542d7ee645c20c9452ffd2",
        "highlights": "9a500dccc084a138330a1d1b2be0d5e86394624325d25084d3eca164e7ea698a",
        "primal": "532d830dffe09c13e75e8b145c825718fc12b0003f61d61e9077721c7fff93cb",
        "andi": "5fd8c6a375c431729a3b78e2080ffff0a1dc63f52e2a868a801151190a31f955",
        "rockstar": "91c9a5e1a9744114c6fe2d61ae4de82629eaaa0fb52f48288093c7e7e036f832",
        "qa": "88cc134b1a65f54ef48acc1df3665063d3ea45f04eab8af4646e561c5ae99079"
      }
    };
  }
};
