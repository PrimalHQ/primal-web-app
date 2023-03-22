import { isConnected, sendMessage, socket } from "../sockets";
import { ExploreFeedPayload, FeedPage, NostrNoteContent, PrimalNote, PrimalUser, RepostInfo } from "../types/primal";
import { hexToNpub } from "./keys";
import DOMPurify from 'dompurify';
import { noteEncode, decode } from "nostr-tools/nip19";

export const getFeed = (pubkey: string, subid: string, until = 0, limit = 20) => {

  const start = until === 0 ? 'since' : 'until';
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", { pubkey, limit, [start]: until }]},
  ]));
}
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
