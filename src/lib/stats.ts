import { socket } from '../sockets';

export const startListeningForNostrStats = () => {
  socket()?.send(JSON.stringify(["REQ", "5345734845", {cache: ["net_stats"]}]));
};

export const stopListeningForNostrStats = () => {
  socket()?.send(JSON.stringify(["CLOSE", "5345734845"]));
};

export const getLegendStats = (pubkey: string | undefined) => {
  pubkey && socket()?.send(JSON.stringify(["REQ", "5345734845", {"cache":["explore_legend_counts",{ pubkey }]}]))
}
