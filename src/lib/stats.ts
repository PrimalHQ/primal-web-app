import { APP_ID } from '../contexts/FeedContext';
import { socket } from '../sockets';

export const startListeningForNostrStats = () => {
  socket()?.send(JSON.stringify(["REQ", `netstats_${APP_ID}`, {cache: ["net_stats"]}]));
};

export const stopListeningForNostrStats = () => {
  socket()?.send(JSON.stringify(["CLOSE", `netstats_${APP_ID}`]));
};

export const getLegendStats = (pubkey: string | undefined) => {
  pubkey && socket()?.send(JSON.stringify(["REQ", `stats_legend_${APP_ID}`, {"cache":["explore_legend_counts",{ pubkey }]}]))
}
