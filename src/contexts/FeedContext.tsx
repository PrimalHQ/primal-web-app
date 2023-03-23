import { createContext, createEffect, createResource, createSignal, JSX, onCleanup, onMount, untrack, useContext } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import type {
  FeedStore,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  NostrWindow,
  PrimalContextStore,
  PrimalFeed,
  PrimalNote,
  PrimalUser,
} from '../types/primal';
import {
  convertToNotes,
  sortByRecency,
  sortByScore,
  sortByScore24h,
  sortByZapped,
} from "../stores/note";
import { getExploreFeed, getFeed,  } from "../lib/feed";
import { hexToNpub } from "../lib/keys";
import { initialStore, emptyPage, trendingFeed } from "../constants";
import { isConnected, socket } from "../sockets";
import { getUserProfile } from "../lib/profile";
import { proccessUserProfile, profile, setPublicKey } from "../stores/profile";
import { getLikes } from "../lib/notes";
import { noteEncode } from "nostr-tools/nip19";
import { Relay, relayInit } from "nostr-tools";
import { initAvailableFeeds, updateAvailableFeedsTop } from "../lib/availableFeeds";


export const FeedContext = createContext<PrimalContextStore>();

export const APP_ID = Math.floor(Math.random()*10000000000);

export function FeedProvider(props: { children: number | boolean | Node | JSX.ArrayElement | JSX.FunctionElement | (string & {}) | null | undefined; }) {

  const [data, setData] = createStore<FeedStore>({...initialStore});

  const [page, setPage] = createStore(emptyPage);

  const [oldestPost, setOldestPost] = createSignal<PrimalNote | undefined>();

  const [relays, setRelays] = createStore<Relay[]>([]);

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

  const proccessPost = (post: NostrNoteContent) => {

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

  const proccessEventContent = (content: NostrEventContent, type: string) => {
    if (type === 'EVENT') {
      if (content.kind === 0) {
        proccessUser(content);
      }
      if (content.kind === 1) {
        proccessPost(content);
      }
      if (content.kind === 6) {
        proccessPost(content);
      }
      if (content.kind === 10000100) {
        proccessStat(content);
      }
    }
  };

  const processZappedPost = (type: string, content: NostrEventContent | undefined) => {

    if (type === 'EOSE') {
      const newPosts = sortByZapped(convertToNotes({
        users: data.zappedNotes.users,
        messages: data.zappedNotes.messages,
        postStats: data.zappedNotes.postStats,
      }));

      setData('zappedNotes', 'notes', () => [...newPosts]);

      return;
    }

    if (type === 'EVENT') {
      if (content && content.kind === 0) {
        setData('zappedNotes', 'users', (users) => ({ ...users, [content.pubkey]: content}))
      }
      if (content && (content.kind === 1 || content.kind === 6)) {
        setData('zappedNotes', 'messages',  (msgs) => [ ...msgs, content]);
      }
      if (content && content.kind === 10000100) {
        const stat = JSON.parse(content.content);
        setData('zappedNotes', 'postStats', (stats) => ({ ...stats, [stat.event_id]: stat }))
      }
    }
  };

  const processTrendingPost = (type: string, content: NostrEventContent | undefined) => {

    if (type === 'EOSE') {
      const newPosts = sortByScore24h(convertToNotes({
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
      if (content && (content.kind === 1 || content.kind === 6)) {
        setData('trendingNotes', 'messages',  (msgs) => [ ...msgs, content]);
      }
      if (content && content.kind === 10000100) {
        const stat = JSON.parse(content.content);
        setData('trendingNotes', 'postStats', (stats) => ({ ...stats, [stat.event_id]: stat }))
      }
    }
  };

  const getRelays = async () => {
    const win = window as NostrWindow;
    const nostr = win.nostr;

    if (nostr) {
      const rels = await nostr.getRelays();


      if (rels) {
        const addresses = Object.keys(rels);
        if (relays.length > 0) {
          for (let i=0; i< relays.length; i++) {
            await relays[i].close();
          }
        }

        const relObjects = addresses.map(address => {
          return relayInit(address);
        })

        let connectedRelays: Relay[] = [];


        for (let i=0; i < relObjects.length; i++) {
          try {
            if (relObjects[i].status === WebSocket.CLOSED) {
              await relObjects[i].connect();
              connectedRelays.push(relObjects[i]);
            }
          } catch (e) {
            console.log('error connecting to relay: ', e);
          }
        }
        setRelays(() => connectedRelays);

        console.log('Connected relays: ', unwrap(relays))
      }
    }
  };

  // const [publicKey, setPublicKey] = createSignal<string>();

  createEffect(() => {
    setData('availableFeeds', initAvailableFeeds(profile.publicKey));

    if (profile.publicKey) {
      const npub = hexToNpub(profile.publicKey);
      const feed = { name: 'Latest, following', hex: profile.publicKey, npub};

      setData('availableFeeds', (feeds) => updateAvailableFeedsTop(profile.publicKey, trendingFeed, feeds));
      setData('availableFeeds', (feeds) => updateAvailableFeedsTop(profile.publicKey, feed, feeds));
      setData('selectedFeed', () => ({...feed}));
      setData('publicKey', () => profile.publicKey);

      getRelays();

      getUserProfile(profile.publicKey, `user_profile_${APP_ID}`);
    }
  });

  createEffect(() => {
    if (profile.publicKey && relays.length > 0) {
      getLikes(profile.publicKey, relays);
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
        localStorage.setItem('pubkey', key);
      }
    } catch (e: any) {
      if (e.message === 'User rejected') {
        setData('selectedFeed', () => ({ ...data.availableFeeds[0] }));
      }
      console.log('error fetching public key: ', e);
    }
  }

  // MESSAGE LISTENERS ------------------------------------

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    webSocket.removeEventListener('message', onMessage);
    webSocket.removeEventListener('close', onSocketClose);
  };

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `trending_${APP_ID}`) {
      processTrendingPost(type, content);
      return;
    }
    if (subId === `zapped_4h_${APP_ID}`) {
      processZappedPost(type, content);
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

    // if (subId === `user_feed_${APP_ID}`) {
    //   if (type === 'EOSE') {
    //     const newPosts = sortByRecency(convertToPosts(page));

    //     setData('posts', (posts) => [ ...posts, ...newPosts ]);
    //     setData('isFetching', false);

    //     return;
    //   }

    //   proccessEventContent(content, type);
    //   return;
    // }

    // if (subId === `user_feed_explore_${APP_ID}`) {
    //   if (type === 'EOSE') {
    //     const sortingPlan: Record<string, Function> = {
    //       trending: sortByScore24h,
    //       popular: sortByScore,
    //       latest: sortByRecency,
    //       mostzapped: sortByZapped,
    //     }

    //     const [_, timeframe]: string[] = data.selectedFeed?.hex?.split(';') || [];

    //     const newPosts = sortingPlan[timeframe](convertToPosts(page));

    //     setData('posts', (posts) => [ ...posts, ...newPosts ]);
    //     setData('isFetching', false);

    //     return;
    //   }

    //   proccessEventContent(content, type);
    //   return;
    // }


  };
  // ------------------------------------------------------

  createEffect(() => {
    if (isConnected()) {
      socket()?.removeEventListener('message', onMessage);
      socket()?.removeEventListener('close', onSocketClose);
      socket()?.addEventListener('message', onMessage);
      socket()?.addEventListener('close', onSocketClose);

      setData('posts', () => []);
      setData('scrollTop', () => 0);
      setPage({ messages: [], users: {}, postStats: {} });

      window.scrollTo({
        top: 0,
        left: 0,
        // @ts-expect-error https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/5
        behavior: 'instant',
      });

      const selected = data?.selectedFeed;

      const pubkey = selected?.hex;

      if (pubkey) {
        const [scope, timeframe] = pubkey.split(';');

        if (scope && timeframe) {
          profile?.publicKey && getExploreFeed(profile.publicKey, `user_feed_explore_${APP_ID}`, scope, timeframe, 0, 100);
          return;
        }

        getFeed(pubkey, `user_feed_${APP_ID}`);
        return;
      }
    }
    else {
      socket()?.removeEventListener('message', onMessage);
    }
  });

  createEffect(() => {
    const html: HTMLElement | null = document.querySelector('html');
    localStorage.setItem('theme', data.theme);
    html?.setAttribute('data-theme', data.theme);
  });

  onMount(() => {
    setData('theme', localStorage.getItem('theme') || 'sunset');

    setTimeout(() => {
      fetchNostrKey();
    }, 1000);
  });

  onCleanup(() => {
    socket()?.removeEventListener('message', onMessage);
    socket()?.removeEventListener('close', onSocketClose);
    // document.removeEventListener('visibilitychange', onVisibilityChange);
    for (let i=0; i < relays.length; i++) {
      const rel = relays[i];
      rel.close();
    }
  });

  const store = {
    data: data,
    relays: relays,
    page: page,
    // likes: likes,
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
      clearZappedNotes: () => {
        setData('zappedNotes', () => ({
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
      selectFeed(feed: PrimalFeed | undefined) {
        if (feed !== undefined) {
          setData('selectedFeed', () => ({ ...feed }));
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
      proccessEventContent(content: NostrUserContent | NostrNoteContent | NostrStatsContent, type: string) {
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
