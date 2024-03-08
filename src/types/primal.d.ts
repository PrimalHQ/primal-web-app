import { MessageDescriptor } from "@cookbook/solid-intl";
// @ts-ignore Bad types in nostr-tools
import { Relay } from "nostr-tools";
import { JSX } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import { Kind } from "../constants";


export type NostrNoteContent = {
  kind: Kind.Text | Kind.Repost,
  content: string,
  id: string,
  created_at?: number,
  pubkey: string,
  sig: string,
  tags: string[][],
};

export type NostrUserContent = {
  kind: Kind.Metadata,
  content: string,
  id: string,
  created_at?: number,
  pubkey: string,
  sig: string,
  tags: string[][],
};

export type NostrStatsContent = {
  kind: Kind.NoteStats,
  content: string,
  pubkey?: string,
  created_at?: number,
};

export type NostrNetStatsContent = {
  kind: Kind.NetStats,
  content: string,
  pubkey?: string,
  created_at?: number,
};

export type NostrLegendStatsContent = {
  kind: Kind.LegendStats,
  content: string,
  pubkey?: string,
  created_at?: number,
};

export type NostrUserStatsContent = {
  kind: Kind.UserStats,
  content: string,
  pubkey: string,
  created_at: number,
};

export type NostrMentionContent = {
  kind: Kind.Mentions,
  content: string,
  pubkey?: string,
  created_at?: number,
};

export type NostrOldestEventContent = {
  kind: Kind.OldestEvent,
  content: string,
  pubkey?: string,
  created_at?: number,
};

export type NostrContactsContent = {
  kind: Kind.Contacts,
  content: string,
  pubkey?: string,
  created_at?: number,
  tags: string[][],
};

export type NostrMutedContent = {
  kind: Kind.MuteList | Kind.CategorizedPeople,
  content: string,
  pubkey?: string,
  created_at?: number,
  tags: string[][],
};

export type NostrScoredUsersContent = {
  kind: Kind.UserScore,
  content: string,
  created_at?: number,
  pubkey?: string,
};

export type NostrNotificationContent = {
  kind: Kind.Notification,
  content: string,
  created_at?: number,
  pubkey?: string,
};

export type NostrNotificationLastSeenContent = {
  kind: Kind.Timestamp,
  content: string,
  created_at?: number,
  pubkey?: string,
};

export type NostrNotificationStatsContent = {
  kind: Kind.NotificationStats,
  content: string,
  created_at?: number,
  pubkey?: string,
};

export type NostrNoteActionsContent = {
  kind: Kind.NoteActions,
  content: string,
  created_at?: number,
  pubkey?: string,
};

export type NostrMessageStatsContent = {
  kind: Kind.MessageStats,
  cnt: string,
  content?: string,
  created_at?: number,
  pubkey?: string,
};

export type NostrMessagePerSenderStatsContent = {
  kind: Kind.MesagePerSenderStats,
  content: string,
  created_at?: number,
  pubkey?: string,
};

export type NostrMessageEncryptedContent = {
  kind: Kind.EncryptedDirectMessage,
  content: string,
  created_at: number,
  pubkey: string,
  id: string,
};

export type NostrFeedRange = {
  kind: Kind.FeedRange,
  content: string,
  created_at?: number,
};

export type NostrMediaInfo = {
  kind: Kind.MediaInfo,
  content: string,
  created_at?: number,
};

export type NostrMediaUploaded = {
  kind: Kind.Uploaded,
  content: string,
  created_at?: number,
};

export type NostrLinkMetadata = {
  kind: Kind.LinkMetadata,
  content: string,
  created_at?: number,
};

export type NostrFilteringReason = {
  kind: Kind.FilteringReason,
  content: string,
  created_at?: number,
};

export type NostrUserFollwerCounts = {
  kind: Kind.UserFollowerCounts,
  content: string,
  created_at?: number,
};

export type NostrUserZaps = {
  kind: Kind.Zap,
  content: string,
  pubkey: string,
  tags: string[][],
  created_at?: number,
  id: string,
};

