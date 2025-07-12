import { sendMessage } from '../sockets';

export const startListeningForNostrStats = (subId: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    `netstats_${subId}`,
    {cache: ["net_stats"]},
  ]));
};

export const stopListeningForNostrStats = (subId: string) => {
  sendMessage(JSON.stringify([
    "CLOSE",
    `netstats_${subId}`,
  ]));
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
    return number.toLocaleString("hu-HU");
  }

  if (number < 100000) {
    return `${parseFloat((number/1000).toFixed(1)).toString().replace('.', ',')} e`;
  }

  if (number < 1000000) {
    return `${Math.floor(number/1000)} e`;
  }

  if (number < 100000000) {
    return `${parseFloat((number/1000000).toFixed(1)).toString().replace('.', ',')} m`;
  }

  return `${Math.floor(number/1000000)} m`;
};
