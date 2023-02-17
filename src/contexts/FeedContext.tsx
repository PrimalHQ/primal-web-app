import { createContext, createEffect, createResource, createSignal, JSX, onCleanup, onMount, untrack, useContext } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import type {
  FeedStore,
  NostrPostContent,
  NostrStatsContent,
  NostrUserContent,
  NostrWindow,
  PrimalContextStore,
  PrimalFeed,
  PrimalPost,
} from '../types/primal';
import { getFeed } from "../lib/feed";
import { hexToNpub } from "../lib/keys";
import { initialStore, emptyPage } from "../constants";
import { isConnected } from "../sockets";


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

      if (pubkey) {
        setData('isFetching', true);
        getFeed(pubkey, subid, until);
      }
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

  const [publicKey, setPublicKey] = createSignal<string>();

  createEffect(() => {
    if (publicKey()) {
      const npub = hexToNpub(publicKey() as string);
      const feed = { name: 'my feed', hex: publicKey(), npub};


      setData('availableFeeds', feeds => [...feeds, feed]);
      setData('selectedFeed', () => ({...feed}));
      setData('publicKey', () => publicKey())
    }
  });

  const fetchNostrKey = async () => {
    const win = window as NostrWindow;
    const nostr = win.nostr;

    if (nostr === undefined) {
      console.log('No WebLn extension');
      setTimeout(fetchNostrKey, 1000);
      return;
    }

    try {
      const key = await nostr.getPublicKey();

      if (key === undefined) {
        setTimeout(fetchNostrKey, 1000);
      }
      else {
        setPublicKey(key);
      }
    } catch (e) {
      if (e.message === 'User rejected') {
        setData('selectedFeed', data.availableFeeds[0]);
      }
      console.log('ERROR: ', e);
    }
  }

  createEffect(() => {
    if (isConnected()) {
    const pubkey = data?.selectedFeed?.hex || '';

    setData('posts', () => []);
    setData('scrollTop', () => 0);

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant',
    });

    getFeed(pubkey, subid);}
  });

  onMount(() => {
    setTimeout(() => {
      fetchNostrKey();
    }, 1000);
  });

  const store = {
    data: data,
    page: page,
    actions: {
      selectFeed(profile: PrimalFeed | undefined) {
        if (profile as PrimalFeed) {
          setData('selectedFeed', () => ({...profile}));
        }
      },
      updatedFeedScroll: (scrollTop: number) => {
        setData('scrollTop', () => scrollTop);
      },
      clearData() {
        setData('posts', () => []);
      },
      loadNextPage() {
        const lastPost = data.posts[data.posts.length - 1];

        setOldestPost(lastPost);
      },
      savePosts(posts: PrimalPost[]) {
        setData('posts', [ ...data.posts, ...posts ]);
        setData('isFetching', false);
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
