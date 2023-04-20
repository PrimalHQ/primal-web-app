import { Kind } from "../constants";
import { sendMessage } from "../sockets";
import { NostrWindow } from "../types/primal";

export const getNotifications = (
  pubkey: string | undefined,
  subid: string,
  since = 0,
  limit = 1000,
) => {
  if (!pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_notifications", { pubkey, /*limit,*/ since }]},
  ]));
};

export const getLastSeen = (pubkey: string | undefined, subid: string) => {
  if (!pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_notifications_seen", { pubkey }]},
  ]));

};

export const setLastSeen = async (
  subid: string,
  timestamp: number,
) => {
  const win = window as NostrWindow;
  const nostr = win.nostr;

  if (nostr === undefined) {
    return false;
  }

  const event = {
    content: '{ "description": "update notifications last seen timestamp"}',
    kind: Kind.Settings,
    tags: [],
    created_at: timestamp,
  };

  const signedNote = await nostr.signEvent(event);

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["set_notifications_seen", {
      event_from_user: signedNote,
    }]},
  ]));

};
