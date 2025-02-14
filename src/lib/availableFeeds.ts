import { defaultFeeds } from "../constants";
import { PrimalArticleFeed, PrimalFeed } from "../types/primal";
import { getStorage, saveFeeds, saveHomeFeeds, saveReadsFeeds } from "./localStore";

export const initHomeFeeds = (pubkey: string | undefined, defaults: PrimalArticleFeed[]) => {
  const storage = getStorage(pubkey);

  if (!storage.homeFeeds || storage.homeFeeds.length === 0) {
    saveHomeFeeds(pubkey, defaults);
    return defaults;
  }

  return storage.homeFeeds;
}

export const loadHomeFeeds = (pubkey: string | undefined) => {
  const storage = getStorage(pubkey);

  return storage.homeFeeds || [];
}


export const initReadsFeeds = (pubkey: string | undefined, defaults: PrimalArticleFeed[]) => {
  const storage = getStorage(pubkey);

  if (!storage.readsFeeds || storage.readsFeeds.length === 0) {
    saveReadsFeeds(pubkey, defaults);
    return defaults;
  }

  return storage.readsFeeds;
}

export const loadReadsFeeds = (pubkey: string | undefined) => {
  const storage = getStorage(pubkey);

  return storage.readsFeeds || [];
}


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
  const newFeeds = feeds.filter(f => f.hex !== feed.hex || f.includeReplies !== feed.includeReplies);

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
