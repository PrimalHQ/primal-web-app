import { defaultFeeds, noKey } from "../constants";
import { PrimalFeed } from "../types/primal";
import { getStorage, saveFeeds } from "./localStore";


export const initAvailableFeeds = (pubkey: string | undefined) => {
  const storage = getStorage(pubkey);

  if (storage.feeds && storage.feeds.length === 0) {
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
