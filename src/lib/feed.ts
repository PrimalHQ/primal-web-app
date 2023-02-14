import { socket } from "../sockets";

export const getFeed = (pubkey: string, subid: string, until = 0, limit = 20) => {

  const start = until === 0 ? 'since' : 'until';

  socket()?.send(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_feed", { pubkey, limit, [start]: until }]},
  ]));
}
