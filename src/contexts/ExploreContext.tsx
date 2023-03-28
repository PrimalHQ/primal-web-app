import { noteEncode } from "nostr-tools/nip19";
import { createStore } from "solid-js/store";
import { getEvents, getExploreFeed } from "../lib/feed";
import { useAccountContext } from "./AccountContext";
import { sortingPlan, convertToNotes, parseEmptyReposts } from "../stores/note";
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
import { APP_ID } from "../App";

export type ExploreContextStore = {
  notes: PrimalNote[],
  scope: string,
  timeframe: string,
  isFetching: boolean,
  page: FeedPage,
  lastNote: PrimalNote | undefined,
  reposts: Record<string, string> | undefined,
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
    fetchNotes: (topic: string, until?: number, limit?: number) => void,
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
  page: { messages: [], users: {}, postStats: {} },
  reposts: {},
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

  const account = useAccountContext();

// ACTIONS --------------------------------------

  const saveNotes = (newNotes: PrimalNote[]) => {

    updateStore('notes', (notes) => [ ...notes, ...newNotes ]);
    updateStore('isFetching', () => false);
  };

  const fetchNotes = (topic: string, until = 0, limit = 100) => {
    const [scope, timeframe] = topic.split(';');

    if (scope && timeframe) {

      updateStore('scope', () => scope);
      updateStore('timeframe', () => timeframe);

      getExploreFeed(
        account?.publicKey || '',
        `explore_${APP_ID}`,
        scope,
        timeframe,
        until,
        limit,
      );
      return;
    }
  }

  const clearNotes = () => {
    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));
    updateStore('notes', () => []);
    updateStore('reposts', () => undefined);
    updateStore('lastNote', () => undefined);
  };

  const fetchNextPage = () => {
    const lastNote = store.notes[store.notes.length - 1];

    if (!lastNote) {
      return;
    }

    updateStore('lastNote', () => ({ ...lastNote }));

    // Disable pagination for explore feeds
    const until = 0; //lastNote.post?.created_at || 0;

    if (until > 0) {
      fetchNotes(
        `${store.scope};${store.timeframe}`,
        until,
        20,
      );
    }
  };

  const updatePage = (content: NostrEventContent) => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      updateStore('page', 'users',
        (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;

      if (store.lastNote?.post?.noteId !== noteEncode(message.id)) {
        updateStore('page', 'messages',
          (msgs) => [ ...msgs, { ...message }]
        );
      }

      return;
    }

    if (content.kind === Kind.NoteStats) {
      const statistic = content as NostrStatsContent;
      const stat = JSON.parse(statistic.content);

      updateStore('page', 'postStats',
        (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
      );
      return;
    }
  };

  const savePage = (page: FeedPage) => {
    const sort = sortingPlan(store.timeframe);

    const newPosts = sort(convertToNotes(page));

    saveNotes(newPosts);
  };

  const openNetStatsStream = () => {
    startListeningForNostrStats(APP_ID);
  };

  const closeNetStatsStream = () => {
    stopListeningForNostrStats(APP_ID);
  };

  const fetchLegendStats = (pubkey?: string) => {
    if (!pubkey) {
      return;
    }

    getLegendStats(pubkey, APP_ID);
  };

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `explore_${APP_ID}`) {
      if (type === 'EOSE') {
        const reposts = parseEmptyReposts(store.page);
        const ids = Object.keys(reposts);

        if (ids.length === 0) {
          savePage(store.page);
          return;
        }

        updateStore('reposts', () => reposts);

        getEvents(ids, `explore_reposts_${APP_ID}`);

        return;
      }

      if (type === 'EVENT') {
        updatePage(content);
        return;
      }
    }

    if ([`netstats_${APP_ID}`, `legendstats_${APP_ID}`].includes(subId) && content?.content) {
      const stats = JSON.parse(content.content);

      if (content.kind === Kind.NetStats) {
        updateStore('stats', () => ({ ...stats }));
      }

      if (content.kind === Kind.LegendStats) {
        updateStore('legend', () => ({ ...stats }));
      }
    }

    if (subId === `explore_reposts_${APP_ID}`) {
      if (type === 'EOSE') {
        savePage(store.page);
        return;
      }

      if (type === 'EVENT') {
        const repostId = (content as NostrNoteContent).id;
        const reposts = store.reposts || {};
        const parent = store.page.messages.find(m => m.id === reposts[repostId]);

        if (parent) {
          updateStore('page', 'messages', (msg) => msg.id === parent.id, 'content', () => JSON.stringify(content));
        }

        return;
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

  const [store, updateStore] = createStore<ExploreContextStore>({
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
    <ExploreContext.Provider value={store}>
      {props.children}
    </ExploreContext.Provider>
  );
}

export const useExploreContext = () => useContext(ExploreContext);