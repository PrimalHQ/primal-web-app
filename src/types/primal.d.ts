import { SetStoreFunction } from "solid-js/store";

export type NostrPostContent = {
  kind: 1,
  content: string,
  id: string,
  created_at: number,
  pubkey: string,
  sig: string,
  tags: string[][],
};

export type NostrUserContent = {
  kind: 0,
  content: string,
  id: string,
  created_at: number,
  pubkey: string,
  sig: string,
  tags: string[][],
};

export type NostrStatsContent = {
  kind: 10000100,
  content: string,
};

export type NostrEventContent = NostrPostContent | NostrUserContent | NostrStatsContent;

export type NostrEvent = [
  type: "EVENT",
  subkey: string,
  content: NostrEventContent,
];

export type NostrEOSE = [
  type: "EOSE",
  subkey: string,
];

export type FeedStore = {
  posts: PrimalNote[],
  isFetching: boolean,
  scrollTop: number,
  activeUser: PrimalUser | undefined,
  publicKey: string | undefined,
  selectedFeed: PrimalFeed | undefined,
  availableFeeds: PrimalFeed[],
  showNewNoteForm: boolean,
};

export type NostrPostStats = {
  [eventId: string]: {
    likes: number,
    mentions: number,
    replies: number,
    zaps: number,
    satszapped: number,
    score: number,
    score24h: number,
  },
};

export type FeedPage = {
  users: {
    [pubkey: string]: NostrUserContent,
  },
  messages: NostrPostContent[],
  postStats: NostrPostStats,
};

export type TrendingNotesStore = {
  users: {
    [pubkey: string]: NostrUserContent,
  },
  messages: NostrPostContent[],
  notes: PrimalNote[],
  postStats: NostrPostStats,
};

export type PrimalContextStore = {

  data: FeedStore,
  page: FeedPage,
  actions?: {
    showNewNoteForm: () => void,
    hideNewNoteForm: () => void,
    fetchHomeFeed: () => void,
    selectFeed: (profile: PrimalFeed | undefined) => void,
    clearData: () => void,
    loadNextPage: () => void,
    savePosts: (posts: PrimalNote[]) => void,
    clearPage: () => void,
    setActiveUser: (user: PrimalUser) => void,
    updatedFeedScroll: (scrollTop: number) => void,
    proccessEventContent: (
      content: NostrUserContent | NostrPostContent | NostrStatsContent,
      type: string
    ) => void,
  },
};

export type NostrWindow = Window & typeof globalThis & { nostr: { getPublicKey: () => Promise<string> } };

export type NostrMessage = [
  type: "EVENT" | "EOSE",
  subkey: string,
  info: {
    kind: number,
    content: string,
  },
];

export type PrimalUser = {
  id: string,
  pubkey: string,
  npub: string,
  name: string,
  about: string,
  picture: string,
  nip05: string,
  banner: string,
  displayName: string,
  location: string,
  lud06: string,
  lud16: string,
  website: string,
  tags: string[][],
};

export type PrimalNote = {
  user: PrimalUser,
  post: {
    id: string,
    pubkey: string,
    created_at: number,
    tags: string[][],
    content: string,
    sig: string,
    likes: number,
    mentions: number,
    replies: number,
    zaps: number,
    score: number,
    score24h: number,
    satszapped: number,
  }
};

export type PrimalFeed = {
  name: string,
  npub: string | undefined,
  hex: string | undefined,
};

export type PrimalNetStats = {
  users: number,
  pubkeys: number,
  pubnotes: number,
  reactions: number,
  reposts: number,
  any: number,
  zaps: number,
  satszapped: number,
};

export type PrimalResponse = {
  op: string,
  netstats?: PrimalNetStats;
};

export type PrimalLegend = {
  your_follows: number,
  your_inner_network: number,
  your_outer_network: number,
};

export type FeedOption = { label: string, value: string | undefined};
