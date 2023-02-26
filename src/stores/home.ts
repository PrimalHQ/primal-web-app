import { createStore, SetStoreFunction } from "solid-js/store";
import { emptyPage } from "../constants";
import { hexToNpub } from "../lib/keys";
import {FeedPage, NostrEventContent, NostrPostContent, NostrStatsContent, NostrUserContent, PrimalFeed, PrimalNote, PrimalUser } from "../types/primal";


export type FeedStore2 = {
  notes: PrimalNote[],
  isFetching: boolean,
  scrollTop: number,
  selectedFeed: PrimalFeed | undefined,
  selectedFeedChanged: boolean,
  oldestNote: PrimalNote | undefined,
  page: FeedPage,
  availableFeeds: PrimalFeed[],
};

export const initialStore: FeedStore2 = {
  notes: [],
  isFetching: false,
  scrollTop: 0,
  selectedFeed: undefined,
  selectedFeedChanged: true,
  oldestNote: undefined,
  page: emptyPage,
  availableFeeds: [
    {
      name: 'snowden' ,
      hex: '84dee6e676e5bb67b4ad4e042cf70cbd8681155db535942fcc6a0533858a7240',
      npub: 'npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9',
    },{
      name: 'jack',
      hex: '82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2',
      npub: 'npub1sg6plzptd64u62a878hep2kev88swjh3tw00gjsfl8f237lmu63q0uf63m',
    },{
      name: 'saylor',
      hex: 'a341f45ff9758f570a21b000c17d4e53a3a497c8397f26c0e6d61e5acffc7a98',
      npub: 'npub15dqlghlewk84wz3pkqqvzl2w2w36f97g89ljds8x6c094nlu02vqjllm5m',
    },{
      name: 'dergigi',
      hex: '6e468422dfb74a5738702a8823b9b28168abab8655faacb6853cd0ee15deee93',
      npub: 'npub1dergggklka99wwrs92yz8wdjs952h2ux2ha2ed598ngwu9w7a6fsh9xzpc',
    },{
      name: 'ODELL',
      hex: '04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9',
      npub: 'npub1qny3tkh0acurzla8x3zy4nhrjz5zd8l9sy9jys09umwng00manysew95gx',
    },{
      name: 'preston',
      hex: '85080d3bad70ccdcd7f74c29a44f55bb85cbcd3dd0cbb957da1d215bdb931204',
      npub: 'npub1s5yq6wadwrxde4lhfs56gn64hwzuhnfa6r9mj476r5s4hkunzgzqrs6q7z',
    },{
      name: 'NVK',
      hex: 'e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411',
      npub: 'npub1az9xj85cmxv8e9j9y80lvqp97crsqdu2fpu3srwthd99qfu9qsgstam8y8',
    },
  ],
};

// Processing
// TODO: Move to it's own file

const proccessPost = (post: NostrPostContent) => {
  if (homeFeed.oldestNote?.post?.id === post.id) {
    return;
  }

  setHomeFeed(
    'page',
    'messages',
    (msgs) => [ ...msgs, post],
  );
};

const proccessUser = (user: NostrUserContent) => {
  setHomeFeed(
    'page',
    'users',
    (users) => ({ ...users, [user.pubkey]: user}),
  );
};

const proccessStat = (stat: NostrStatsContent) => {
  const content = JSON.parse(stat.content);

  setHomeFeed(
    'page',
    'postStats',
    (stats) => ({ ...stats, [content.event_id]: content }),
  );
};

// ---------------------------------------------------------

export const [homeFeed, setHomeFeed] = createStore(initialStore);

export const selectFeed = (feed: PrimalFeed | undefined) => {
  // if (feed?.hex === homeFeed.selectedFeed?.hex) {
  //   homeFeed.selectedFeedChanged && setHomeFeed('selectedFeedChanged', () => false);
  //   return;
  // }

  setHomeFeed('selectedFeed', () => ({ ...feed }));

};

export const resetSelectedFeed = () => {
  const defaultFeed = homeFeed.availableFeeds[0];
  selectFeed(defaultFeed);
}

export const clearFeed = () => {
  setHomeFeed('notes', () => []);
};

export const loadNextPage = () => {
  const lastPost = homeFeed.notes[homeFeed.notes.length - 1];

  setHomeFeed('oldestNote', () => ({ ...lastPost }));
};

export const addNotes = (newNotes: PrimalNote[]) => {
  setHomeFeed('notes', (notes) => [ ...notes, ...newNotes ]);
  setHomeFeed('isFetching', false);
};

export const replaceNotes = (newNotes: PrimalNote[]) => {
  setHomeFeed('notes', () => [...newNotes ]);
  setHomeFeed('isFetching', false);
};

export const clearPage = () => {
  setHomeFeed('page', () => ({ ...emptyPage }));
};

export const proccessEventContent = (
  content: NostrEventContent,
  type: string
) => {
  if (type === 'EVENT') {
    if (content.kind === 0) {
      proccessUser(content);
    }
    if (content.kind === 1) {
      proccessPost(content);
    }
    if (content.kind === 10000100) {
      proccessStat(content);
    }
  }
};

export const updateScroll = (scrollTop: number) => {
  setHomeFeed('scrollTop', () => scrollTop);
}

export const resetScroll = () => {
  setHomeFeed('scrollTop', () => 0);

  window.scrollTo({
    top: 0,
    left: 0,
    // @ts-expect-error https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/5
    behavior: 'instant',
  });
}

export const addMyFeed = (hex: string) => {
  const npub = hexToNpub(hex);
  const feed = { name: 'Latest, following', hex, npub};

  setHomeFeed('availableFeeds', () => ([ feed, ...initialStore.availableFeeds]));
  selectFeed(feed);
};

export type HomeFeedStore = {
  data: FeedStore2,
  setHomeFeed: SetStoreFunction<FeedStore2>,
  selectFeed: (feed: PrimalFeed | undefined) => void,
  resetSelectedFeed: () => void,
  clearFeed: () => void,
  addMyFeed: (hex: string) => void,
  loadNextPage: () => void,
  clearPage: () => void,
  addNotes: (newNotes: PrimalNote[]) => void,
  replaceNotes: (newNotes: PrimalNote[]) => void,
  proccessEventContent: (
    content: NostrEventContent,
    type: string,
  ) => void,
  updateScroll: (scrollTop: number) => void,
  resetScroll: () => void,
};


export default {
  data: homeFeed,
  setHomeFeed,
  selectFeed,
  resetSelectedFeed,
  clearFeed,
  addMyFeed,
  loadNextPage,
  clearPage,
  addNotes,
  replaceNotes,
  proccessEventContent,
  updateScroll,
  resetScroll,
};
