import { createContext, createEffect, on, useContext } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { APP_ID } from "../App";
import { Kind, minKnownProfiles } from "../constants";
import {
  ContextChildren,
  FeedPage,
  FeedSpec,
  NostrNoteContent,
  PrimalArticleFeed,
  PrimalNote,
  PrimalUserPoll,
  SelectionOption,
} from "../types/primal";
import { emptyPaging, fetchMegaFeed, fetchMegaMultiFeed, fetchScoredContent, filterAndSortEvents, filterAndSortNotes, PaginationInfo } from "../megaFeeds";
import { fetchStoredFeed, saveStoredFeed } from "../lib/localStore";
import { calculateEventsOffset, calculateNotesOffset } from "../utils";
import { accountStore } from "../stores/accountStore";
import { useSettingsContext } from "./SettingsContext";
import { logError } from "../lib/logger";

type HomeContextStore = {
  notes: (PrimalNote | PrimalUserPoll)[],
  futureNotes: PrimalNote[],
  sidebarNotes: PrimalNote[],
  paging: Record<string, PaginationInfo>,
  isFetching: boolean,
  // A fetch of the current feed has settled (successfully, empty, or failed)
  hasFetched: boolean,
  isFetchingSidebar: boolean,
  sidebarQuery: SelectionOption | undefined,
  scrollTop: number,
  selectedFeed: PrimalArticleFeed | undefined,
  page: FeedPage,
  lastNote: PrimalNote | undefined,
  reposts: Record<string, string> | undefined,
  mentionedNotes: Record<string, NostrNoteContent>,
  future: {
    notes: PrimalNote[],
    page: FeedPage,
    reposts: Record<string, string> | undefined,
    scope: string,
    timeframe: string,
    latest_at: number,
  },
  sidebar: {
    notes: PrimalNote[],
    page: FeedPage,
    isFetching: boolean,
    query: SelectionOption | undefined,
  },
  actions: {
    clearNotes: () => void,
    fetchNotes: (topic: string, until?: number, includeIsFetching?: boolean) => void,
    fetchNextPage: () => void,
    selectFeed: (feed: PrimalArticleFeed | undefined) => void,
    updateScrollTop: (top: number) => void,
    checkForNewNotes: (spec: string) => void,
    loadFutureContent: () => void,
    doSidebarSearch: (query: string) => void,
    updateSidebarQuery: (selection: SelectionOption) => void,
    getFirstPage: () => void,
    resetSelectedFeed: () => void,
    refetchSelectedFeed: () => void,
    removeEvent: (id: string, kind: 'notes') => void,
  }
}

const initialHomeData = {
  notes: [],
  futureNotes: [],
  sidebarNotes: [],
  isFetching: false,
  hasFetched: false,
  isFetchingSidebar: false,
  scrollTop: 0,
  selectedFeed: undefined,
  sidebarQuery: undefined,
  page: {
    messages: [],
    users: {},
    postStats: {},
    mentions: {},
    noteActions: {},
    topZaps: {},
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
    },
    isFetching: false,
    query: undefined,
  },
  paging: {
    notes: { ...emptyPaging() },
    future: { ...emptyPaging() },
    sidebar: { ...emptyPaging() },
  },
};

export const HomeContext = createContext<HomeContextStore>();

