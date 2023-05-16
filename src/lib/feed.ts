import { sendMessage } from "../sockets";
import { ExploreFeedPayload } from "../types/primal";
import { nip19 } from "nostr-tools";
import { day, hour, noKey } from "../constants";

export const getFeed = (user_pubkey: string | undefined, subid: string, until = 0, limit = 20) => {
  if (!user_pubkey || user_pubkey === noKey) {
    return;
  }

  const start = until === 0 ? 'since' : 'until';
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", { limit, [start]: until, user_pubkey }]},
  ]));
}

export const getEvents = (user_pubkey: string | undefined, eventIds: string[], subid: string, extendResponse?: boolean) => {

  let payload:  {event_ids: string[], user_pubkey?: string, extended_response?: boolean } =
    { event_ids: eventIds } ;

  if (user_pubkey && user_pubkey !== noKey) {
    payload.user_pubkey = user_pubkey;
  }

  if (extendResponse) {
    payload.extended_response = extendResponse;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["events", payload]},
  ]));

};

export const getUserFeed = (user_pubkey: string, subid: string, until = 0, limit = 20) => {

  const start = until === 0 ? 'since' : 'until';

  let payload:  { user_pubkey?: string, limit: number, notes: string, since?: number, until?: number } =
    { user_pubkey, limit, notes: 'authored', [start]: until } ;

  if (user_pubkey && user_pubkey !== noKey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", payload]},
  ]));
}

// export const getTrending = (user_pubkey: string, subid: string, limit = 25) => {
//   const yesterday = Math.floor((new Date().getTime() - day) / 1000);

//   sendMessage(JSON.stringify([
//     "REQ",
//     subid,
//     {"cache":["explore", {
//       user_pubkey,
//       timeframe: "trending",
//       scope: "global",
//       limit,
//       since: yesterday
//     }]},
//   ]));
// };

export const getThread = (user_pubkey: string | undefined, postId: string, subid: string, until = 0, limit = 20) => {

  const decoded = nip19.decode(postId).data;
  let event_id = '';


  if (typeof decoded === 'string') {
    event_id = decoded;
  }

  if (typeof decoded !== 'string' && 'id' in decoded) {
    event_id = decoded.id;
  }

  if (event_id.length === 0) {
    return;
  }

  let payload:  { user_pubkey?: string, limit: number, event_id: string, until?: number } =
    { event_id, limit: 100 } ;

  if (user_pubkey && user_pubkey !== noKey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["thread_view", payload]},
  ]));
}

export const getExploreFeed = (
  pubkey: string,
  subid: string,
  scope: string,
  timeframe: string,
  until = 0,
  limit = 20,
) => {

  let payload: ExploreFeedPayload = { timeframe, scope, limit };

  if (pubkey.length > 0 && pubkey !== noKey) {
    payload.user_pubkey = pubkey;
  }

  if (until > 0) {
    payload.until = until;
  }

  if (timeframe === 'trending') {
    const yesterday = Math.floor((new Date().getTime() - day) / 1000);

    payload.created_after = yesterday;
  }

  if (timeframe === 'mostzapped4h') {
    const fourHAgo = Math.floor((new Date().getTime() - (4 * hour)) / 1000);

    payload.timeframe = 'mostzapped';
    payload.created_after = fourHAgo;
  }


  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: [
      "explore",
      payload,
    ]},
  ]));
};

export const getTrending24h = (
  subid: string,
) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: [
      "explore_global_trending_24h",
    ]},
  ]));
};

export const getMostZapped4h = (
  subid: string,
) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: [
      "explore_global_mostzapped_4h",
    ]},
  ]));
};
