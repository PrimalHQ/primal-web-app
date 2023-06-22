import { FeedPage, } from "./types/primal";
import logoFire from './assets/icons/logo_fire.svg';
import logoIce from './assets/icons/logo_ice.svg';
import { MessageDescriptor } from "@cookbook/solid-intl";

export const second = 1000;
export const minute = 60 * second;
export const hour = 60 * minute;
export const day = 24 * hour;
export const week = 7 * day;

export const emptyPage: FeedPage = {
  users: {},
  messages: [],
  postStats: {},
  noteActions: {},
}

export const trendingFeed = {
  name: 'Trending, my network',
  hex: 'network;trending',
  npub: 'trending;network',
};

export const themes = [
  {
    name: 'sunset',
    label: 'sunset wave',
    logo: logoFire,
    dark: true,
  },
  {
    name: 'sunrise',
    label: 'sunrise wave',
    logo: logoFire,
  },
  {
    name: 'midnight',
    label: 'midnight wave',
    logo: logoIce,
    dark: true,
  },
  {
    name:  'ice',
    label: 'ice wave',
    logo: logoIce,
  },
];

export const minKnownProfiles: {"names": Record<string,string>} = {
  "names": {
    "miljan": "d61f3bc5b3eb4400efdae6169a5c17cabf3246b514361de939ce4a1a0da6ef4a",
    "marko": "123afae7d187ba36d6ddcd97dbf4acc59aeffe243f782592ff8f25ed579df306",
    "essguess": "0b13870379cf18ae6b6d516d9f0833e0273c7a6758652a698e11f04c9c1a0d29",
    "pr": "dd9b989dfe5e0840a92538f3e9f84f674e5f17ab05932efbacb4d8e6c905f302",
    "marija": "b8a518a60fab9f3969b62238860f4643003b6437b75d60860dd8de34fb21c931",
    "moysie": "2a55ed52ed31f85f8bdef3bdd165aa74265d82c952193d7b76fb4c76cccc4231",
    "nikola": "97b988fbf4f8880493f925711e1bd806617b508fd3d28312288507e42f8a3368",
    "princfilip": "29c07b40860f06df7c1ada6af2cc6b4c541b76a720542d7ee645c20c9452ffd2",
    "highlights": "9a500dccc084a138330a1d1b2be0d5e86394624325d25084d3eca164e7ea698a",
    "primal": "532d830dffe09c13e75e8b145c825718fc12b0003f61d61e9077721c7fff93cb",
    "andi": "5fd8c6a375c431729a3b78e2080ffff0a1dc63f52e2a868a801151190a31f955",
    "rockstar": "91c9a5e1a9744114c6fe2d61ae4de82629eaaa0fb52f48288093c7e7e036f832",
    "qa": "88cc134b1a65f54ef48acc1df3665063d3ea45f04eab8af4646e561c5ae99079",
    "jack": "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2",
  }
};

export const defaultFeeds = [
];

export const timeframeLabels: Record<string, string> = {
  latest: 'latest',
  trending: 'trending',
  popular: 'popular',
  mostzapped: 'most zapped',
};

export const scopeLabels: Record<string, string> = {
  follows: 'my follows',
  tribe: 'my tribe',
  network: 'my network',
  global: 'global'
};


export const timeframeDescriptors: Record<string, MessageDescriptor> = {
  latest: {
    id: 'explore.timeframes.latest.caption',
    defaultMessage: 'latest',
    description: 'Caption for the latest timeframe',
  },
  trending: {
    id: 'explore.timeframes.trending.caption',
    defaultMessage: 'trending',
    description: 'Caption for the trending timeframe',
  },
  popular: {
    id: 'explore.timeframes.popular.caption',
    defaultMessage: 'popular',
    description: 'Caption for the popular timeframe',
  },
  mostzapped: {
    id: 'explore.timeframes.mostzapped.caption',
    defaultMessage: 'zapped',
    description: 'Caption for the mostzapped timeframe',
  },
};

export type ScopeDescriptor = {
  caption: MessageDescriptor,
  label: MessageDescriptor,
  description: MessageDescriptor,
}

