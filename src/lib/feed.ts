import { sendMessage } from "../sockets";
import { ExploreFeedPayload } from "../types/primal";
import { nip19 } from "nostr-tools";
import { day, hour } from "../constants";

export const getFutureFeed = (user_pubkey: string | undefined, pubkey: string |  undefined, subid: string, since: number) => {
  if (!pubkey) {
    return;
  }

  let payload: { since: number, pubkey: string, user_pubkey?: string, limit: number } =
    { since, pubkey, limit: 100 };

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", payload]},
  ]));
};

export const getFeed = (user_pubkey: string | undefined, pubkey: string |  undefined, subid: string, until = 0, limit = 20, include_replies?: boolean) => {
  if (!pubkey) {
    return;
  }

  const time = until === 0 ? Math.ceil((new Date()).getTime()/1_000 ): until;

  let payload = { limit, until: time, pubkey };

  if (user_pubkey) {
    // @ts-ignore dynamic property
    payload.user_pubkey = user_pubkey;
  }
  if (include_replies) {
    // @ts-ignore dynamic property
    payload.include_replies = include_replies;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", payload]},
  ]));
}

export const getArticlesFeed = (user_pubkey: string | undefined, pubkey: string |  undefined, subid: string, until = 0, limit = 20, topic?: string) => {
  // if (!pubkey) {
  //   return;
  // }

  const start = until === 0 ? 'since' : 'until';

  let payload = { limit, [start]: until };

  if (pubkey && pubkey?.length > 0) {
    // @ts-ignore
    payload.pubkey = pubkey;
  }

  if (user_pubkey) {
    // @ts-ignore
    payload.user_pubkey = user_pubkey;
  }

  if (topic) {
    // @ts-ignore
    payload.topic = topic;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["long_form_content_feed", payload]},
  ]));
}

export const getFutureArticlesFeed = (user_pubkey: string | undefined, pubkey: string |  undefined, subid: string, since: number) => {
  if (!pubkey) {
    return;
  }

  let payload: { since: number, pubkey: string, user_pubkey?: string, limit: number } =
    { since, pubkey, limit: 100 };

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["long_form_content_feed", payload]},
  ]));
};

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

export const getUserFeed = (user_pubkey: string | undefined, pubkey: string | undefined, subid: string, notes: 'authored' | 'replies' | 'bookmarks' | 'user_media_thumbnails', until = 0, limit = 20, offset = 0) => {
  if (!pubkey) {
    return;
  }

  let payload: {
    pubkey: string,
    limit: number,
    notes: 'authored' | 'replies' | 'bookmarks' | 'user_media_thumbnails',
    user_pubkey?: string,
    until?: number,
    offset?: number,
  } = { pubkey, limit, notes } ;

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  if (until > 0) payload.until = until;

  if (offset > 0) payload.offset = offset;

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", payload]},
  ]));
}
export const getUserArticleFeed = (user_pubkey: string | undefined, pubkey: string | undefined, subid: string, notes: 'authored' | 'replies' | 'bookmarks', until = 0, limit = 20, offset = 0) => {
  if (!pubkey) {
    return;
  }

  let payload: {
    pubkey: string,
    limit: number,
    notes: 'authored' | 'replies' | 'bookmarks',
    user_pubkey?: string,
    until?: number,
    offset?: number,
  } = { pubkey, limit, notes } ;

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  if (until > 0) payload.until = until;

  if (offset > 0) payload.offset = offset;

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["long_form_content_feed", payload]},
  ]));
}

export const getFutureUserFeed = (
  user_pubkey: string | undefined,
  pubkey: string | undefined,
  subid: string,
  since: number,
  ) => {
  if (!pubkey) {
    return;
  }

  let payload: { pubkey: string, since: number, notes: string, user_pubkey?: string, created_after?: number, limit: number } =
    { pubkey, since, notes: 'authored', limit: 100, };

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["feed", payload]},
  ]));
};

export const getThread = (user_pubkey: string | undefined, postId: string, subid: string, until = 0, limit = 100) => {

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
    { event_id, limit } ;

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["thread_view", payload]},
  ]));
}

export const getArticleThread = (user_pubkey: string | undefined, pubkey: string, identifier: string, kind: number, subid: string, until = 0, limit = 100) => {


  let payload:  { user_pubkey?: string, limit: number, pubkey: string, kind: number, identifier: string, until?: number } =
    { pubkey, identifier, kind , limit } ;

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["long_form_content_thread_view", payload]},
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
    { timeframe, scope, since, limit: 100, };

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
  user_pubkey: string | undefined,
  subid: string,
) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: [
      "explore_global_trending_24h",
      { user_pubkey },
    ]},
  ]));
};

export const getMostZapped4h = (
  user_pubkey: string | undefined,
  subid: string,
) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: [
      "explore_global_mostzapped_4h",
      { user_pubkey },
    ]},
  ]));
};

export const getReadsTopics = (
  subid: string,
) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_reads_topics"]},
  ]));
};


export const getFeaturedAuthors = (
  subid: string,
) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_featured_authors"]},
  ]));
};

export const getAuthorSubscriptionTiers = (
  pubkey: string | undefined,
  subid: string,
) => {
  if (!pubkey) return;

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["creator_paid_tiers", { pubkey }]},
  ]));
};
