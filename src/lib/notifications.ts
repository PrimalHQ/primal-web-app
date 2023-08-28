import { Kind } from "../constants";
import { sendMessage } from "../sockets";
import { signEvent } from "./nostrAPI";

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
  const event = {
    content: '{ "description": "update notifications last seen timestamp"}',
    kind: Kind.Settings,
    tags: [],
    created_at: timestamp,
  };

  try {
    const signedNote = await signEvent(event);

    sendMessage(JSON.stringify([
      "REQ",
      subid,
      {cache: ["set_notifications_seen", {
        event_from_user: signedNote,
      }]},
    ]));

    return true;
  } catch (reason) {
    console.error('Failed to set last seen: ', reason);
    return false;
  }

};

export const subscribeToNotificationStats = (pubkey: string, subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["notification_counts", { pubkey, subid, }]},
  ]));
}

export const truncateNumber = (amount: number, from?: 1 | 2 | 3 | 4) => {
  const t = 1_000;
  const s = from || 1;

  const l = Math.pow(t, s);

  if (amount < l) {
    return amount.toLocaleString();
  }

  if (amount < Math.pow(t, 2)) {
    return `${Math.floor(amount / t).toLocaleString()}K`;
  }

  if (amount < Math.pow(t, 3)) {
    return `${Math.floor(amount / Math.pow(t, 2)).toLocaleString()}M`
  }

  if (amount < Math.pow(t, 4)) {
    return `${Math.floor(amount / Math.pow(t, 3)).toLocaleString()}B`
  }

  return `1T+`;
};
