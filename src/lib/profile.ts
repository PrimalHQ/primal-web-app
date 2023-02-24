import { socket } from "../sockets";

export const getUserProfile = (pubkey: string, subid: string) => {
  socket()?.send(JSON.stringify([
    "REQ",
    subid,
    {cache: ["user_info", { pubkey }]},
  ]));
}


export const trimVerification = (address: string | undefined) => {
  if (address === undefined) {
    return '';
  }

  const [_, domain] = address.split('@');

  return domain;
}
