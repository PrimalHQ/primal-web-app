import { MessageDescriptor } from "@cookbook/solid-intl";
import { Relay } from "../lib/nTools";
import { JSX } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import { Kind } from "../constants";
import { CohortInfo } from "../contexts/AppContext";
import { LegendCustomizationConfig } from "../lib/premium";
import { LeaderboardInfo } from "../megaFeeds";
import { StreamingData } from "../lib/streaming";

export type TopZap = {
  id: string,
  amount: number,
  pubkey: string,
  message: string,
  eventId: string,
}

export type NostrNoteContent = {
  kind: Kind.Text | Kind.Repost | Kind.LongForm | Kind.LongFormShell | Kind.Draft | Kind.LiveEvent,
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
  id?: string,
  tags?: string[][],
};

export type NostrNetStatsContent = {
  kind: Kind.NetStats,
  content: string,
  pubkey?: string,
  created_at?: number,
  id?: string,
  tags?: string[][],
};

export type NostrLegendStatsContent = {
  kind: Kind.LegendStats,
  content: string,
  pubkey?: string,
  created_at?: number,
  id?: string,
  tags?: string[][],
};

export type NostrUserStatsContent = {
  kind: Kind.UserStats,
  content: string,
  pubkey: string,
  created_at: number,
  id?: string,
  tags?: string[][],
};

export type NostrMentionContent = {
  kind: Kind.Mentions,
  content: string,
  pubkey?: string,
  created_at?: number,
  id?: string,
  tags?: string[][],
};

export type NostrOldestEventContent = {
  kind: Kind.OldestEvent,
  content: string,
  pubkey?: string,
  created_at?: number,
  id?: string,
  tags?: string[][],
};

export type NostrContactsContent = {
  kind: Kind.Contacts,
  content: string,
  pubkey?: string,
  created_at?: number,
  tags: string[][],
  id: string,
};

export type NostrMutedContent = {
  kind: Kind.MuteList | Kind.CategorizedPeople,
  content: string,
  pubkey?: string,
  created_at?: number,
  tags: string[][],
  id?: string,
};

