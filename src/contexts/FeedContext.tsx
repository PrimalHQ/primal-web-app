import { createContext, createEffect, createResource, createSignal, JSX, onCleanup, onMount, untrack, useContext } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import type {
  FeedStore,
  NostrEOSE,
  NostrEvent,
  NostrPostContent,
  NostrStatsContent,
  NostrUserContent,
  NostrWindow,
  PrimalContextStore,
  PrimalFeed,
  PrimalNote,
  PrimalUser,
  TrendingNotesStore,
} from '../types/primal';
import { convertToPosts, getFeed, sortByRecency, sortByScore24h } from "../lib/feed";
import { hexToNpub } from "../lib/keys";
import { initialStore, emptyPage } from "../constants";
import { connect, isConnected, isNotConnected, socket } from "../sockets";
import { getUserProfile } from "../lib/profile";
import { proccessUserProfile, profile, setPublicKey } from "../stores/profile";
import { render, renderToString } from "solid-js/web";
import Avatar from "../components/Avatar/Avatar";
import EmbeddedNote from "../components/EmbeddedNote/EmbeddedNote";
import { parseNote } from "../lib/posts";
import { noteEncode } from "nostr-tools/nip19";
// import { proccessEventContent } from "../stores/home";


export const FeedContext = createContext<PrimalContextStore>();

export const APP_ID = Math.floor(Math.random()*10000000000);

