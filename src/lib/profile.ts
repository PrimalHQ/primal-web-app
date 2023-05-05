import { Event, Relay } from "nostr-tools";
import { Kind, minKnownProfiles } from "../constants";
import { sendMessage } from "../sockets";
import { NostrWindow, VanityProfiles } from "../types/primal";
import { getStorage } from "./localStore";

export const getUserProfiles = (pubkeys: string[], subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_infos", { pubkeys }]},
  ]));
}

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

export const getTrendingUsers = (subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["scored_users_24h"]},
  ]));
}


export const trimVerification = (address: string | undefined) => {
  if (address === undefined) {
    return '';
  }

  return address.split('@');
}

export const getLikes = (pubkey: string, relays: Relay[], callback: (likes: string[]) => void) => {
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
        const e = event.tags.find(t => t[0] === 'e');

        e && e[1] && likes.add(e[1]);
      })

      sub.on('eose', () => {
        const likeArray = Array.from(likes);

        callback(likeArray);

        sub.unsub();
      })
    });

  } catch (e) {
    console.log('Failed sending note: ', e);
  }
};

export const fetchKnownProfiles: (vanityName: string) => Promise<VanityProfiles> = async (vanityName: string) => {
  try {
    const name = vanityName.toLowerCase();
    const content = await fetch(`${window.location.origin}/.well-known/nostr.json?name=${name}`);

    return await content.json();
  } catch (e) {
    console.log('Failed to fetch known users: ', e);

    return { ...minKnownProfiles };
  }
};