export type NostrScoredUsersContent = {
  kind: Kind.UserScore,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrNotificationContent = {
  kind: Kind.Notification,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrNotificationLastSeenContent = {
  kind: Kind.Timestamp,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrNotificationStatsContent = {
  kind: Kind.NotificationStats,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrNoteActionsContent = {
  kind: Kind.NoteActions,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrMessageStatsContent = {
  kind: Kind.MessageStats,
  cnt: string,
  content?: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrMessagePerSenderStatsContent = {
  kind: Kind.MesagePerSenderStats,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrMessageEncryptedContent = {
  kind: Kind.EncryptedDirectMessage,
  content: string,
  created_at: number,
  pubkey: string,
  id: string,
  tags?: string[][],
};

export type NostrFeedRange = {
  kind: Kind.FeedRange,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrMediaInfo = {
  kind: Kind.MediaInfo,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrMediaUploaded = {
  kind: Kind.Uploaded,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrLinkMetadata = {
  kind: Kind.LinkMetadata,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrFilteringReason = {
  kind: Kind.FilteringReason,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrUserFollwerCounts = {
  kind: Kind.UserFollowerCounts,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
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
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type PrimalUserRelays = {
  kind: Kind.UserRelays,
  content: string,
  created_at?: number,
  tags: string[][],
  pubkey?: string,
  id?: string,
};

export type NostrBookmarks = {
  kind: Kind.Bookmarks,
  content: string,
  created_at?: number,
  tags: string[][],
  pubkey?: string,
  id?: string,
};

export type NostrRelayHint = {
  kind: Kind.RelayHint,
  content: string,
  created_at?: number,
  tags: string[][],
  pubkey?: string,
  id?: string,
};

export type NostrZapInfo = {
  kind: Kind.EventZapInfo,
  content: string,
  created_at?: number,
  tags?: string[][],
  pubkey?: string,
  id?: string,
};

export type NostrQuoteStatsInfo = {
  kind: Kind.NoteQuoteStats,
  content: string,
  created_at?: number,
  tags?: string[][],
  pubkey?: string,
  id?: string,
};

export type NostrWordCount = {
  kind: Kind.WordCount,
  content: string,
  created_at?: number,
  tags?: string[][],
  pubkey?: string,
  id?: string,
};

export type NostrTierList = {
  kind: Kind.TierList,
  content: string,
  created_at?: number,
  tags?: string[][],
  pubkey?: string,
  id?: string,
};

export type NostrTier = {
  kind: Kind.Tier,
  content: string,
  created_at?: number,
  id: string,
  pubkey?: string,
  tags?: string[][],
};

export type NostrSubscribe = {
  kind: Kind.Subscribe,
  content: string,
  created_at?: number,
  id: string,
  pubkey?: string,
  tags?: string[][],
};

export type NostrUnsubscribe = {
  kind: Kind.Unsubscribe,
  content: string,
  created_at?: number,
  id: string,
  pubkey?: string,
  tags?: string[][],
};

export type NostrHighlight = {
  kind: Kind.Highlight,
  pubkey: string,
  content: string,
  created_at?: number,
  id: string,
  tags?: string[][],
};

export type NostrDVM = {
  kind: Kind.DVM,
  pubkey: string,
  content: string,
  created_at?: number,
  id: string,
  tags?: string[][],
};

export type NostrDVMMetadata = {
  kind: Kind.DVMMetadata,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrTopicStats = {
  kind: Kind.NoteTopicStat,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrDVMFollowsActions = {
  kind: Kind.DVMFollowsActions,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrUserFollowerIncrease = {
  kind: Kind.UserFollowerIncrease,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrPrimalVanityNames = {
  kind: Kind.VerifiedUsersDict,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrPrimalExchangeRate = {
  kind: Kind.ExchangeRate,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrPrimalMediaStats = {
  kind: Kind.MediaStats,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrPrimalMediaList= {
  kind: Kind.MediaList,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrContactList= {
  kind: Kind.ContentStats,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrOrderHistory= {
  kind: Kind.OrderHistory,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrLegendCustomization= {
  kind: Kind.LegendCustomization,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrBroadcastStatus= {
  kind: Kind.BroadcastStatus,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrMembershipCohortInfo= {
  kind: Kind.MembershipCohortInfo,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrBlossom= {
  kind: Kind.Blossom,
  content: string,
  created_at?: number,
  pubkey?: string,
  id?: string,
  tags?: string[][],
};

export type NostrRelayList= {
  kind: Kind.RelayList,
  content?: string,
  created_at?: number,
  pubkey: string,
  id?: string,
  tags?: string[][],
};

export type NostrImageContent= {
  kind: Kind.Image,
  content?: string,
  created_at?: number,
  pubkey: string,
  id?: string,
  tags?: string[][],
};

export type NostrLiveEvent= {
  kind: Kind.LiveEvent,
  content?: string,
  created_at?: number,
  pubkey: string,
  id?: string,
  tags?: string[][],
};

export type ArticleStatsEvent= {
  kind: Kind.ArticlesStats,
  content?: string,
  created_at?: number,
  pubkey: string,
  id?: string,
  tags?: string[][],
};

export type PrimalLeaderboard = {
  kind: Kind.LegendLeaderboard,
  content?: string,
  created_at?: number,
  pubkey: string,
  id?: string,
  tags?: string[][],
};

export type NostrLiveChat = {
  kind: Kind.LiveChatMessage,
  content?: string,
  created_at?: number,
  pubkey: string,
  id: string,
  tags?: string[][],
};

export type NostrLiveEventStats = {
  kind: Kind.LiveEventStats,
  content?: string,
  created_at?: number,
  pubkey: string,
  id: string,
  tags?: string[][],
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
  PrimalUserRelays |
  NostrBookmarks |
  NostrRelayHint |
  NostrZapInfo |
  NostrQuoteStatsInfo |
  NostrTierList |
  NostrTier |
  NostrSubscribe |
  NostrUnsubscribe |
  NostrWordCount |
  NostrHighlight |
  NostrDVM |
  NostrDVMMetadata |
  NostrDVMFollowsActions |
  NostrUserFollowerIncrease |
  NostrPrimalVanityNames |
  NostrPrimalExchangeRate |
  NostrPrimalMediaStats |
  NostrPrimalMediaList |
  NostrContactList |
  NostrOrderHistory |
  NostrLegendCustomization |
  NostrBroadcastStatus |
  NostrMembershipCohortInfo |
  NostrBlossom |
  NostrRelayList |
  NostrImageContent |
  NostrTopicStats |
  NostrLiveEvent |
  ArticleStatsEvent |
  NostrLiveChat |
  NostrLiveEventStats |
  PrimalLeaderboard;

export type NostrEvent = [
  type: "EVENT",
  subkey: string,
  content: NostrEventContent,
];

export type NostrEvents = [
  type: "EVENTS",
  subkey: string,
  content: NostrEventContent[],
];

export type NostrEOSE = [
  type: "EOSE",
  subkey: string,
];

export type NostrNotice = [
  type: "NOTICE",
  subkey: string,
  reason: string,
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
    bookmarks: number,
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
  relayHints?: Record<string, string>,
  topZaps: Record<string, TopZap[]>,
  since?: number,
  until?: number,
  sortBy?: string,
  wordCount?: Record<string, number>,
  elements?: string[],
};

export type TopicStats = Record<string, number>;

export type MegaFeedPage = {
  users: {
    [pubkey: string]: NostrUserContent,
  },
  notes: NostrNoteContent[],
  reads: NostrNoteContent[],
  drafts: NostrNoteContent[],
  noteStats: NostrPostStats,
  zaps: NostrUserZaps[],
  topicStats: TopicStats,
  mentions: Record<string, NostrNoteContent>,
  noteActions: Record<string, NoteActions>,
  relayHints: Record<string, string>,
  topZaps: Record<string, TopZap[]>,
  since: number,
  until: number,
  sortBy: string,
  elements: string[],
  userStats: Record<string, UserStats>,
  userFollowerCounts: Record<string, number>,
  userFollowerIncrease: Record<string, { increase: number, ratio: number, count: number}>,
  wordCount: Record<string, number>,
  dmContacts: Record<string, SenderMessageCount>,
  encryptedMessages: NostrMessageEncryptedContent[],
  memberCohortInfo: Record<string, CohortInfo>,
  legendCustomization: Record<string, LegendCustomizationConfig>,
  leaderboard: LeaderboardInfo[],
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
  nip44: {
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

export type PrimalDVM = {
  id: string,
  name: string,
  about: string,
  amount: string,
  primalVerifiedRequired: boolean,
  pubkey: string,
  supportedKinds: string[],
  identifier: string,
  picture?: string,
  image?: string,
  user?: PrimalUser,
  primal_spec?: string,
  coordinate?: string,
}
export type DVMStats = { likes: number, satszapped: number };

export type DVMMetadata = { kind: 'reads' | 'notes', isPrimal: boolean};


export type UserStats = {
  pubkey: string,
  follows_count: number,
  followers_count: number,
  note_count: number,
  reply_count: number,
  time_joined: number,
  total_zap_count: number,
  total_satszapped: number,
  relay_count: number,
  media_count: number,
  long_form_note_count?: number,
  followers_increase?: {
    increase: number,
    ratio: number,
    count: number,
  },
};

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
  userStats?: UserStats,
  msg: NostrUserContent,
};

export type PrimalNoteData = {
  id: string,
  pubkey: string,
  created_at: number,
  tags: string[][],
  content: string,
  sig: string,
  kind: Kind.Text | Kind.Repost | Kind.LongForm | Kind.LongFormShell | Kind.Draft,
  likes: number,
  mentions: number,
  reposts: number,
  replies: number,
  zaps: number,
  score: number,
  score24h: number,
  satszapped: number,
  noteId: string,
  noteIdShort: string,
  noteActions: NoteActions,
  relayHints?: Record<string, string>,
}

export type PrimalNote = {
  user: PrimalUser,
  post: PrimalNoteData,
  repost?: PrimalRepost,
  msg: NostrNoteContent,
  mentionedNotes?: Record<string, PrimalNote>,
  mentionedUsers?: Record<string, PrimalUser>,
  mentionedArticles?: Record<string, PrimalArticle>,
  mentionedZaps?: Record<string, PrimalZap>,
  mentionedHighlights?: Record<string, any>,
  mentionedLiveEvents?: Record<string, StreamingData>,
  replyTo?: string,
  id: string,
  pubkey: string,
  noteId: string,
  noteIdShort: string,
  tags: string[][],
  topZaps: TopZap[],
  content: string,
  relayHints?: Record<string, string>,
};

export type PrimalArticle = {
  title: string,
  summary: string,
  image: string,
  tags: string[],
  published: number,
  content: string,
  user: PrimalUser,
  topZaps: TopZap[],
  repost?: PrimalRepost,
  mentionedNotes?: Record<string, PrimalNote>,
  mentionedArticles?: Record<string, PrimalArticle>,
  mentionedUsers?: Record<string, PrimalUser>,
  mentionedZaps?: Record<string, PrimalZap>,
  mentionedHighlights?: Record<string, any>,
  mentionedLiveEvents?: Record<string, StreamingData>,
  replyTo?: string,
  id: string,
  pubkey: string,
  naddr: string,
  noteId: string,
  noteIdShort: string,
  coordinate: string,
  msg: NostrNoteContent,
  wordCount: number,
  noteActions: NoteActions,
  bookmarks: number,
  likes: number,
  mentions: number,
  reposts: number,
  replies: number,
  zaps: number,
  score: number,
  score24h: number,
  satszapped: number,
  client?: string,
  relayHints?: Record<string, string>,
};

export type PrimalDraft = {
  id: string,
  kind: number,
  content: string,
  plain: string,
  client: string,
  pubkey: string,
  created_at: number,
  msg: NostrNoteContent,
  noteId: string,
}

export type PrimalFeed = {
  name: string,
  npub?: string,
  hex?: string,
  includeReplies?: boolean,
};

export type PrimalArticleFeed = {
  name: string,
  spec: string,
  description: string,
  enabled: boolean,
  feedkind?: string,
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
  description?: string,
  deafault?: boolean,
};

export type PrimalRepost = {
  user: PrimalUser,
  note: PrimalNoteData,
};

export type PrimalZap = {
  sender?: PrimalUser | string,
  reciver?: PrimalUser | string,
  created_at?: number,
  amount: number,
  message: string,
  id: string,
  zappedId?: string,
  zappedKind?: number,
};

export type RepostInfo = (page: FeedPage, message: NostrNoteContent) => PrimalRepost;

export type MegaRepostInfo = (page: MegaFeedPage, message: NostrNoteContent) => PrimalRepost;

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
  id: string,
  pubkey: string,
  created_at: number,
  type: number,
  highlight?: string,
  reaction?: string,
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
  who_highlighted_it?: string,
  who_bookmarked_it?: string,
  who_reacted?: string,
  satszapped?: number,
  host?: string,
  live_event_id?: string,
  coordinate?: string,
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
  dur?: number,
}

export type MediaEvent = {
  event_id: string,
  resources: { url: string, variants: MediaVariant[] }[],
  thumbnails?: Record<string, string>,
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
  description?: string,
  default?: boolean,
  disabled?: boolean,
  separator?: boolean,
  id?: string,
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

export type LncbSectionNetwork = {
  name: 'lightning_network',
  letters: 'ln',
};

export type LnbcSection = {
  name: string,
  letters: string,
  tag?: string,
  value?: any
};

export type LnbcRouteHint = {
  pubkey: string,
  short_channel_id: string,
  fee_base_msat: number,
  fee_proportional_millionths: number,
  cltv_expiry_delta: number,
}

export type LnbcInvoice = {
  paymentRequest: string,
  sections: LnbcSection[],
  expiry: number,
  route_hints: LnbcRouteHint[],
};

export type PageRange = {
  since: number,
  until: number,
  order_by: string,
};

export type EventCoordinate = { pubkey: string, identifier: string, kind: number };

export type NostrStats = {
  users: number,
  pubkeys: number,
  pubnotes: number,
  reactions: number,
  reposts: number,
  any: number,
  zaps: number,
  satszapped: number,
};

export type FeedRange = {
  order_by: string,
  since: number,
  until: number,
  elements: string[],
};
