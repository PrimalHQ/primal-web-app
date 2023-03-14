import { isConnected, sendMessage, socket } from "../sockets";
import { FeedPage, PrimalNote } from "../types/primal";
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

export const convertToPosts = (page: FeedPage | undefined, reverse = false) => {

  if (page === undefined) {
    return [];
  }

  return  page.messages.map((msg) => {
    const user = page?.users[msg.pubkey];
    const stat = page?.postStats[msg.id];

    const userMeta = JSON.parse(user?.content || '{}');

    return {
      user: {
        id: user?.id || '',
        pubkey: user?.pubkey || msg.pubkey,
        npub: hexToNpub(user?.pubkey || msg.pubkey),
        name: userMeta.name || user?.pubkey,
        about: userMeta.about,
        picture: userMeta.picture,
        nip05: userMeta.nip05,
        banner: userMeta.banner,
        displayName: userMeta.display_name,
        location: userMeta.location,
        lud06: userMeta.lud06,
        lud16: userMeta.lud16,
        website: userMeta.website,
        tags: user?.tags || [],
      },
      post: {
        id: msg.id,
        pubkey: msg.pubkey,
        created_at: msg.created_at,
        tags: msg.tags,
        content: DOMPurify.sanitize(msg.content),
        sig: msg.sig,
        likes: stat.likes,
        mentions: stat.mentions,
        reposts: stat.reposts,
        replies: stat.replies,
        zaps: stat.zaps,
        score: stat.score,
        score24h: stat.score24h,
        satszapped: stat.satszapped,
        noteId: noteEncode(msg.id),
      },
      msg,
    };
  });
}

export const sortByRecency = (posts: PrimalNote[], reverse = false) => {
  return posts.sort((a: PrimalNote, b: PrimalNote) => {
    const order = b.post.created_at - a.post.created_at;

    return reverse ? -1 * order : order;
  });
};

export const sortByScore24h = (posts: PrimalNote[], reverse = false) => {
  return posts.sort((a: PrimalNote, b: PrimalNote) => {
    const order = b.post.score24h - a.post.score24h;

    return reverse ? -1 * order : order;
  });
};

export const sortByScore = (posts: PrimalNote[], reverse = false) => {
  return posts.sort((a: PrimalNote, b: PrimalNote) => {
    const order = b.post.score - a.post.score;

    return reverse ? -1 * order : order;
  });
};

export const sortByZapped = (posts: PrimalNote[], reverse = false) => {
  return posts.sort((a: PrimalNote, b: PrimalNote) => {
    const order = b.post.satszapped - a.post.satszapped;

    return reverse ? -1 * order : order;
  });
};

export const getExploreFeed = (
  pubkey: string,
  subid: string,
  scope: string,
  timeframe: string,
  until = 0,
  limit = 20,
) => {

  let payload = { timeframe, scope, limit };

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
