export type NostrMessage = [
  type: "EVENT" | "EOSE",
  subkey: number,

];


export type NostrPost = {
  op: string,
  event: {
    id: string,
    pubkey: string,
    created_at: number,
    kind: number,
    tags: string[][],
    content: string,
    sig: string,
  },
  stats: {
    likes: number,
    replies: number,
    mentions: number,
  }
};

export type NostrUser = {
  op: string,
  pubkey: string;
  meta_data: {
    id: string,
    pubkey: string,
    created_at: number,
    kind: number,
    tags: string[][],
    content: string,
    sig: string,
  }
};

export type NostrMultiAdd = {
  op: string,
  event: NostrPost[],
  meta_data: NostrUser[],
}

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

export type Store = {
  messages: [],
  users: {
    [pubkey: string]: object,
  },
  posts: [],
  postStats: {
    [eventId: string]: object,
  },
  selectedFeed: PrimalFeed | undefined,
  availableFeeds: PrimalFeed[],
};
