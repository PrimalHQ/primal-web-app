import { minKnownProfiles } from "../constants";
import { sendMessage } from "../sockets";
import { sanitize } from "./notes";

type SearchPayload = { query: string, limit: number, pubkey?: string, since?: number, until?: number, user_pubkey?: string };

export const cleanQuery = (query: string) => {
  return sanitize(query);
}


export const searchUsers = (pubkey: string | undefined, subid: string, query: string, limit = 10) => {

  let payload: SearchPayload = { query: cleanQuery(query), limit };

  if (pubkey) {
    payload.pubkey = pubkey;
  }


  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_search", payload]},
  ]));
}

export const searchContent = (user_pubkey: string | undefined, subid: string, query: string, limit = 100) => {

  let payload: SearchPayload = { query: cleanQuery(query), limit };

  if (user_pubkey) {
    payload.user_pubkey = user_pubkey;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["search", payload]},
  ]));
}

export const advancedSearchContent = (user_pubkey: string | undefined, subid: string, query: string, limit = 20, until = 0, offset = 0) => {
  let payload = { specification: ["advanced_search", {query: cleanQuery(query)}], limit };

  if (user_pubkey) {
    // @ts-ignore
    payload.user_pubkey = user_pubkey;
  }

  if (until > 0) {
    // @ts-ignore
    payload.until = until;
  }

  if (offset > 0) {
    // @ts-ignore
    payload.offset = offset;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["advanced_feed", payload]},
  ]));
}

export const searchFutureContent = (subid: string, query: string, since:number, limit = 100) => {

  let payload: SearchPayload = { query: cleanQuery(query), limit, since };

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["search", payload]},
  ]));
}

export const searchFilteredUsers = (pubkey: string | undefined, user_pubkey: string | undefined, subid: string) => {
  if (!pubkey || !user_pubkey) {
    return;
  }


  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["search_filterlist", { pubkey, user_pubkey }]},
  ]));
};

export const getScoredUsers = (user_pubkey: string | undefined, selector: string, limit: number, subid: string) => {
  if (!user_pubkey) {
    user_pubkey = minKnownProfiles.names.primal;
  }

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ['scored', { user_pubkey, selector }]},
  ]));
};

export const getRecomendedArticleIds = (subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ['get_recommended_reads']},
  ]));
};

export const getAdvancedFeeds = (subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ['get_advanced_feeds']},
  ]));
};

export const getFeedItems = (subid: string, specification: any, user_pubkey: string | undefined, limit = 20, until = 0, offset = 0) => {
  let payload = {
    specification,
    limit,
  };

  if (user_pubkey) {
    // @ts-ignore
    payload.user_pubkey = user_pubkey;
  }

  // @ts-ignore
  if (until > 0) payload.until = until;

  // @ts-ignore
  if (offset > 0) payload.offset = offset;

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ['advanced_feed', payload]},
  ]));
};
