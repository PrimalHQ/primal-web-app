import { sendMessage } from "../sockets";
import { ExploreFeedPayload } from "../types/primal";
import { nip19 } from "nostr-tools";
import { day, hour } from "../constants";

export const getFutureFeed = (user_pubkey: string | undefined, pubkey: string |  undefined, subid: string, since: number) => {
  if (!pubkey) {
    return;
  }

  let payload: { since: number, pubkey: string, user_pubkey?: string, limit: number } =
    { since, pubkey, limit: 1000 };

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", payload]},
  ]));
};

export const getFeed = (user_pubkey: string | undefined, pubkey: string |  undefined, subid: string, until = 0, limit = 20) => {
  if (!pubkey) {
    return;
  }
  const start = until === 0 ? 'since' : 'until';

  let payload = { limit, [start]: until, pubkey };

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", payload]},
  ]));
}

export const getEvents = (user_pubkey: string | undefined, eventIds: string[], subid: string, extendResponse?: boolean) => {

  let payload:  {event_ids: string[], user_pubkey?: string, extended_response?: boolean } =
    { event_ids: eventIds } ;

  if (user_pubkey) {
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

export const getUserFeed = (user_pubkey: string | undefined, pubkey: string | undefined, subid: string, until = 0, limit = 20) => {
  if (!pubkey) {
    return;
  }

  const start = until === 0 ? 'since' : 'until';

  let payload = { pubkey, limit, notes: 'authored', [start]: until } ;

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", payload]},
  ]));
}

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

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["thread_view", payload]},
  ]));
}

export const getFutureExploreFeed = (
  user_pubkey: string | undefined,
  subid: string,
  scope: string,
  timeframe: string,
  since: number,
  ) => {

  let payload: { timeframe: string, scope: string, since: number, user_pubkey?: string, created_after?: number, limit: number } =
    { timeframe, scope, since, limit: 1000, };

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  if (since > 0) {
    payload.since = since;
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

export const getExploreFeed = (
  pubkey: string | undefined,
  subid: string,
  scope: string,
  timeframe: string,
  until = 0,
  limit = 20,
) => {

  let payload: ExploreFeedPayload = { timeframe, scope, limit };

  if (pubkey) {
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
