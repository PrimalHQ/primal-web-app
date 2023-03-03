import { isConnected, sendMessage, socket } from "../sockets";

export const getUserProfile = (pubkey: string, subid: string) => {
  sendMessage(JSON.stringify([
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
