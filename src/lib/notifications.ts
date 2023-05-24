import { Kind } from "../constants";
import { sendMessage } from "../sockets";
import { NostrWindow } from "../types/primal";

export const getNotifications = (
  user_pubkey: string | undefined,
  pubkey: string | undefined,
  subid: string,
  since = 0,
  limit = 1000,
) => {
  if (!pubkey) {
    return;
  }

  let payload: { pubkey: string, limit: number, since: number, user_pubkey?: string } = { pubkey, limit, since };

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_notifications", payload]},
  ]));
};

export const getOldNotifications = (
  user_pubkey: string | undefined,
  pubkey: string | undefined,
  subid: string,
  until = 0,
  limit = 20,
) => {
  if (!pubkey) {
    return;
  }

  let payload: { pubkey: string, limit: number, until: number, user_pubkey?: string } = { pubkey, limit, until };

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_notifications", payload]},
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

export const subscribeToNotificationStats = (pubkey: string, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["notification_counts", { pubkey, subid, }]},
  ]));
}

export const truncateNumber = (amount: number) => {
  const t = 1000;


  if (amount < t) {
    return `${amount}`;
  }

  if (amount < Math.pow(t, 2)) {
    return `${Math.floor(amount / t)}K`;
  }

  if (amount < Math.pow(t, 3)) {
    return `${Math.floor(amount / (t^2))}M`
  }

  if (amount < Math.pow(t, 4)) {
    return `${Math.floor(amount / (t^4))}B`
  }

  return `1T+`;
};