export const scopeDescriptors: Record<string, ScopeDescriptor> = {
  follows: {
    caption: {
      id: 'explore.scopes.follows.caption',
      defaultMessage: 'Follows',
      description: 'Caption for the follows scope',
    },
    label: {
      id: 'explore.scopes.follows.label',
      defaultMessage: 'my follows',
      description: 'Label for the follows scope',
    },
    description: {
      id: 'explore.scopes.follows.description',
      defaultMessage: 'accounts you follow',
      description: 'Description of the follows scope description',
    },
  },
  tribe: {
    caption: {
      id: 'explore.scopes.tribe.caption',
      defaultMessage: 'Tribe',
      description: 'Caption for the tribe scope',
    },
    label: {
      id: 'explore.scopes.tribe.label',
      defaultMessage: 'my tribe',
      description: 'Label for the tribe scope',
    },
    description: {
      id: 'explore.scopes.tribe.description',
      defaultMessage: 'accounts you follow + your followers',
      description: 'Description of the tribe scope description',
    },
  },
  network: {
    caption: {
      id: 'explore.scopes.network.caption',
      defaultMessage: 'Network',
      description: 'Caption for the network scope',
    },
    label: {
      id: 'explore.scopes.network.label',
      defaultMessage: 'my network',
      description: 'Label for the network scope',
    },
    description: {
      id: 'explore.scopes.network.description',
      defaultMessage: 'accounts you follow + everyone they follow',
      description: 'Description of the network scope description',
    },
  },
  global: {
    caption: {
      id: 'explore.scopes.global.caption',
      defaultMessage: 'Global',
      description: 'Caption for the global scope',
    },
    label: {
      id: 'explore.scopes.global.label',
      defaultMessage: 'global',
      description: 'Label for the global scope',
    },
    description: {
      id: 'explore.scopes.global.description',
      defaultMessage: 'all accounts on nostr',
      description: 'Description of the global scope description',
    },
  },
};

export const noKey = 'no-key';

export enum Kind  {
  Metadata = 0,
  Text = 1,
  RecommendRelay = 2,
  Contacts = 3,
  EncryptedDirectMessage = 4,
  EventDeletion = 5,
  Repost = 6,
  Reaction = 7,
  ChannelCreation = 40,
  ChannelMetadata = 41,
  ChannelMessage = 42,
  ChannelHideMessage = 43,
  ChannelMuteUser = 44,

  Settings = 30_078,

  ACK = 10_000_098,
  NoteStats = 10_000_100,
  NetStats = 10_000_101,
  LegendStats = 10_000_102,
  UserStats = 10_000_105,
  OldestEvent = 10_000_106,
  Mentions = 10_000_107,
  UserScore = 10_000_108,
  Notification = 10_000_110,
  Timestamp = 10_000_111,
  NotificationStats = 10_000_112,
  FeedRange = 10_000_113,
  NoteActions = 10_000_115,
  MessageStats = 10_000_117,
  MesagePerSenderStats = 10_000_118,
}

export const relayConnectingTimeout = 5000;

export enum NotificationType {
  NEW_USER_FOLLOWED_YOU = 1,//
  USER_UNFOLLOWED_YOU = 2,//

  YOUR_POST_WAS_ZAPPED = 3,//
  YOUR_POST_WAS_LIKED = 4,//
  YOUR_POST_WAS_REPOSTED = 5,//
  YOUR_POST_WAS_REPLIED_TO = 6,//
  YOU_WERE_MENTIONED_IN_POST = 7,//
  YOUR_POST_WAS_MENTIONED_IN_POST = 8,//

  POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED = 101,//
  POST_YOU_WERE_MENTIONED_IN_WAS_LIKED = 102,//
  POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED = 103,
  POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO = 104,

  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED = 201,
  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED = 202,//
  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED = 203,
  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO = 204,
};

export const typeIcons: Record<string, string> = {
  [NotificationType.NEW_USER_FOLLOWED_YOU]: 'user_followed.svg',
  [NotificationType.USER_UNFOLLOWED_YOU]: 'user_unfollowed.svg',

  [NotificationType.YOUR_POST_WAS_ZAPPED]: 'post_zapped.svg',
  [NotificationType.YOUR_POST_WAS_LIKED]: 'post_liked.svg',
  [NotificationType.YOUR_POST_WAS_REPOSTED]: 'post_reposted.svg',
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: 'post_replied.svg',

  [NotificationType.YOU_WERE_MENTIONED_IN_POST]: 'mention.svg',
  [NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST]: 'mentioned_post.svg',

  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED]: 'mention_zapped.svg',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED]: 'mention_liked.svg',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED]: 'mention_reposted.svg',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO]: 'mention_replied.svg',

  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED]: 'mentioned_post_zapped.svg',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED]: 'mentioned_post_liked.svg',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED]: 'mentioned_post_reposted.svg',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO]: 'mentioned_post_replied.svg',

}

