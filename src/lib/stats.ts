import { APP_ID } from '../contexts/FeedContext';
import { sendMessage, socket } from '../sockets';

export const startListeningForNostrStats = () => {
  sendMessage(JSON.stringify([
    "REQ",
    `netstats_${APP_ID}`,
    {cache: ["net_stats"]},
  ]));
};

export const stopListeningForNostrStats = () => {
  sendMessage(JSON.stringify([
    "CLOSE",
    `netstats_${APP_ID}`,
  ]));
};

export const getLegendStats = (pubkey: string | undefined) => {
  pubkey && sendMessage(JSON.stringify([
    "REQ",
    `stats_legend_${APP_ID}`,
    {"cache":["explore_legend_counts",{ pubkey }]},
  ]));
}
