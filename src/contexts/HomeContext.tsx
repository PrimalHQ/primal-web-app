import { noteEncode } from "nostr-tools/nip19";
import { createContext, createEffect, onCleanup, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { APP_ID } from "../App";
import { Kind, trendingFeed } from "../constants";
import { getEvents, getExploreFeed, getFeed } from "../lib/feed";
import { hexToNpub } from "../lib/keys";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket } from "../sockets";
import { sortingPlan, convertToNotes, parseEmptyReposts, paginationPlan } from "../stores/note";
import {
  ContextChildren,
  FeedPage,
  HomeContextStore,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrMentionContent,
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
  page: { messages: [], users: {}, postStats: {}, mentions: {} },
  reposts: {},
  lastNote: undefined,
  mentionedNotes: {},
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

    if (scope && timeframe) {

      account?.publicKey && getExploreFeed(
        account.publicKey,
        `home_feed_${subId}`,
        scope,
        timeframe,
        until,
      );
      return;
    }

    getFeed(topic, `home_feed_${subId}`, until);
  };

  const clearNotes = () => {
    updateStore('scrollTop', () => 0);
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

    const topic = store.selectedFeed?.hex;

    if (!topic) {
      return;
    }

    const [scope, timeframe] = topic.split(';');
    const pagCriteria = timeframe || 'latest';

    const criteria = paginationPlan(pagCriteria);

    const noteData: Record<string, any> =  lastNote.repost ?
      lastNote.repost.note :
      lastNote.post;

    const until = noteData[criteria];

    if (until > 0) {
      fetchNotes(topic, `${APP_ID}`, until);
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
      const messageId = noteEncode(message.id);

      const isLastNote = message.kind === Kind.Text ?
        store.lastNote?.post?.noteId === messageId :
        store.lastNote?.repost?.note.noteId === messageId;

      if (!isLastNote) {
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

    if (content.kind === Kind.Mentions) {
      const mentionContent = content as NostrMentionContent;
      const mention = JSON.parse(mentionContent.content);

      updateStore('page', 'mentions',
        (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
      );
      return;
    }
  };

  const savePage = (page: FeedPage) => {
    const topic = (store.selectedFeed?.hex || '').split(';');
    const sortingFunction = sortingPlan(topic[1]);

    const newPosts = sortingFunction(convertToNotes(page));

    saveNotes(newPosts);
  };

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `home_feed_${APP_ID}`) {
      if (type === 'EOSE') {
        const reposts = parseEmptyReposts(store.page);
        const ids = Object.keys(reposts);

        if (ids.length === 0) {
          savePage(store.page);
          return;
        }

        updateStore('reposts', () => reposts);

        getEvents(ids, `home_reposts_${APP_ID}`);

        return;
      }

      if (type === 'EVENT') {
        updatePage(content);
        return;
      }
    }

    if (subId === `home_reposts_${APP_ID}`) {
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