export const notificationTypeUserProps: Record<string, string> = {
  [NotificationType.NEW_USER_FOLLOWED_YOU]: 'follower',
  [NotificationType.USER_UNFOLLOWED_YOU]: 'follower',

  [NotificationType.YOUR_POST_WAS_ZAPPED]: 'who_zapped_it',
  [NotificationType.YOUR_POST_WAS_LIKED]: 'who_liked_it',
  [NotificationType.YOUR_POST_WAS_REPOSTED]: 'who_reposted_it',
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: 'who_replied_to_it',

  [NotificationType.YOU_WERE_MENTIONED_IN_POST]: 'you_were_mentioned_in',
  [NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST]: 'your_post_were_mentioned_in',

  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED]: 'who_zapped_it',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED]: 'who_liked_it',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED]: 'who_reposted_it',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO]: 'who_replied_to_it',

  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED]: 'who_zapped_it',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED]: 'who_liked_it',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED]: 'who_reposted_it',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO]: 'who_replied_to_it',

}

export const notificationTypeNoteProps: Record<string, string> = {
  // [NotificationType.NEW_USER_FOLLOWED_YOU]: 'follower',
  // [NotificationType.USER_UNFOLLOWED_YOU]: 'follower',

  [NotificationType.YOUR_POST_WAS_ZAPPED]: 'your_post',
  [NotificationType.YOUR_POST_WAS_LIKED]: 'your_post',
  [NotificationType.YOUR_POST_WAS_REPOSTED]: 'your_post',
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: 'reply',

  [NotificationType.YOU_WERE_MENTIONED_IN_POST]: 'you_were_mentioned_in',
  [NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST]: 'your_post_were_mentioned_in',

  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED]: 'post_you_were_mentioned_in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED]: 'post_you_were_mentioned_in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED]: 'post_you_were_mentioned_in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO]: 'reply',

  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED]: 'your_post_were_mentioned_in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED]: 'your_post_were_mentioned_in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED]: 'your_post_were_mentioned_in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO]: 'reply',

}



export const notificationTypeTranslations: Record<string, string> = {
  [NotificationType.NEW_USER_FOLLOWED_YOU]: 'followed you',
  [NotificationType.USER_UNFOLLOWED_YOU]: 'unfollowed you',

  [NotificationType.YOUR_POST_WAS_ZAPPED]: 'zapped your post',
  [NotificationType.YOUR_POST_WAS_LIKED]: 'liked your post',
  [NotificationType.YOUR_POST_WAS_REPOSTED]: 'reposted your post',
  [NotificationType.YOUR_POST_WAS_REPLIED_TO]: 'replied to your post',

  [NotificationType.YOU_WERE_MENTIONED_IN_POST]: 'mentioned you in a post',
  [NotificationType.YOUR_POST_WAS_MENTIONED_IN_POST]: 'mentioned your post',

  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED]: 'zapped a post you were mentioned in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_LIKED]: 'liked a post you were mentioned in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED]: 'reposted a post you were mentioned in',
  [NotificationType.POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO]: 'replied to a post you were mentioned in',

  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED]: 'zapped a post your post was mentioned in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED]: 'liked a post your post was mentioned in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED]: 'reposted a post your post was mentioned in',
  [NotificationType.POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO]: 'replied to a post your post was mentioned in',

}


export const noteRegex = /nostr:((note|nevent)1\w+)\b|#\[(\d+)\]/g;
export const profileRegex = /nostr:((npub|nprofile)1\w+)\b|#\[(\d+)\]/g;
export const editMentionRegex = /(?:\s|^)@\`(.*?)\`/ig;

export const medZapLimit = 1000;


export const defaultNotificationSettings: Record<string, boolean> = {
  NEW_USER_FOLLOWED_YOU: true,
  USER_UNFOLLOWED_YOU: true,

  YOUR_POST_WAS_ZAPPED: true,
  YOUR_POST_WAS_LIKED: true,
  YOUR_POST_WAS_REPOSTED: true,
  YOUR_POST_WAS_REPLIED_TO: true,

  YOU_WERE_MENTIONED_IN_POST: true,
  YOUR_POST_WAS_MENTIONED_IN_POST: true,

  POST_YOU_WERE_MENTIONED_IN_WAS_ZAPPED: true,
  POST_YOU_WERE_MENTIONED_IN_WAS_LIKED: true,
  POST_YOU_WERE_MENTIONED_IN_WAS_REPOSTED: true,
  POST_YOU_WERE_MENTIONED_IN_WAS_REPLIED_TO: true,

  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_ZAPPED: true,
  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_LIKED: true,
  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPOSTED: true,
  POST_YOUR_POST_WAS_MENTIONED_IN_WAS_REPLIED_TO: true,
};

export const noRelayConnectedMessage = {
  id: 'toast.noRelays',
  defaultMessage: '"We are trying to connect to your relays. Please try again in a few moments.',
  description: 'Toast message indicating user is not connected to aany relay',
};

export const noRelaysMessage = {
  id: 'toast.noRelays',
  defaultMessage: 'You need to declare at least one relay to perform this action',
  description: 'Toast message indicating user has no relays configured',
};
