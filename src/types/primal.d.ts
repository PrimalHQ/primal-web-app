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

export type NostrEvent = [
  type: "EVENT",
  subkey: number,
  content: NostrUserContent | NostrPostContent | NostrStatsContent,
];

export type NostrEOSE = [
  type: "EOSE",
  subkey: number,
];

export type FeedStore = {
  posts: PrimalPost[],
  selectedFeed: PrimalFeed | undefined,
  availableFeeds: PrimalFeed[],
};

export type FeedPage = {
  users: {
    [pubkey: string]: NostrUserContent,
  },
  messages: NostrPostContent[],
  postStats: {
    [eventId: string]: {
      likes: number,
      mentions: number,
      replies: number,
    },
  },
}

export type PrimalContextStore = {

  data?: FeedStore,
  actions?: {
    selectFeed: (profile: PrimalFeed | undefined) => void,
    clearData: () => void,
    loadNextPage: () => void,
  },
};

export type NostrWindow = Window & typeof globalThis & { nostr: { getPublicKey: () => string } };

export type NostrMessage = [
  type: "EVENT" | "EOSE",
  subkey: number,
  info: {
    kind: number,
    content: string,
  },
];

export type PrimalUser = {
  id: string,
  pubkey: string,
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

export type PrimalPost = {
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
  }
};

export type PrimalFeed = {
  name: string,
  npub: string,
  hex: string,
};
