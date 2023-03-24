import { createStore, SetStoreFunction } from "solid-js/store";
import { emptyPage, Kind } from "../constants";
import { hexToNpub } from "../lib/keys";
import { initialStore } from "../constants";
import {
  FeedPage,
  NostrEventContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  PrimalFeed,
  PrimalNote
} from "../types/primal";

export type HomeStore = {
  notes: PrimalNote[],
  isFetching: boolean,
  scrollTop: number,
  selectedFeed: PrimalFeed | undefined,
  selectedFeedChanged: boolean,
  availableFeeds: PrimalFeed[],
  oldestNote: PrimalNote | undefined,
  page: FeedPage,
};
// Processing
// TODO: Move to it's own file

const proccessPost = (post: NostrNoteContent) => {
  if (homeFeed.oldestNote?.post?.id === post.id) {
    return;
  }

  setHomeFeed(
    'page',
    'messages',
    (msgs) => [ ...msgs, post],
  );
};

const proccessUser = (user: NostrUserContent) => {
  setHomeFeed(
    'page',
    'users',
    (users) => ({ ...users, [user.pubkey]: user}),
  );
};

const proccessStat = (stat: NostrStatsContent) => {
  const content = JSON.parse(stat.content);

  setHomeFeed(
    'page',
    'postStats',
    (stats) => ({ ...stats, [content.event_id]: content }),
  );
};

// ---------------------------------------------------------

export const [homeFeed, setHomeFeed] = createStore(initialStore);

export const selectFeed = (feed: PrimalFeed | undefined) => {
  // if (feed?.hex === homeFeed.selectedFeed?.hex) {
  //   homeFeed.selectedFeedChanged && setHomeFeed('selectedFeedChanged', () => false);
  //   return;
  // }

  setHomeFeed('selectedFeed', () => ({ ...feed }));

};

export const resetSelectedFeed = () => {
  const defaultFeed = homeFeed.availableFeeds[0];
  selectFeed(defaultFeed);
}

export const clearFeed = () => {
  setHomeFeed('notes', () => []);
};

export const loadNextPage = () => {
  const lastPost = homeFeed.notes[homeFeed.notes.length - 1];

  setHomeFeed('oldestNote', () => ({ ...lastPost }));
};

export const addNotes = (newNotes: PrimalNote[]) => {
  setHomeFeed('notes', (notes) => [ ...notes, ...newNotes ]);
  setHomeFeed('isFetching', false);
};

export const replaceNotes = (newNotes: PrimalNote[]) => {
  setHomeFeed('notes', () => [...newNotes ]);
  setHomeFeed('isFetching', false);
};

export const clearPage = () => {
  setHomeFeed('page', () => ({ ...emptyPage }));
};

export const proccessEventContent = (
  content: NostrEventContent,
  type: string
) => {
  if (type === 'EVENT') {
    if (content.kind === Kind.Metadata) {
      proccessUser(content);
    }
    if (content.kind === Kind.Text) {
      proccessPost(content);
    }
    if (content.kind === Kind.NoteStats) {
      proccessStat(content);
    }
  }
};

export const updateScroll = (scrollTop: number) => {
  setHomeFeed('scrollTop', () => scrollTop);
}

export const resetScroll = () => {
  setHomeFeed('scrollTop', () => 0);

  window.scrollTo({
    top: 0,
    left: 0,
    // @ts-expect-error https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/5
    behavior: 'instant',
  });
}

export const addMyFeed = (hex: string) => {
  const npub = hexToNpub(hex);
  const feed = { name: 'Latest, following', hex, npub};

  setHomeFeed('availableFeeds', () => ([ feed, ...initialStore.availableFeeds]));
  selectFeed(feed);
};

export type HomeFeedStore = {
  data: FeedStore2,
  setHomeFeed: SetStoreFunction<FeedStore2>,
  selectFeed: (feed: PrimalFeed | undefined) => void,
  resetSelectedFeed: () => void,
  clearFeed: () => void,
  addMyFeed: (hex: string) => void,
  loadNextPage: () => void,
  clearPage: () => void,
  addNotes: (newNotes: PrimalNote[]) => void,
  replaceNotes: (newNotes: PrimalNote[]) => void,
  proccessEventContent: (
    content: NostrEventContent,
    type: string,
  ) => void,
  updateScroll: (scrollTop: number) => void,
  resetScroll: () => void,
};


export default {
  data: homeFeed,
  setHomeFeed,
  selectFeed,
  resetSelectedFeed,
  clearFeed,
  addMyFeed,
  loadNextPage,
  clearPage,
  addNotes,
  replaceNotes,
  proccessEventContent,
  updateScroll,
  resetScroll,
};
