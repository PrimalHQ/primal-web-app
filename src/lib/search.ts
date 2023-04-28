import DOMPurify from "dompurify";
import { sendMessage } from "../sockets";

type SearchPayload = { query: string, limit: number, pubkey?: string };

export const cleanQuery = (query: string) => {
  return DOMPurify.sanitize(query);
}


export const searchUsers = (pubkey: string | undefined, subid: string, query: string, limit = 1000) => {

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
