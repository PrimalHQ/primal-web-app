import { FeedPage, FeedStore } from "./types/primal";

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
    name: 'Der Gigi\'s feed',
    hex: '6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93',
    npub: 'npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc',
  }
];

export const initialStore: FeedStore = {
  posts: [],
  isFetching: false,
  scrollTop: 0,
  publicKey: '',
  activeUser: undefined,
  selectedFeed: undefined,
  showNewNoteForm: false,
  theme: localStorage.getItem('theme') || '',
  trendingNotes: {
    messages: [],
    users: {},
    notes: [],
    postStats: {},
  },
  zappedNotes: {
    messages: [],
    users: {},
    notes: [],
    postStats: {},
  },
  exploredNotes: [],
  threadedNotes: [],
  availableFeeds: [
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
      name: 'Der Gigi\'s feed',
      hex: '6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93',
      npub: 'npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc',
    },
    // {
    //   name: 'saylors\' feed',
    //   hex: 'a341f45ff9758f570a21b000c17d4e53a3a497c8397f26c0e6d61e5acffc7a98',
    //   npub: 'npub15dqlghlewk84wz3pkqqvzl2w2w36f97g89ljds8x6c094nlu02vqjllm5m',
    // },
    // {
    //   name: 'ODELL\'s feed',
    //   hex: '04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9',
    //   npub: 'npub1qny3tkh0acurzla8x3zy4nhrjz5zd8l9sy9jys09umwng00manysew95gx',
    // },
    // {
    //   name: 'preston\'s feed',
    //   hex: '85080d3bad70ccdcd7f74c29a44f55bb85cbcd3dd0cbb957da1d215bdb931204',
    //   npub: 'npub1s5yq6wadwrxde4lhfs56gn64hwzuhnfa6r9mj476r5s4hkunzgzqrs6q7z',
    // },
    // {
    //   name: 'NVK\'s feed',
    //   hex: 'e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411',
    //   npub: 'npub1az9xj85cmxv8e9j9y80lvqp97crsqdu2fpu3srwthd99qfu9qsgstam8y8',
    // },
  ],
};


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
