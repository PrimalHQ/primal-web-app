import { sendMessage } from "../sockets";

export const searchUsers = (pubkey: string | undefined, subid: string, query: string, limit = 1000) => {

  let payload = { query, limit };

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

  let payload = { query, limit };

  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["search", payload]},
  ]));
}