export function FeedProvider(props: { children: number | boolean | Node | JSX.ArrayElement | JSX.FunctionElement | (string & {}) | null | undefined; }) {

  const [data, setData] = createStore<FeedStore>(initialStore);

  const [page, setPage] = createStore(emptyPage);

  const [oldestPost, setOldestPost] = createSignal<PrimalNote | undefined>();

  createEffect(() => {
    const until = oldestPost()?.post.created_at || 0;

    if (until > 0) {
      const pubkey = data?.selectedFeed?.hex;

      if (pubkey) {
        setData('isFetching', true);

        setPage({ messages: [], users: {}, postStats: {} });
        getFeed(pubkey, `user_feed_${APP_ID}`, until);
      }
    }
  });

  const proccessPost = (post: NostrPostContent) => {

    if (oldestPost()?.post.noteId === noteEncode(post.id)) {
      return;
    }

    setPage('messages', (msgs) =>[ ...msgs, post]);
  };

  const proccessUser = (user: NostrUserContent) => {
    setPage('users', (users) => ({ ...users, [user.pubkey]: user}));
  };

  const proccessStat = (stat: NostrStatsContent) => {
    const content = JSON.parse(stat.content);
    setPage('postStats', (stats) => ({ ...stats, [content.event_id]: content }));
  };

  const proccessEventContent = (content: NostrUserContent | NostrPostContent | NostrStatsContent, type: string) => {
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

  const processTrendingPost = (type: string, content: NostrEventContent | undefined) => {

    if (type === 'EOSE') {
      const newPosts = sortByScore24h(convertToPosts({
        users: data.trendingNotes.users,
        messages: data.trendingNotes.messages,
        postStats: data.trendingNotes.postStats,
      }));

      setData('trendingNotes', 'notes', () => [...newPosts]);

      return;
    }

    if (type === 'EVENT') {
      if (content && content.kind === 0) {
        setData('trendingNotes', 'users', (users) => ({ ...users, [content.pubkey]: content}))
      }
      if (content && content.kind === 1) {
        setData('trendingNotes', 'messages',  (msgs) => [ ...msgs, content]);
      }
      if (content && content.kind === 10000100) {
        const stat = JSON.parse(content.content);
        setData('trendingNotes', 'postStats', (stats) => ({ ...stats, [stat.event_id]: stat }))
      }
    }
  };

  // const [publicKey, setPublicKey] = createSignal<string>();

  createEffect(() => {
    if (profile.publicKey) {
      const npub = hexToNpub(profile.publicKey);
      const feed = { name: 'Latest, following', hex: profile.publicKey, npub};

      setData('availableFeeds', () => [ feed, ...initialStore.availableFeeds]);
      setData('selectedFeed', () => ({...feed}));
      setData('publicKey', () => profile.publicKey)

      getUserProfile(profile.publicKey, `user_profile_${APP_ID}`);
    }
  });

  let extensionAttempt = 0;

  const fetchNostrKey = async () => {
    const win = window as NostrWindow;
    const nostr = win.nostr;

    if (nostr === undefined) {
      console.log('No WebLn extension');
      // Try again after one second if extensionAttempts are not exceeded
      if (extensionAttempt < 1) {
        extensionAttempt += 1;
        setTimeout(fetchNostrKey, 1000);
        return;
      }

      setData('selectedFeed', () => ({ ...data.availableFeeds[0] }));
    }

    try {
      const key = await nostr.getPublicKey();

      if (key === undefined) {
        setTimeout(fetchNostrKey, 1000);
      }
      else {
        setPublicKey(key);
      }
    } catch (e: any) {
      if (e.message === 'User rejected') {
        setData('selectedFeed', () => ({ ...data.availableFeeds[0] }));
      }
      console.log('ERROR: ', e);
    }
  }

  // MESSAGE LISTENERS ------------------------------------

  const onError = (error: Event) => {
    console.log("error: ", error);
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `trending_${APP_ID}`) {
      processTrendingPost(type, content);
      return;
    }


    if (subId === `user_profile_${APP_ID}`) {
      content && proccessUserProfile(content);

      // Temporary quick & dirty fix for dissapearing avatar
      if (content) {
        const user = JSON.parse(content.content);

        setData('activeUser', () => ({...user}));
      }
      return;
    }

    if (subId === `user_feed_${APP_ID}`) {
      if (type === 'EOSE') {
        const newPosts = sortByRecency(convertToPosts(page));

        setData('posts', (posts) => [ ...posts, ...newPosts ]);
        setData('isFetching', false);

        return;
      }

      proccessEventContent(content, type);
      return;
    }

  };
  // ------------------------------------------------------

  createEffect(() => {
    if (isConnected()) {
    const pubkey = data?.selectedFeed?.hex;

    setData('posts', () => []);
    setData('scrollTop', () => 0);
    setPage({ messages: [], users: {}, postStats: {} });

    window.scrollTo({
      top: 0,
      left: 0,
      // @ts-expect-error https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/5
      behavior: 'instant',
    });

    pubkey && getFeed(pubkey, `user_feed_${APP_ID}`);}
  });

  createEffect(() => {
    const html: HTMLElement | null = document.querySelector('html');
    localStorage.setItem('theme', data.theme);
    html?.setAttribute('data-theme', data.theme);
  });

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible" && isNotConnected()) {
      connect();
    }
  };

  onMount(() => {
    socket()?.addEventListener('error', onError);
    socket()?.addEventListener('message', onMessage);

    document.addEventListener('visibilitychange', onVisibilityChange);

    setData('theme', localStorage.getItem('theme') || '');

    setTimeout(() => {
      fetchNostrKey();
    }, 1000);
  });

  onCleanup(() => {
    socket()?.removeEventListener('error', onError);
    socket()?.removeEventListener('message', onMessage);
    document.removeEventListener('visibilitychange', onVisibilityChange);

  });

  const store = {
    data: data,
    page: page,
    actions: {
      setData: setData,
      clearExploredNotes: () => {
        setData('exploredNotes', () => []);
      },
      setExploredNotes: (newNotes: PrimalNote[]) => {
        setData('exploredNotes', () => newNotes);
      },
      clearThreadedNotes: () => {
        setData('threadedNotes', () => []);
      },
      setThreadedNotes: (newNotes: PrimalNote[]) => {
        setData('threadedNotes', () => newNotes);
      },
      clearTrendingNotes: () => {
        setData('trendingNotes', () => ({
          messages: [],
          users: {},
          notes: [],
          postStats: {},
        }));
      },
      setTheme: (newTheme: string) => {
        setData('theme', newTheme);
      },
      showNewNoteForm: () => {
        setData('showNewNoteForm', () => true);
      },
      hideNewNoteForm: () => {
        setData('showNewNoteForm', () => false);
      },
      selectFeed(profile: PrimalFeed | undefined) {
        if (profile as PrimalFeed) {
          setData('selectedFeed', () => ({...profile}));
        }
      },
      fetchHomeFeed: () => {
        const pubkey = data?.selectedFeed?.hex;

        if (pubkey) {
          setData('isFetching', true);
          getFeed(pubkey, `user_feed_${APP_ID}`);
        }

      },
      setActiveUser: (user: PrimalUser) => {
        setData('activeUser', () => ({...user}));
      },
      updatedFeedScroll: (scrollTop: number) => {
        setData('scrollTop', () => scrollTop);
      },
      clearData() {
        setData('posts', () => []);
        setOldestPost(undefined);
      },
      loadNextPage() {
        const lastPost = data.posts[data.posts.length - 1];

        setOldestPost(lastPost);
      },
      savePosts(posts: PrimalNote[]) {
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
