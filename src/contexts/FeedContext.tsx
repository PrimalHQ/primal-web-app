import { createContext, createEffect, createResource, createSignal, JSX, onCleanup, onMount, untrack, useContext } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import type {
  FeedPage,
  FeedStore,
  NostrEOSE,
  NostrEvent,
  NostrPostContent,
  NostrStatsContent,
  NostrUserContent,
  NostrWindow,
  PrimalContextStore,
  PrimalFeed,
  PrimalPost,
} from '../types/primal';
import { isConnected, socket } from "../sockets";
import { convertToPosts, getFeed } from "../lib/feed";

const emptyPage: FeedPage = {
  users: {},
  messages: [],
  postStats: {},
}

const initialStore: FeedStore = {
  posts: [],
  selectedFeed: {
    name: 'snowden',
    hex: '84dee6e676e5bb67b4ad4e042cf70cbd8681155db535942fcc6a0533858a7240',
    npub: 'npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9',
  },
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
      name: 'miljan',
      hex: 'd61f3bc5b3eb4400efdae6169a5c17cabf3246b514361de939ce4a1a0da6ef4a',
      npub: 'npub16c0nh3dnadzqpm76uctf5hqhe2lny344zsmpm6feee9p5rdxaa9q586nvr',
    },
  ],
};

export const FeedContext = createContext<PrimalContextStore>();

export function FeedProvider(props: { children: number | boolean | Node | JSX.ArrayElement | JSX.FunctionElement | (string & {}) | null | undefined; }) {

  const [data, setData] = createStore<FeedStore>(initialStore);

  const [page, setPage] = createStore(emptyPage);

  const [oldestPost, setOldestPost] = createSignal<PrimalPost | undefined>();

  const randomNumber = Math.floor(Math.random()*10000000000);
  const subid = String(randomNumber);

  createEffect(() => {
    const until = oldestPost()?.post.created_at || 0;

    if (until > 0) {
      const pubkey = data?.selectedFeed?.hex;

      pubkey && getFeed(pubkey, subid, until);
    }
  });

  const proccessPost = (post: NostrPostContent) => {
    if (oldestPost()?.post.id === post.id) {
      return;
    }

    setPage('messages', [ ...page.messages, post]);
  };

  const proccessUser = (user: NostrUserContent) => {
    setPage('users', { ...page.users, [user.pubkey]: user})
  };

  const proccessStat = (stat: NostrStatsContent) => {
    const content = JSON.parse(stat.content);
    setPage('postStats', { ...page.postStats, [content.event_id]: content })
  };

  // const onError = (error: Event) => {
  //   console.log("error: ", error);
  // };

  // const onMessage = (event: MessageEvent) => {
  //   console.log('FEED Message');
  //   const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

  //   const [type, subkey, content] = message;

  //   if (type === 'EOSE') {
  //     const newPosts = convertToPosts(page);

  //     setPage({ messages: [], users: {}, postStats: {} });

  //     setData('posts', [ ...data.posts, ...newPosts ]);
  //     return;
  //   }

  //   if (type === 'EVENT') {
  //     if (content.kind === 0) {
  //       proccessUser(content);
  //     }
  //     if (content.kind === 1) {
  //       proccessPost(content);
  //     }
  //     if (content.kind === 10000100) {
  //       proccessStat(content);
  //     }
  //   }

  // };

  const fetchNostrKey = async () => {
    const win = window as NostrWindow;
    const nostr = win.nostr;

    if (nostr === undefined) {
      console.log('No WebLn extension');
      setTimeout(fetchNostrKey, 1000);
    }

    try {
      const key = await nostr.getPublicKey();

      if (key === undefined) {
        setTimeout(fetchNostrKey, 1000);
      }
      else {
        const feed = { name: 'my feed', hex: key, npub: ''};
        setData('availableFeeds', feeds => [...feeds, feed]);
      }
    } catch (e) {
      console.log('ERROR: ', e);
    }
  }

  onMount(() => {
    fetchNostrKey();
  });

  // createEffect(() => {
  //   socket()?.addEventListener('error', onError);

  //   socket()?.addEventListener('message', onMessage);
  // });

	// createEffect(() => {
  //   if (isConnected()) {
  //     const pubkey = data?.selectedFeed?.hex || '';

  //     getFeed(pubkey, subid);
	// 	}
	// });

  // onCleanup(() => {
  //   socket()?.removeEventListener('error', onError);
  //   socket()?.removeEventListener('message', onMessage);
  // });

  const store = {
    data: data,
    page: page,
    actions: {
      selectFeed(profile: PrimalFeed | undefined) {
        if (profile as PrimalFeed) {
          setData('selectedFeed', profile);
        }
      },
      clearData() {
        setData({ posts: []});
      },
      loadNextPage() {
        const lastPost = data.posts[data.posts.length - 1];

        setOldestPost(lastPost);
      },
      savePosts(posts: PrimalPost[]) {
        setData('posts', [ ...data.posts, ...posts ]);
      },
      clearPage() {
        setPage({ messages: [], users: {}, postStats: {} });
      },
      proccessEventContent(content: NostrUserContent | NostrPostContent | NostrStatsContent, type: string) {
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
      },
    }
  };

  return (
    <FeedContext.Provider value={store}>
      {props.children}
    </FeedContext.Provider>
  );
}

export function useFeedContext() { return useContext(FeedContext); }
