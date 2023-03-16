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

export const humanizeNumber = (number: number, veryShort = false) => {

  const bottomLimit = veryShort ? 1000 : 10000;

  if (number < bottomLimit) {
    return number.toLocaleString();
  }

  if (number < 100000) {
    return `${parseFloat((number/1000).toFixed(1))} k`;
  }

  if (number < 1000000) {
    return `${Math.floor(number/1000)} k`;
  }

  if (number < 100000000) {
    return `${parseFloat((number/1000000).toFixed(1))} m`;
  }

  return `${Math.floor(number/1000000)} m`;
};
