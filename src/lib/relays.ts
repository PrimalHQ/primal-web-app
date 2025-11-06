import { sendMessage } from "../sockets";
import { NostrRelays } from "../types/primal";


export const getPreConfiguredRelays = () => {
  const rels: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

  return rels.reduce(
    (acc: NostrRelays, r: string) =>
      ({ ...acc, [r]: { read: true, write: true } }),
    {},
  );
};

export const getDefaultRelays = (subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_default_relays"]},
  ]))
};

export const getDefaultBlossomServers = (subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_recommended_blossom_servers"]},
  ]))
};
