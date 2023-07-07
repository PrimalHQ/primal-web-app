import { sendMessage } from "../sockets";
import { sanitize } from "./notes";

type SearchPayload = { query: string, limit: number, pubkey?: string, since?: number, until?: number };

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

export const searchContent = (subid: string, query: string, limit = 100) => {

  let payload: SearchPayload = { query: cleanQuery(query), limit };

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["search", payload]},
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
