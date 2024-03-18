import { ContentModeration, FeedPage, } from "./types/primal";
import logoFire from './assets/icons/logo_fire.svg';
import logoIce from './assets/icons/logo_ice.svg';

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

export const nostrHighlights ='9a500dccc084a138330a1d1b2be0d5e86394624325d25084d3eca164e7ea698a';

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

  Zap = 9735,

  MuteList = 10_000,
  RelayList = 10_002,
  CategorizedPeople = 30_000,

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
  MediaInfo = 10_000_119,
  Upload = 10_000_120,
  Uploaded = 10_000_121,
  Releases = 10_000_124,
  ImportResponse = 10_000_127,
  LinkMetadata = 10_000_128,
  FilteringReason = 10_000_131,
  UserFollowerCounts = 10_000_133,
  SuggestedUsersByCategory = 10_000_134,
  UploadChunk = 10_000_135,
  UserRelays=10_000_139,
}

export const relayConnectingTimeout = 1000;

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

export const usernameRegex = /^[a-zA-Z0-9\-\_]+$/;
// export const odyseeRegex = /odysee\.com\/([a-zA-Z0-9]+)/;
// export const magnetRegex = /(magnet:[\S]+)/i;
// export const tweetUrlRegex = /https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/;
// export const tidalRegex = /tidal\.com\/(?:browse\/)?(\w+)\/([a-z0-9-]+)/i;
export const spotifyRegex = /open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/;
export const twitchRegex = /twitch.tv\/([a-z0-9_]+$)/i;
export const mixCloudRegex = /mixcloud\.com\/(?!live)([a-zA-Z0-9]+)\/([a-zA-Z0-9-]+)/;
export const soundCloudRegex = /soundcloud\.com\/(?!live)([a-zA-Z0-9]+)\/([a-zA-Z0-9-]+)/;
export const appleMusicRegex = /music\.apple\.com\/([a-z]{2}\/)?(?:album|playlist)\/[\w\d-]+\/([.a-zA-Z0-9-]+)(?:\?i=\d+)?/i;
export const nostrNestsRegex = /nostrnests\.com\/[a-zA-Z0-9]+/i;
export const wavlakeRegex = /https?:\/\/(?:player\.|www\.)?wavlake\.com\/(?!top|new|artists|account|activity|login|preferences|feed|profile)(?:(?:track|album)\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}|[a-z-]+)/i;
export const youtubeRegex = /(?:https?:\/\/)?(?:www|m\.)?(?:youtu\.be\/|youtube\.com\/(?:live\/|shorts\/|embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/;
export const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9\u00F0-\u02AF@:%._\+~#=]{1,256}\.[a-zA-Z0-9\u00F0-\u02AF()]{1,8}\b([-a-zA-Z0-9\u00F0-\u02AF()@:%_\+.~#?&//=]*)/i;
export const urlRegexG = /https?:\/\/(www\.)?[-a-zA-Z0-9\u00F0-\u02AF@:%._\+~#=]{1,256}\.[a-zA-Z0-9\u00F0-\u02AF()]{1,8}\b([-a-zA-Z0-9\u00F0-\u02AF()@:%_\+.~#?&//=]*)/ig;
export const urlExtractRegex = /https?:\/\/\S+\.[^()]+(?:\([^)]*\))*/;
export const interpunctionRegex = /^(\.|,|;|\?|\!)$/;
export const emojiRegex = /(?:\s|^)\:\w+\:/;

export const hashtagRegex = /(?:\s|^)#[^\s!@#$%^&*(),.?":{}|<>]+/i;
export const linebreakRegex = /(\r\n|\r|\n)/ig;
export const tagMentionRegex = /\#\[([0-9]*)\]/;
export const noteRegex = /nostr:((note|nevent)1\w+)\b/g;
export const noteRegexLocal = /nostr:((note|nevent)1\w+)\b/;
export const profileRegex = /nostr:((npub|nprofile)1\w+)\b/;
export const profileRegexG = /nostr:((npub|nprofile)1\w+)\b/g;
export const editMentionRegex = /(?:\s|^)@\`(.*?)\`/ig;

export const specialCharsRegex = /[^A-Za-z0-9]/;
export const hashtagCharsRegex = /[^A-Za-z0-9\-\_]/;

// How long, in words, should a short note be
export const shortNoteWords = 200;

// How long we would assume mentioned will be for purposes of shortening the note
export const shortMentionInWords = 99;

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

export const emojiSearchLimit = 0;

export const today = (new Date()).getTime();

// Downloads page info --------------------
// iOS
export const iosRD = (new Date('12/19/2023')).getTime();
export const iosVersion = '1.1.10';
export const appStoreLink = 'https://apps.apple.com/us/app/primal/id1673134518';

// Android
export const andRD = (new Date('02/02/2024')).getTime();
export const andVersion = '0.91.2';
export const playstoreLink = 'https://play.google.com/store/apps/details?id=net.primal.android';
export const apkLink = `https://github.com/PrimalHQ/primal-android-app/releases/tag/${andVersion}`;

// ----------------------------------------

export const defaultZap = { "amount": 42, "message": "Onward 🫡" };

export const defaultZapOptions = [
  { emoji: '👍', amount: 21, message: 'Great post 👍' },
  { emoji: '🚀', amount: 420, message: 'Let\'s go 🚀' },
  { emoji: '☕', amount: 1_000, message: 'Coffie on me ☕' },
  { emoji: '🍻', amount: 5_000, message: 'Cheers 🍻' },
  { emoji: '🍷', amount: 10_000, message: 'Party time 🍷' },
  { emoji: '👑', amount: 100_000, message: 'Generational wealth 👑' },
];

export const contentScope = 'content';
export const trendingScope = 'trending';

export const spamContentModeration = {
  name: 'primal_spam',
  scopes: [contentScope, trendingScope],
};
export const nsfwContentModeration = {
  name: 'primal_nsfw',
  scopes: [trendingScope],
};

export const defaultContentModeration: ContentModeration[] = [
  spamContentModeration,
  nsfwContentModeration,
];

export const algoNpub ='npub1tkpg9lyfgy83c4mgrgkrhzl90t732ekzvt73m6658xva88g5rj6qy6ntw4';

export const specialAlgos = ['primal_spam', 'primal_nsfw'];

export const profileContactListPage = 50;

export const pinEncodePrefix = 'prpec';
export const pinEncodeIVSeparator = '?iv=';

export const suggestedUsersToFollow = [
  "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2", //jack
  "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d", //fiatjaf
  "e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411", //nvk
  "fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52", //pablof7z
  "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245", //jb55
  "6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93", //gigi
  "04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9", //odell
  "472f440f29ef996e92a186b8d320ff180c855903882e59d50de1b8bd5669301e", //marty bent
  "76c71aae3a491f1d9eec47cba17e229cda4113a0bbb6e6ae1776d7643e29cafa", //rabble
  "eab0e756d32b80bcd464f3d844b8040303075a13eabc3599a762c9ac7ab91f4f", //lyn alden
  "85080d3bad70ccdcd7f74c29a44f55bb85cbcd3dd0cbb957da1d215bdb931204", //preston pysh
  "83e818dfbeccea56b0f551576b3fd39a7a50e1d8159343500368fa085ccd964b", //jeff booth
  "1b11ed41e815234599a52050a6a40c79bdd3bfa3d65e5d4a2c8d626698835d6d", //andre
  "91c9a5e1a9744114c6fe2d61ae4de82629eaaa0fb52f48288093c7e7e036f832", //rockstar
  "b0b8fbd9578ac23e782d97a32b7b3a72cda0760761359bd65661d42752b4090a", //guy swann
  "3fc5f8553abd753ac47967c4c468cfd08e8cb9dee71b79e12d5adab205bc04d3", //max
  "b708f7392f588406212c3882e7b3bc0d9b08d62f95fa170d099127ece2770e5e", //dk
  "7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194", //verbiricha
  "460c25e682fda7832b52d1f22d3d22b3176d972f60dcdc3212ed8c92ef85065c", //vitor
  "ee11a5dff40c19a555f41fe42b48f00e618c91225622ae37b6c2bb67b76c4e49", //Michael Dilger
  "00000000827ffaa94bfea288c3dfce4422c794fbb96625b6b31e9049f729d700", //cameri
  "3f770d65d3a764a9c5cb503ae123e62ec7598ad035d836e2a810f3877a745b24", //derek ross
  "eda6845cc2269bea10f010744ad79409acb7129d96857d4bf19e027696299292", //brianna
  "d61f3bc5b3eb4400efdae6169a5c17cabf3246b514361de939ce4a1a0da6ef4a", //miljan
];

// Messages separated by more than this will not be grouped in the same thread
export const threadLenghtInMs = 900;

export const uploadLimit = {
  regular: 100,
  premium: 1024,
}
