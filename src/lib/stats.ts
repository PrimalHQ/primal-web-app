import { sendMessage } from '../sockets';

let isListening = false;

export const startListeningForNostrStats = (subId: string) => {
  if (isListening) {
    return;
  }

  sendMessage(JSON.stringify([
    "REQ",
    `netstats_${subId}`,
    {cache: ["net_stats"]},
  ]));
  isListening = true;
};

export const stopListeningForNostrStats = (subId: string) => {
  if (!isListening) {
    return;
  }
  sendMessage(JSON.stringify([
    "CLOSE",
    `netstats_${subId}`,
  ]));
  isListening = false;
};

export const getLegendStats = (pubkey: string | undefined, subId: string) => {
  pubkey && sendMessage(JSON.stringify([
    "REQ",
    `legendstats_${subId}`,
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
