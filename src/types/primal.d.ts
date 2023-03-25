import { Relay } from "nostr-tools";
import { JSX } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import { Kind } from "../constants";


export type NostrNoteContent = {
  kind: Kind.Text | Kind.Repost,
  content: string,
  id: string,
  created_at: number,
  pubkey: string,
  sig: string,
  tags: string[][],
};

export type NostrUserContent = {
  kind: Kind.Metadata,
  content: string,
  id: string,
  created_at: number,
  pubkey: string,
  sig: string,
  tags: string[][],
};

export type NostrStatsContent = {
  kind: Kind.NoteStats,
  content: string,
  pubkey?: string,
};

export type NostrNetStatsContent = {
  kind: Kind.NetStats,
  content: string,
  pubkey?: string,
};

export type NostrLegendStatsContent = {
  kind: Kind.LegendStats,
  content: string,
  pubkey?: string,
};

export type NostrUserStatsContent = {
  kind: Kind.UserStats,
  content: string,
  pubkey?: string,
};

export type NostrMentionContent = {
  kind: Kind.Mentions,
  content: string,
  pubkey?: string,
};

export type NostrEventContent =
  NostrNoteContent |
  NostrUserContent |
  NostrStatsContent |
  NostrNetStatsContent |
  NostrLegendStatsContent |
  NostrUserStatsContent |
  NostrMentionContent;

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
  theme: string,
  trendingNotes: TrendingNotesStore,
  zappedNotes: TrendingNotesStore,
  exploredNotes: PrimalNote[] | [],
  threadedNotes: PrimalNote[] | [],
};

export type NostrPostStats = {
  [eventId: string]: {
    likes: number,
    mentions: number,
    reposts: number,
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
  messages: NostrNoteContent[],
  postStats: NostrPostStats,
};

export type TrendingNotesStore = {
  users: {
    [pubkey: string]: NostrUserContent,
  },
  messages: NostrNoteContent[],
  notes: PrimalNote[],
  postStats: NostrPostStats,
};

export type PrimalContextStore = {

  data: FeedStore,
  page: FeedPage,
  relays: Relay[],
  // likes: string[],
  actions?: {
    clearThreadedNotes: () => void,
    setThreadedNotes: (newNotes: PrimalNote[]) => void,
    setData: SetStoreFunction<FeedStore>,
    clearExploredNotes: () => void,
    setExploredNotes: (newNotes: PrimalNote[]) => void,
    clearTrendingNotes: () => void,
    clearZappedNotes: () => void,
    setTheme: (newTheme: string) => void,
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
      content: NostrUserContent | NostrNoteContent | NostrStatsContent,
      type: string
    ) => void,
  },
};

export type NostrRelay = { read: boolean, write: boolean };

export type NostrRelays = Record<string, NostrRelay>;

export type NostrRelayEvent = {
  kind: number,
  content: string,
  created_at: number,
  tags: string[][],
};
export type NostrRelaySignedEvent = NostrRelayEvent & {
  id: string,
  pubkey: string,
  sig: string,
};

export type NostrWindow = Window & typeof globalThis & {
  nostr: {
    getPublicKey: () => Promise<string>,
    getRelays: () => Promise<NostrRelays>,
    signEvent: (event: NostrRelayEvent) => Promise<NostrRelaySignedEvent>;
  },
};

export type PrimalWindow = Window & typeof globalThis & {
  loadPrimalStores: () => void,
  primal?: any,
};

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
    reposts: number,
    replies: number,
    zaps: number,
    score: number,
    score24h: number,
    satszapped: number,
    noteId: string,
  },
  repost?: PrimalRepost,
  msg: NostrNoteContent,
};

export type PrimalFeed = {
  name: string,
  npub?: string,
  hex?: string,
};

export type PrimalScopeFeed = {
  name: string,
  scope?: string,
  timeframe?: string,
};

// export type PrimalFeed = PrimalUserFeed & PrimalScopeFeed;

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

export type FeedOption = {
  label: string,
  value: string | undefined,
};

export type PrimalRepost = {
  user: PrimalUser,
}

export type RepostInfo = (page: FeedPage, message: NostrNoteContent) => PrimalRepost;

export type ExploreFeedPayload = {
  timeframe: string,
  scope: string,
  limit: number,
  pubkey?: string,
  since? : number,
  until?: number,
}

export type UserReference = {
  id: string,
  pubkey: string,
  kind: number,
  tags: string[][],
  npub?: string,
  name?: string,
  about?: string,
  picture?: string,
  nip05?: string,
  banner?: string,
  display_name?: string,
  location?: string,
  lud06?: string,
  lud16?: string,
  website?: string,
  content?: string,
  created_at?: number,
  sig?: string,
};

export type ContextChildren =
  number |
  boolean |
  Node |
  JSX.ArrayElement |
  JSX.FunctionElement |
  (string & {}) | null | undefined;

export type HomeContextStore = {
  notes: PrimalNote[],
  isFetching: boolean,
  scrollTop: number,
  selectedFeed: PrimalFeed | undefined,
  page: FeedPage,
  lastNote: PrimalNote | undefined,
  actions: {
    saveNotes: (newNotes: PrimalNote[]) => void,
    clearNotes: () => void,
    fetchNotes: (topic: string, subId: string, until?: number) => void,
    fetchNextPage: () => void,
    selectFeed: (feed: PrimalFeed | undefined) => void,
    updateScrollTop: (top: number) => void,
    updatePage: (content: NostrEventContent) => void,
    savePage: (page: FeedPage) => void,
  }
}

export type ChildrenProp = { children: number | boolean | Node | JSX.ArrayElement | JSX.FunctionElement | (string & {}) | null | undefined; };
