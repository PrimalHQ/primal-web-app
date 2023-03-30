import { FeedPage, } from "./types/primal";
import logoFire from './assets/icons/logo_fire.svg';
import logoIce from './assets/icons/logo_ice.svg';
import { MessageDescriptor } from "@cookbook/solid-intl";

export const emptyPage: FeedPage = {
  users: {},
  messages: [],
  postStats: {},
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

export const defaultFeeds = [
  {
    name: 'Nostr highlights by Primal' ,
    hex: '9a500dccc084a138330a1d1b2be0d5e86394624325d25084d3eca164e7ea698a',
    npub: 'npub1nfgqmnxqsjsnsvc2r5djhcx4ap3egcjryhf9ppxnajskfel2dx9qq6mnsp',
  },
  {
    name: 'Edward Snowden\'s feed' ,
    hex: '84dee6e676e5bb67b4ad4e042cf70cbd8681155db535942fcc6a0533858a7240',
    npub: 'npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9',
  },
  {
    name: 'Jack Dorsey\'s feed',
    hex: '82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2',
    npub: 'npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m',
  },
  {
    name: 'Rockstar\'s feed',
    hex: '91c9a5e1a9744114c6fe2d61ae4de82629eaaa0fb52f48288093c7e7e036f832',
    npub: 'npub1j8y6tcdfw3q3f3h794s6un0gyc5742s0k5h5s2yqj0r70cpklqeqjavrvg',
  },
  {
    name: 'Der Gigi\'s feed',
    hex: '6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93',
    npub: 'npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc',
  },
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

  NoteStats = 10000100,
  NetStats = 10000101,
  LegendStats = 10000102,
  UserStats = 10000105,
  Mentions = 10000107,
}
