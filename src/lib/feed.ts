import { sendMessage } from "../sockets";
import { ExploreFeedPayload } from "../types/primal";
import { decode } from "nostr-tools/nip19";

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
  const yesterday = Math.floor((new Date().getTime() - (24 * 60 * 60 * 1000)) / 1000);

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
    {cache: ["thread_view", { event_id: decode(postId).data, limit: 100 }]},
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

  if (pubkey.length > 0) {
    payload.pubkey = pubkey;
  }


  if (timeframe === 'trending') {
    const yesterday = Math.floor((new Date().getTime() - (24 * 60 * 60 * 1000)) / 1000);

    payload.since = yesterday;
  }
  if (timeframe === 'mostzapped4h') {
    const fourHAgo = Math.floor((new Date().getTime() - (4 * 60 * 60 * 1000)) / 1000);

    payload.timeframe = 'mostzapped';
    payload.since = fourHAgo;
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