export type NostrSuggestedUsers = {
  kind: Kind.SuggestedUsersByCategory,
  content: string,
  created_at?: number,
};

export type PrimalUserRelays = {
  kind: Kind.UserRelays,
  content: string,
  created_at?: number,
  tags: string[][],
};

export type NostrEventContent =
  NostrNoteContent |
  NostrUserContent |
  NostrStatsContent |
  NostrNetStatsContent |
  NostrLegendStatsContent |
  NostrUserStatsContent |
  NostrMentionContent |
  NostrOldestEventContent |
  NostrContactsContent |
  NostrMutedContent |
  NostrScoredUsersContent |
  NostrNotificationContent |
  NostrNotificationLastSeenContent |
  NostrNotificationStatsContent |
  NostrNoteActionsContent |
  NostrMessageStatsContent |
  NostrMessagePerSenderStatsContent |
  NostrMessageEncryptedContent |
  NostrFeedRange |
  NostrMediaInfo |
  NostrMediaUploaded |
  NostrLinkMetadata |
  NostrFilteringReason |
  NostrUserFollwerCounts |
  NostrUserZaps |
  NostrSuggestedUsers |
  PrimalUserRelays;

export type NostrEvent = [
  type: "EVENT",
  subkey: string,
  content: NostrEventContent,
];

export type NostrEOSE = [
  type: "EOSE",
  subkey: string,
];

export type NoteActions = {
  event_id: string,
  liked: boolean,
  replied: boolean,
  reposted: boolean,
  zapped: boolean,
};

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
  mentions?: Record<string, NostrNoteContent>,
  noteActions: Record<string, NoteActions>,
  since?: number,
  until?: number,
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
  content: any,
  created_at: number,
  tags: string[][],
};
export type NostrRelaySignedEvent = NostrRelayEvent & {
  id: string,
  pubkey: string,
  sig: string,
};

interface SendPaymentResponse {
  preimage: string;
}

export type NostrExtension = {
  getPublicKey: () => Promise<string>,
  getRelays: () => Promise<NostrRelays>,
  signEvent: (event: NostrRelayEvent) => Promise<NostrRelaySignedEvent>,
  nip04: {
    encrypt: (pubkey: string, message: string) => Promise<string>,
    decrypt: (pubkey: string, message: string) => Promise<string>,
  },
};

export type WebLnExtension = {
  enable: () => Promise<void>,
  sendPayment: (req: string) => Promise<SendPaymentResponse>;
};

export type NostrWindow = Window & typeof globalThis & {
  nostr?: NostrExtension,
  webln?: WebLnExtension,
  walletStore: any,
};

export type PrimalWindow = Window & typeof globalThis & {
  loadPrimalStores: () => void,
  primal?: any,
  onPrimalComponentMount?: (data: any) => void,
  onPrimalComponentCleanup?: (data: any) => void,
  onPrimalCacheServerConnected?: (url: string, ws: WebSocket | undefined) => void,
  onPrimalUploadServerConnected?: (url: string, ws: WebSocket | undefined) => void,
  onPrimalCacheServerMessageReceived?: (url: string, data: any) => void,
  onPrimalCacheServerMessageSent?: (url: string, data: any) => void,
};

export type NostrEventType = "EVENT" | "EOSE" | "NOTICE";

export type NostrMessage = [
  type: NostrEventType,
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
  display_name?: string,
  displayName: string,
  location: string,
  lud06: string,
  lud16: string,
  website: string,
  tags: string[][],
};

export type PrimalNoteData = {
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
  noteActions: NoteActions,
}

export type PrimalNote = {
  user: PrimalUser,
  post: PrimalNoteData,
  repost?: PrimalRepost,
  msg: NostrNoteContent,
  mentionedNotes?: Record<string, PrimalNote>,
  mentionedUsers?: Record<string, PrimalUser>,
  replyTo?: string,
};

export type PrimalFeed = {
  name: string,
  npub?: string,
  hex?: string,
  includeReplies?: boolean,
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
  note: PrimalNoteData,
};

