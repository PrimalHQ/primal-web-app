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

export const getArticlesStats = (pubkey: string | undefined, subId: string) => {
  pubkey && sendMessage(JSON.stringify([
    "REQ",
    subId,
    {"cache":["articles_stats",{ pubkey }]},
  ]));
}

export const getTopArticle = (pubkey: string | undefined, by: 'satszapped' | 'interactions', subId: string) => {
  pubkey && sendMessage(JSON.stringify([
    "REQ",
    subId,
    {"cache":["top_article",{ pubkey, by }]},
  ]));
}

export const humanizeNumber = (number: number, abbrLimit = true) => {

  if (!abbrLimit) return number.toLocaleString();

  const bottomLimit = 10000;

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
