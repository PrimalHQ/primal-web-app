import { defaultFeeds, noKey } from "../constants";
import { PrimalFeed } from "../types/primal";
import { getStorage, saveFeeds } from "./localStore";


// Copies data from the old storage key
const copyOldFeedData = (pubkey: string | undefined) => {

  const storageKey = (pubkey: string | undefined) => {
    return pubkey && pubkey !== noKey ? `saved_feeds_${pubkey}` : 'saved_feeds_anon';
  };

  const key = storageKey(pubkey);

  try {
    const feedsString = localStorage.getItem(key);

    if (feedsString) {
      const feeds = JSON.parse(feedsString) as PrimalFeed[];
      saveFeeds(pubkey, feeds);
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.log('Error parsing saved feeds: ', e);
  }

}

export const initAvailableFeeds = (pubkey: string | undefined) => {
  const storage = getStorage(pubkey);

  // copyOldFeedData(pubkey);

  if (storage.feeds.length === 0) {
    saveFeeds(pubkey, defaultFeeds);
    return defaultFeeds;
  }

  return storage.feeds;
}

export const updateAvailableFeedsTop = (
  pubkey: string | undefined,
  feed: PrimalFeed,
  feeds: PrimalFeed[],
) => {
  if (feeds.find(f => feed.name === f.name)) {
    return [...feeds];
  }

  const newFeeds = [ { ...feed }, ...feeds];

  saveFeeds(pubkey, newFeeds);

  return newFeeds;
};

export const updateAvailableFeeds = (
  pubkey: string | undefined,
  feed: PrimalFeed,
  feeds: PrimalFeed[],
) => {
  if (feeds.find(f => feed.name === f.name)) {
    return [...feeds];
  }

  const newFeeds = [ ...feeds, { ...feed }];

  saveFeeds(pubkey, newFeeds);

  return newFeeds;
};

export const removeFromAvailableFeeds = (
  pubkey: string | undefined,
  feed: PrimalFeed,
  feeds: PrimalFeed[],
) => {
  const newFeeds = feeds.filter(f => f.hex !== feed.hex);

  saveFeeds(pubkey, newFeeds);

  return newFeeds;
};

export const replaceAvailableFeeds = (
  pubkey: string | undefined,
  feeds: PrimalFeed[],
) => {
  const newFeeds = [...feeds];
  saveFeeds(pubkey, newFeeds);

  return newFeeds;
}
