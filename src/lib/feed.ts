import { sendMessage } from "../sockets";
import { ExploreFeedPayload } from "../types/primal";
import { nip19 } from "nostr-tools";
import { day, hour, noKey } from "../constants";

export const getFeed = (pubkey: string, subid: string, until = 0, limit = 20) => {

  const start = until === 0 ? 'since' : 'until';
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", { pubkey, limit, [start]: until }]},
  ]));
}

export const getEvents = (eventIds: string[], subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["events", { event_ids: eventIds }]},
  ]));

};

export const getUserFeed = (pubkey: string, subid: string, until = 0, limit = 20) => {

  const start = until === 0 ? 'since' : 'until';
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", { pubkey, limit, notes: 'authored', [start]: until }]},
  ]));
}

export const getTrending = (subid: string, limit = 25) => {
  const yesterday = Math.floor((new Date().getTime() - day) / 1000);

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {"cache":["explore", { timeframe: "trending", scope: "global", limit, since: yesterday }]},
  ]));
};

export const getThread = (postId: string, subid: string, until = 0, limit = 20) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["thread_view", {
      event_id: nip19.decode(postId).data,
      limit: 100
    }]},
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
    payload.pubkey = pubkey;
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
