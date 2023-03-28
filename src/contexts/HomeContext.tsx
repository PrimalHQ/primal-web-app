import { noteEncode } from "nostr-tools/nip19";
import { createContext, createEffect, onCleanup, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { APP_ID } from "../App";
import { useToastContext } from "../components/Toaster/Toaster";
import { defaultFeeds, Kind, trendingFeed } from "../constants";
import { removeFromAvailableFeeds, replaceAvailableFeeds, updateAvailableFeedsTop } from "../lib/availableFeeds";
import { getExploreFeed, getFeed } from "../lib/feed";
import { hexToNpub } from "../lib/keys";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket } from "../sockets";
import { sortingPlan, convertToNotes } from "../stores/note";
import {
  ContextChildren,
  FeedPage,
  HomeContextStore,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  PrimalFeed,
  PrimalNote,
} from "../types/primal";
import { useAccountContext } from "./AccountContext";
import { useSettingsContext } from "./SettingsContext";

const initialHomeData = {
  notes: [],
  isFetching: false,
  scrollTop: 0,
  selectedFeed: undefined,
  page: { messages: [], users: {}, postStats: {} },
  lastNote: undefined,
};

export const HomeContext = createContext<HomeContextStore>();

export const HomeProvider = (props: { children: ContextChildren }) => {

  const settings = useSettingsContext();
  const account = useAccountContext();

// ACTIONS --------------------------------------

  const saveNotes = (newNotes: PrimalNote[]) => {

    updateStore('notes', (notes) => [ ...notes, ...newNotes ]);
    updateStore('isFetching', () => false);
  };

  const fetchNotes = (topic: string, subId: string, until = 0) => {
    const [scope, timeframe] = topic.split(';');

    updateStore('isFetching', true);
    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));

    if (scope && timeframe && until === 0) {
      const limit = 100;

      account?.publicKey && getExploreFeed(
        account.publicKey,
        `home_feed_${subId}`,
        scope,
        timeframe,
        until,
        limit,
      );
      return;
    }

    getFeed(topic, `home_feed_${subId}`, until);
  };

  const clearNotes = () => {
    updateStore('scrollTop', () => 0);
    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));
    updateStore('notes', () => []);
    updateStore('lastNote', () => undefined);
  };

  const fetchNextPage = () => {
    const lastNote = store.notes[store.notes.length - 1];

    if (!lastNote) {
      return;
    }

    updateStore('lastNote', () => ({ ...lastNote }));

    const until = lastNote.post?.created_at || 0;

    if (until > 0) {
      const topic = store.selectedFeed?.hex;

      if (topic) {
        fetchNotes(topic, `${APP_ID}`, until);
      }
    }
  };

  const updateScrollTop = (top: number) => {
    updateStore('scrollTop', () => top);
  };

  const selectFeed = (feed: PrimalFeed | undefined) => {
    if (feed !== undefined && feed.hex !== undefined) {
      updateStore('selectedFeed', () => ({ ...feed }));
      clearNotes();
      fetchNotes(feed.hex , `${APP_ID}`);
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
    const sortingFunction = sortingPlan(store.selectedFeed?.hex);

    const newPosts = sortingFunction(convertToNotes(page));

    saveNotes(newPosts);
  };

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId !== `home_feed_${APP_ID}`) {
      return;
    }

    if (type === 'EOSE') {
      savePage(store.page);
      return;
    }

    if (type === 'EVENT') {
      updatePage(content);
      return;
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
    if (account?.hasPublicKey()) {
      const npub = hexToNpub(account?.publicKey);
      const feed = {
        name: 'Latest, following',
        hex: account?.publicKey,
        npub,
      };

      settings?.actions.addAvailableFeed(trendingFeed, true);
      settings?.actions.addAvailableFeed(feed, true);
    }
  });

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

  const [store, updateStore] = createStore<HomeContextStore>({
    ...initialHomeData,
    actions: {
      saveNotes,
      clearNotes,
      fetchNotes,
      fetchNextPage,
      selectFeed,
      updateScrollTop,
      updatePage,
      savePage,
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