export const HomeProvider = (props: { children: ContextChildren }) => {
  const settings = useSettingsContext();

// ACTIONS --------------------------------------

  // Bumped whenever the notes list is reset, so responses to requests made
  // for a previous feed (or a previous first page) are discarded.
  let feedGeneration = 0;
  let requestCounter = 0;

  const removeEvent = (id: string, kind: 'notes') => {
    updateStore(kind, (drs) => drs.filter(d => d.noteId !== id));
  }

  const updateSidebarQuery = (selection: SelectionOption) => {
    updateStore('sidebarQuery', () => ({ ...selection }))
  };

  const doSidebarSearch = async (query: string) => {
    updateStore('isFetchingSidebar', () => true);
    const { notes, paging } = await fetchScoredContent(
      accountStore.publicKey,
      query,
      `home_sidebar_${APP_ID}`,
    );

    updateStore('sidebarNotes', () => [ ...notes ]);
    updateStore('paging', 'sidebar', () => ({ ...paging }));
    updateStore('isFetchingSidebar', () => false);
  }

  const clearFuture = () => {
    updateStore('futureNotes', () => []);
    updateStore('paging', 'future', () => ({
      since: 0,
      until: 0,
      sortBy: 'created_at',
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

    const offset = calculateEventsOffset(
      lastPageNotes,
      store.futureNotes.length > 0 ?
        store.paging.future : store.paging.notes,
    );

    const generation = feedGeneration;

    const { notes, paging } = await fetchMegaMultiFeed(
      accountStore.publicKey,
      spec,
      `home_future_${APP_ID}_${++requestCounter}`,
      [Kind.Text, Kind.Repost, Kind.UserPoll, Kind.ZapPoll],
      {
        since,
        limit: 100,
        offset,
      }
    );
    // const sortedNotes = filterAndSortNotes(notes, paging);

    // The feed was switched or reset while this request was in flight
    if (generation !== feedGeneration) return;

    // Filter out duplicates
    const ids = lastPageNotes.map(n => n.id);
    const filtered = notes.filter(n => !ids.includes(n.id));

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
    const generation = feedGeneration;

    updateStore('isFetching' , () => includeIsFetching);

    const pubkey = accountStore.publicKey || minKnownProfiles.names['primal'];

    const offset = calculateEventsOffset(store.notes, store.paging.notes);

    try {
      // Unique per request: overlapping requests sharing one subId would
      // resolve on each other's EOSE and mix their events.
      const { notes, userPolls, zapPolls, paging } = await fetchMegaMultiFeed(
        pubkey,
        spec,
        `home_feed_${APP_ID}_${++requestCounter}`,
        [Kind.Text, Kind.Repost, Kind.UserPoll, Kind.ZapPoll],
        {
          until,
          limit: 20,
          offset,
        },
      );

      if (generation !== feedGeneration) return;

      const sortedEvents = filterAndSortEvents([...notes, ...userPolls, ...zapPolls], paging);

      updateStore('paging', 'notes', () => ({ ...paging }));
      updateStore('notes', (ns) => [ ...ns, ...(sortedEvents as (PrimalNote | PrimalUserPoll)[])]);
    } catch (e) {
      logError('ERROR fetching home feed: ', e);
    } finally {
      // Always leave the loading state, otherwise pagination stays blocked and
      // the feed shows skeletons forever.
      if (generation === feedGeneration) {
        updateStore('isFetching', () => false);
        updateStore('hasFetched', () => true);
      }
    }
  };

  const clearNotes = () => {
    feedGeneration++;
    updateStore('hasFetched', () => false);
    updateStore('scrollTop', () => 0);
    window.scrollTo({ top: 0 });

    updateStore('notes', () => []);
    updateStore('paging', 'notes', () => ({
      since: 0,
      until: 0,
      sortBy: 'created_at',
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

  const selectFeed = (feed: PrimalArticleFeed | undefined, force?: boolean) => {
    if (feed?.spec !== undefined && (feed.spec !== currentFeed?.spec)) {
      currentFeed = { ...feed };
      updateStore('selectedFeed', reconcile({...feed}));
      saveStoredFeed(accountStore.publicKey, 'home', feed);
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
    fetchNotes(feed.spec, 0, false);
  };


  createEffect(on(() => settings?.homeFeedsReloaded, (reloaded) => {
    if (!reloaded) return;

    const feed = fetchStoredFeed(accountStore.publicKey, 'home') || settings?.homeFeeds[0];
    selectFeed(feed);
  }));
// STORES ---------------------------------------

  const [store, updateStore] = createStore<HomeContextStore>({
    ...initialHomeData,
    actions: {
      clearNotes,
      fetchNotes,
      fetchNextPage,
      selectFeed,
      updateScrollTop,
      checkForNewNotes,
      loadFutureContent,
      doSidebarSearch,
      updateSidebarQuery,
      getFirstPage,
      resetSelectedFeed,
      refetchSelectedFeed,
      removeEvent,
    },
  });

// RENDER -------------------------------------

  return (
    <HomeContext.Provider value={store}>
      {props.children}
    </HomeContext.Provider>
  );
}

export const useHomeContext = () => useContext(HomeContext);
