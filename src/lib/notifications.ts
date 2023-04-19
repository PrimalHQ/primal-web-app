import { sendMessage } from "../sockets";

export const getNotifications = (
  pubkey: string | undefined,
  subid: string,
  since = 0,
  limit = 20,
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

export const setLastSeen = (
  pubkey: string | undefined,
  subid: string,
  timestamp: number,
) => {
  if (!pubkey) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_notifications_seen", { pubkey, seen_until: timestamp }]},
  ]));

};
