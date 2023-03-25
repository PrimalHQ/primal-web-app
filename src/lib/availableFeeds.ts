import { defaultFeeds, initialStore, noKey } from "../constants";
import { PrimalFeed } from "../types/primal";

const storageKey = (pubKey: string | undefined) => {
  return pubKey && pubKey !== noKey ? `saved_feeds_${pubKey}` : 'saved_feeds_anon';
};

export const initAvailableFeeds = (pubKey: string | undefined) => {
  const storedFeeds = JSON.parse(localStorage.getItem(storageKey(pubKey)) || '["empty"]');

  if (storedFeeds[0] === 'empty' || !pubKey) {
    localStorage.setItem(storageKey(pubKey), JSON.stringify(defaultFeeds));

    return defaultFeeds;
  }

  return storedFeeds;
}

export const updateAvailableFeedsTop = (
  pubKey: string | undefined,
  feed: PrimalFeed,
  feeds: PrimalFeed[],
) => {
  if (feeds.find(f => feed.name === f.name)) {
    return [...feeds];
  }

  const newFeeds = [ { ...feed }, ...feeds];

  localStorage.setItem(storageKey(pubKey), JSON.stringify(newFeeds));

  return newFeeds;
};

export const updateAvailableFeeds = (
  pubKey: string | undefined,
  feed: PrimalFeed,
  feeds: PrimalFeed[],
) => {
  if (feeds.find(f => feed.name === f.name)) {
    return [...feeds];
  }

  const newFeeds = [ ...feeds, { ...feed }];

  localStorage.setItem(storageKey(pubKey), JSON.stringify(newFeeds));

  return newFeeds;
};

export const removeFromAvailableFeeds = (
  pubKey: string | undefined,
  feed: PrimalFeed,
  feeds: PrimalFeed[],
) => {
  const newFeeds = feeds.filter(f => f.hex !== feed.hex);

  localStorage.setItem(storageKey(pubKey), JSON.stringify(newFeeds));

  return newFeeds;
};

export const replaceAvailableFeeds = (
  pubKey: string | undefined,
  feeds: PrimalFeed[],
) => {
  localStorage.setItem(storageKey(pubKey), JSON.stringify(feeds));

  return [...feeds];
}
