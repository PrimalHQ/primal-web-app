import { createContext, createEffect, on, onCleanup, useContext } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { APP_ID } from "../App";
import { Kind, minKnownProfiles } from "../constants";
import { getEvents } from "../lib/feed";
import { setLinkPreviews } from "../lib/notes";
import { getRecomendedArticleIds } from "../lib/search";
import { emptyPaging, fetchMegaFeed, fetchRecomendedReads, filterAndSortReads, PaginationInfo } from "../megaFeeds";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket } from "../sockets";
import { parseEmptyReposts, isRepostInCollection, convertToArticles } from "../stores/note";
import {
  ContextChildren,
  FeedPage,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrMentionContent,
  NostrNoteActionsContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  NoteActions,
  PrimalArticle,
  PrimalArticleFeed,
  PrimalUser,
  SelectionOption,
  TopZap,
} from "../types/primal";
import { calculateReadsOffset, parseBolt11 } from "../utils";
import { useAccountContext } from "./AccountContext";
import { fetchStoredFeed, saveStoredFeed } from "../lib/localStore";


type ReadsContextStore = {
  notes: PrimalArticle[],
  futureNotes: PrimalArticle[],
  paging: Record<string, PaginationInfo>,
  isFetching: boolean,
  isFetchingSidebar: boolean,
  scrollTop: number,
  selectedFeed: PrimalArticleFeed | undefined,
  page: FeedPage,
  lastNote: PrimalArticle | undefined,
  reposts: Record<string, string> | undefined,
  mentionedNotes: Record<string, NostrNoteContent>,
  recomendedReads: string[],
  future: {
    notes: PrimalArticle[],
    page: FeedPage,
    reposts: Record<string, string> | undefined,
    scope: string,
    timeframe: string,
    latest_at: number,
  },
  sidebar: {
    notes: PrimalArticle[],
    page: FeedPage,
    isFetching: boolean,
    query: SelectionOption | undefined,
  },
  articleHeights: Record<string, number>,
  topPicks: PrimalArticle[],
  topics: string[],
  featuredAuthor: PrimalUser | undefined,
  actions: {
    clearNotes: () => void,
    fetchNotes: (topic: string, until?: number) => void,
    fetchNextPage: (topic?: string) => void,
    selectFeed: (feed: PrimalArticleFeed | undefined) => void,
    updateScrollTop: (top: number) => void,
    checkForNewNotes: (spec: string) => void,
    loadFutureContent: () => void,
    doSidebarSearch: (query: string) => void,
    updateSidebarQuery: (selection: SelectionOption) => void,
    getFirstPage: () => void,
    resetSelectedFeed: () => void,
    setArticleHeight: (id: string, height: number) => void,
    setTopics: (topicks: string[]) => void,
    setFeaturedAuthor: (author: PrimalUser) => void,
    refetchSelectedFeed: () => void,
    removeEvent: (id: string) => void,
  }
}

const initialHomeData = {
  notes: [],
  futureNotes: [],
  sidebarNotes: [],
  isFetching: false,
  isFetchingSidebar: false,
  scrollTop: 0,
  selectedFeed: undefined,
  page: {
    messages: [],
    users: {},
    postStats: {},
    mentions: {},
    noteActions: {},
    topZaps: {},
    wordCount: {},
  },
  reposts: {},
  lastNote: undefined,
  mentionedNotes: {},
  future: {
    notes: [],
    reposts: {},
    page: {
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
      topZaps: {},
      wordCount: {},
    },
    scope: '',
    timeframe: '',
    latest_at: 0,
  },
  sidebar: {
    notes: [],
    page: {
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
      topZaps: {},
      wordCount: {},
    },
    isFetching: false,
    query: undefined,
  },
  paging: {
    notes: { ...emptyPaging() },
    future: { ...emptyPaging() },
    sidebar: { ...emptyPaging() },
  },
  recomendedReads: [],
  articleHeights: {},
  topPicks: [],
  topics: [],
  featuredAuthor: undefined,
};

export const ReadsContext = createContext<ReadsContextStore>();

export const ReadsProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();

// ACTIONS --------------------------------------

