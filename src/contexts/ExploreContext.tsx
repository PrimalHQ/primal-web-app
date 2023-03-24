import { noteEncode } from "nostr-tools/nip19";
import { createStore } from "solid-js/store";
import { useToastContext } from "../components/Toaster/Toaster";
import { getExploreFeed } from "../lib/feed";
import { sortingPlan, convertToNotes } from "../stores/note";
import { profile } from "../stores/profile";
import { Kind } from "../constants";
import {
  createContext,
  createEffect,
  onCleanup,
  useContext
} from "solid-js";
import {
  getLegendStats,
  startListeningForNostrStats,
  stopListeningForNostrStats
} from "../lib/stats";
import {
  isConnected,
  refreshSocketListeners,
  removeSocketListeners,
  socket
} from "../sockets";
import {
  ContextChildren,
  FeedPage,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  PrimalNote,
} from "../types/primal";

export type ExploreContextStore = {
  notes: PrimalNote[],
  scope: string,
  timeframe: string,
  subId: string,
  isFetching: boolean,
  page: FeedPage,
  lastNote: PrimalNote | undefined,
  isNetStatsStreamOpen: boolean,
  stats: {
    users: number,
    pubkeys: number,
    pubnotes: number,
    reactions: number,
    reposts: number,
    any: number,
    zaps: number,
    satszapped: number,
  },
  legend: {
    your_follows: number,
    your_inner_network: number,
    your_outer_network: number,
  },
  actions: {
    saveNotes: (newNotes: PrimalNote[]) => void,
    clearNotes: () => void,
    fetchNotes: (topic: string, subId: string, until?: number) => void,
    fetchNextPage: () => void,
    updatePage: (content: NostrEventContent) => void,
    savePage: (page: FeedPage) => void,
    openNetStatsStream: () => void,
    closeNetStatsStream: () => void,
    fetchLegendStats: (pubkey?: string) => void,
  }
}

export const initialExploreData = {
  notes: [],
  isFetching: false,
  scope: 'global',
  timeframe: 'latest',
  subId: '',
  page: { messages: [], users: {}, postStats: {} },
  lastNote: undefined,
  isNetStatsStreamOpen: false,
  stats: {
    users: 0,
    pubkeys: 0,
    pubnotes: 0,
    reactions: 0,
    reposts: 0,
    any: 0,
    zaps: 0,
    satszapped: 0,
  },
  legend: {
    your_follows: 0,
    your_inner_network: 0,
    your_outer_network: 0,
  },
};


export const ExploreContext = createContext<ExploreContextStore>();

export const ExploreProvider = (props: { children: ContextChildren }) => {

  const toaster = useToastContext();

// ACTIONS --------------------------------------

  const saveNotes = (newNotes: PrimalNote[]) => {

    updateExploreStore('notes', (notes) => [ ...notes, ...newNotes ]);
    updateExploreStore('isFetching', () => false);
  };

  const fetchNotes = (topic: string, subId: string, until = 0, limit = 100) => {
    const [scope, timeframe] = topic.split(';');

    if (scope && timeframe) {

      updateExploreStore('scope', () => scope);
      updateExploreStore('timeframe', () => timeframe);
      updateExploreStore('subId', () => subId);

      getExploreFeed(
        profile.publicKey || '',
        `explore_${subId}`,
        scope,
        timeframe,
        until,
        limit,
      );
      return;
    }
  }

  const clearNotes = () => {
    updateExploreStore('page', () => ({ messages: [], users: {}, postStats: {} }));
    updateExploreStore('notes', () => []);
    updateExploreStore('lastNote', () => undefined);
  };

  const fetchNextPage = () => {
    const lastNote = exploreStore.notes[exploreStore.notes.length - 1];

    if (!lastNote) {
      return;
    }

    updateExploreStore('lastNote', () => ({ ...lastNote }));

    // Disable pagination for explore feeds
    const until = 0; //lastNote.post?.created_at || 0;

    if (until > 0) {
      fetchNotes(
        `${exploreStore.scope};${exploreStore.timeframe}`,
        `${exploreStore.subId}`,
        until,
        20,
      );
    }
  };

  const updatePage = (content: NostrEventContent) => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      updateExploreStore('page', 'users',
        (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;

      if (exploreStore.lastNote?.post?.noteId !== noteEncode(message.id)) {
        updateExploreStore('page', 'messages',
          (msgs) => [ ...msgs, { ...message }]
        );
      }

      return;
    }

    if (content.kind === Kind.NoteStats) {
      const statistic = content as NostrStatsContent;
      const stat = JSON.parse(statistic.content);

      updateExploreStore('page', 'postStats',
        (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
      );
      return;
    }
  };

  const savePage = (page: FeedPage) => {
    const sort = sortingPlan(exploreStore.timeframe);

    const newPosts = sort(convertToNotes(page));

    saveNotes(newPosts);
  };

  const openNetStatsStream = () => {
    startListeningForNostrStats(exploreStore.subId);
  };

  const closeNetStatsStream = () => {
    stopListeningForNostrStats(exploreStore.subId);
  };

  const fetchLegendStats = (pubkey?: string) => {
    if (!pubkey) {
      return;
    }

    getLegendStats(pubkey, exploreStore.subId);
  };

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `explore_${exploreStore.subId}`) {
      if (type === 'EOSE') {
        savePage(exploreStore.page);
        return;
      }

      if (type === 'EVENT') {
        updatePage(content);
        return;
      }
    }

    if (subId === `netstats_${exploreStore.subId}` && content?.content) {
      const stats = JSON.parse(content.content);

      if (content.kind === Kind.NetStats) {
        updateExploreStore('stats', () => ({ ...stats }));
      }

      if (content.kind === Kind.LegendStats) {
        updateExploreStore('legend', () => ({ ...stats }));
      }

    }
  };

  const onSocketClose = (closeEvent: CloseEvent) => {
    const webSocket = closeEvent.target as WebSocket;

    removeSocketListeners(
      webSocket,
      { message: onMessage, close: onSocketClose },
    );
  };

// EFFECTS --------------------------------------

  createEffect(() => {
    if (isConnected()) {
      refreshSocketListeners(
        socket(),
        { message: onMessage, close: onSocketClose },
      );
    }
  });

  onCleanup(() => {
    removeSocketListeners(
      socket(),
      { message: onMessage, close: onSocketClose },
    );
  });

// STORES ---------------------------------------

  const [exploreStore, updateExploreStore] = createStore<ExploreContextStore>({
    ...initialExploreData,
    actions: {
      saveNotes,
      fetchNotes,
      clearNotes,
      fetchNextPage,
      updatePage,
      savePage,
      openNetStatsStream,
      closeNetStatsStream,
      fetchLegendStats,
    },
  });

// RENDER ---------------------------------------

  return (
    <ExploreContext.Provider value={exploreStore}>
      {props.children}
    </ExploreContext.Provider>
  );
}

export const useExploreContext = () => useContext(ExploreContext);
