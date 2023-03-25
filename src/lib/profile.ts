import { Event, Relay } from "nostr-tools";
import { Kind } from "../constants";
import { sendMessage } from "../sockets";
import { NostrWindow } from "../types/primal";

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