const removeEvent = (id: string) => {
  updateStore('notes', (drs) => drs.filter(d => d.id !== id));
}

  const setTopics = (topics: string[]) => {
    updateStore('topics', () => [ ...topics ]);
  };

  const setFeaturedAuthor = (author: PrimalUser) => {
    updateStore('featuredAuthor', () => ({ ...author }) );
  };

  const updateSidebarQuery = (selection: SelectionOption) => {
    updateStore('sidebar', 'query', () => ({ ...selection }));
  };


  const doSidebarSearch = async (query: string) => {
    updateStore('isFetchingSidebar', () => true);

    const reads = await fetchRecomendedReads(`reads_recomended_${APP_ID}`);

    updateStore('topPicks', () => [ ...reads ]);
    updateStore('isFetchingSidebar', () => false);
  }

  const clearFuture = () => {
    updateStore('futureNotes', () => []);
    updateStore('paging', 'future', () => ({
      since: 0,
      until: 0,
      sortBy: 'published_at',
    }));
  }


  const checkForNewNotes = async (spec: string) => {
    if (store.paging.notes.sortBy !== 'created_at') return;

    if (store.futureNotes.length > 100) {
      return;
    }

    let since = store.paging.future.until || store.paging.notes.until || 0;

    const lastPageNotes = store.futureNotes.length > 0 ?
      store.futureNotes :
      store.notes.slice(0, 20);

    const offset = calculateReadsOffset(
      lastPageNotes,
      store.futureNotes.length > 0 ?
        store.paging.future : store.paging.notes,
    );

    const { reads, paging } = await fetchMegaFeed(
      account?.publicKey,
      spec,
      `home_future_${APP_ID}`,
      {
        since,
        limit: 100,
        offset,
      }
    );

    // const sortedReads = filterAndSortReads(reads, paging);

    // Filter out duplicates
    const ids = lastPageNotes.map(n => n.id);
    const filtered = reads.filter(n => !ids.includes(n.id));

    updateStore('paging', 'future', () => ({ ...paging }));
    updateStore('futureNotes', (ns) => [ ...ns, ...filtered]);
  }

  const loadFutureContent = () => {
    if (store.futureNotes.length === 0) {
      return;
    }

    updateStore('notes', (notes) => [...store.futureNotes, ...notes]);
    clearFuture();
  };


  const fetchNotes = async (spec: string, until = 0, includeIsFetching = true) => {

    updateStore('isFetching' , () => includeIsFetching);

    const pubkey = account?.publicKey || minKnownProfiles.names['primal'];

    const offset = calculateReadsOffset(store.notes, store.paging.notes);

    const { reads, paging } = await fetchMegaFeed(
      pubkey,
      spec,
      `reads_feed_${APP_ID}`,
      {
        until,
        limit: 20,
        offset,
      });

      const sortedReads = filterAndSortReads(reads, paging);

      updateStore('paging', 'notes', () => ({ ...paging }));
      updateStore('notes', (ns) => [ ...ns, ...sortedReads]);
      updateStore('isFetching', () => false);

  };

  const clearNotes = () => {
    updateStore('scrollTop', () => 0);
    window.scrollTo({ top: 0 });

    updateStore('notes', () => []);
    updateStore('paging', 'notes', () => ({
      since: 0,
      until: 0,
      sortBy: 'published_at',
    }));

    clearFuture();
  };

  const fetchNextPage = (mainTopic?: string) => {
    if (store.isFetching) {
      return;
    }

    const spec = mainTopic || store.selectedFeed?.spec || '';

    const until = store.paging['notes'].since || 0;

    if (until > 0) {
      fetchNotes(spec, until);
    }
  };

  const updateScrollTop = (top: number) => {
    updateStore('scrollTop', () => top);
  };

  let currentFeed: PrimalArticleFeed | undefined;

  const selectFeed = (feed: PrimalArticleFeed | undefined) => {
    if (feed?.spec !== undefined && (feed.spec !== currentFeed?.spec)) {
      currentFeed = { ...feed };
      saveStoredFeed(account?.publicKey, 'reads', currentFeed);
      updateStore('selectedFeed', reconcile({...feed}));
      clearNotes();
      fetchNotes(feed.spec, 0);
    }
  };

  const refetchSelectedFeed = () => {
    if (!store.selectedFeed) return;

    clearNotes();
    fetchNotes(store.selectedFeed.spec, 0);
  }

  const resetSelectedFeed = () => {
    currentFeed = undefined;
    updateStore('selectedFeed', () => undefined);
  };

  const getFirstPage = () => {
    const feed = store.selectedFeed;
    if (!feed?.spec) return;

    clearNotes();
    fetchNotes(feed.spec, 0);
  };

  const setArticleHeight = (id: string, height: number) => {
    updateStore('articleHeights', id, () => height);
  }


// STORES ---------------------------------------

  const [store, updateStore] = createStore<ReadsContextStore>({
    ...initialHomeData,
    actions: {
      clearNotes,
      fetchNotes,
      fetchNextPage,
      selectFeed,
      resetSelectedFeed,
      updateScrollTop,
      checkForNewNotes,
      loadFutureContent,
      doSidebarSearch,
      updateSidebarQuery,
      getFirstPage,
      setArticleHeight,
      setTopics,
      setFeaturedAuthor,
      refetchSelectedFeed,
      removeEvent,
    },
  });

// RENDER -------------------------------------

  return (
    <ReadsContext.Provider value={store}>
      {props.children}
    </ReadsContext.Provider>
  );
}

export const useReadsContext = () => useContext(ReadsContext);