export type PrimalZap = {
  sender?: PrimalUser,
  reciver?: PrimalUser,
  created_at?: number,
  amount: number,
  message: string,
  id: string,
};

export type RepostInfo = (page: FeedPage, message: NostrNoteContent) => PrimalRepost;

export type ExploreFeedPayload = {
  timeframe: string,
  scope: string,
  limit: number,
  user_pubkey?: string,
  since? : number,
  until?: number,
  created_after?: number,
}

export type UserReference = Record<string, PrimalUser>;
export type NoteReference = Record<string, PrimalNote>;

export type ContextChildren =
  number |
  boolean |
  Node |
  JSX.ArrayElement |
  (string & {}) | null | undefined;

export type PrimalLinkPreview = {
  url: string,
  description?: string,
  title?: string,
  images?: string[],
  favicons?: string[],
};

export type PrimalTheme = { name: string, label: string, logo: string, dark?: boolean};

export type ChildrenProp = { children: number | boolean | Node | JSX.ArrayElement | (string & {}) | null | undefined; };

export type VanityProfiles = { names: Record<string, string> };

export type PrimalNotifUser = PrimalUser & { followers_count: number };

export type PrimalNotification = {
  pubkey: string,
  created_at: number,
  type: number,
  your_post?: string,
  follower?: string,
  you_were_mentioned_in?: string,
  your_post_were_mentioned_in?: string,
  post_you_were_mentioned_in?: string,
  post_your_post_was_mentioned_in?: string,
  who_liked_it?: string,
  who_zapped_it?: string,
  who_reposted_it?: string,
  who_replied_to_it?: string,
  satszapped?: number,
};

export type SortedNotifications = Record<number, PrimalNotification[]>;

export type UserRelation = 'follows' | 'other' | 'any';


export type DirectMessage = {
  id: string,
  sender: string,
  content: string,
  created_at: number,
};

export type DirectMessageThread = {
  author: string,
  messages: DirectMessage[],
};

export type SenderMessageCount = {
  cnt: number,
  latest_at: number,
  latest_event_id: string,
}

export type EmojiOption = {
  keywords: string[],
  char?: string,
  fitzpatrick_scale?: boolean,
  category?: string,
  name: string,
};

export type MediaSize = 'o' | 's' | 'm' | 'l';

export type MediaVariant = {
  s: MediaSize,
  a: 0 | 1,
  w: number,
  h: number,
  mt: string,
  media_url: string,
}

export type MediaEvent = {
  event_id: string,
  resources: { url: string, variants: MediaVariant[] }[],
}

export type ScopeDescriptor = {
  caption: MessageDescriptor,
  label: MessageDescriptor,
  description: MessageDescriptor,
}

export type SendNoteResult = {
  success: boolean,
  reasons?: string[],
  note?: NostrRelaySignedEvent,
};

export type MenuItem = {
  action: () => void,
  label: string,
  icon?: string,
  warning?: boolean,
  separator?: boolean,
};

export type Filterlist = {
  pubkey: string,
  relay?: string,
  petname?: string,
  content: boolean,
  trending: boolean,
};

export type ContentModeration = {
  name: string,
  scopes: string[],
}

export type ComponentLog = {
  name: string,
  domId: string,
  props: any,
}

export type UserCategory = {
  group: string,
  members: { name?: string, pubkey: string }[],
}

export type SelectionOption = {
  label: string,
  value: string,
  disabled?: boolean,
  separator?: boolean,
}

export type NotificationGroup = 'all' | 'zaps' | 'replies' | 'mentions' | 'reposts';

export type ZapOption = {
  emoji?: string,
  amount?: number,
  message?: string,
};

export type ContactsData = {
  content: string,
  created_at: number,
  tags: string[][],
  following: string[],
}

export type MembershipStatus = {
  pubkey?: string,
  tier?: string,
  name?: string,
  rename?: string,
  nostr_address?: string,
  lightning_address?: string,
  primal_vip_profile?: string,
  used_storage?: number,
  expires_on?: number,
};
