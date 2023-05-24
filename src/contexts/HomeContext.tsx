import { nip19 } from "nostr-tools";
import { createContext, createEffect, onCleanup, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { APP_ID } from "../App";
import { emptyPage, Kind, trendingFeed } from "../constants";
import { getEvents, getExploreFeed, getFeed, getFutureFeed } from "../lib/feed";
import { hexToNpub } from "../lib/keys";
import { searchContent } from "../lib/search";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket } from "../sockets";
import { sortingPlan, convertToNotes, parseEmptyReposts, paginationPlan } from "../stores/note";
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
  PrimalFeed,
  PrimalNote,
} from "../types/primal";
import { useAccountContext } from "./AccountContext";
import { useSettingsContext } from "./SettingsContext";

type HomeContextStore = {
  notes: PrimalNote[],
  isFetching: boolean,
  scrollTop: number,
  selectedFeed: PrimalFeed | undefined,
  page: FeedPage,
  lastNote: PrimalNote | undefined,
  reposts: Record<string, string> | undefined,
  mentionedNotes: Record<string, NostrNoteContent>,
  future: {
    notes: PrimalNote[],
    page: FeedPage,
    reposts: Record<string, string> | undefined,
  },
  actions: {
    saveNotes: (newNotes: PrimalNote[]) => void,
    clearNotes: () => void,
    fetchNotes: (topic: string, subId: string, until?: number) => void,
    fetchNextPage: () => void,
    selectFeed: (feed: PrimalFeed | undefined) => void,
    updateScrollTop: (top: number) => void,
    updatePage: (content: NostrEventContent) => void,
    savePage: (page: FeedPage) => void,
    checkForNewNotes: (topic: string | undefined) => void,
    loadFutureContent: () => void,
  }
}

const initialHomeData = {
  notes: [],
  isFetching: false,
  scrollTop: 0,
  selectedFeed: undefined,
  page: {
    messages: [],
    users: {},
    postStats: {},
    mentions: {},
    noteActions: {},
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
    },
  },
};

export const HomeContext = createContext<HomeContextStore>();

export const HomeProvider = (props: { children: ContextChildren }) => {

  const settings = useSettingsContext();
  const account = useAccountContext();

// ACTIONS --------------------------------------

const clearFuture = () => {
  updateStore('future', () => ({
    notes: [],
    reposts: {},
    page: {
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
    },
  }))
}

  const saveNotes = (newNotes: PrimalNote[], scope?: 'future') => {
    if (scope) {
      updateStore(scope, 'notes', (notes) => [ ...notes, ...newNotes ]);
      return;
    }
    updateStore('notes', (notes) => [ ...notes, ...newNotes ]);
    updateStore('isFetching', () => false);
  };

  const checkForNewNotes = (topic: string | undefined) => {

    if (!topic) {
      return;
    }

    const [scope, timeframe] = topic.split(';');

    let since = 0;

    if (store.notes[0]) {
      since = store.notes[0].post.created_at;
    }

    // if (store.future.notes[0]) {
    //   since = store.future.notes[0].post.created_at;
    // }
    clearFuture();

    if (scope && timeframe) {

      // if (scope === 'search') {
      //   searchContent(`home_feed_${subId}`, decodeURI(timeframe));
      //   return;
      // }

      // account?.publicKey && getExploreFeed(
      //   account.publicKey,
      //   `home_feed_${subId}`,
      //   scope,
      //   timeframe,
      //   until,
      // );
      return;
    }

    setTimeout(() => {
      getFutureFeed(account?.publicKey, topic, `home_future_${APP_ID}`, since);
    }, 10);

  }

  const loadFutureContent = () => {
    if (store.future.notes.length === 0) {
      return;
    }

    updateStore('notes', (notes) => [...store.future.notes, ...notes]);
    clearFuture();
  };

  const fetchNotes = (topic: string, subId: string, until = 0) => {
    const [scope, timeframe] = topic.split(';');

    updateStore('isFetching', true);
    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));

    if (scope && timeframe) {

      if (scope === 'search') {
        searchContent(`home_feed_${subId}`, decodeURI(timeframe));
        return;
      }

      account?.publicKey && getExploreFeed(
        account.publicKey,
        `home_feed_${subId}`,
        scope,
        timeframe,
        until,
      );
      return;
    }

    getFeed(account?.publicKey, topic, `home_feed_${subId}`, until);
  };

  const clearNotes = () => {
    updateStore('scrollTop', () => 0);
    updateStore('page', () => ({ messages: [], users: {}, postStats: {}, noteActions: {} }));
    updateStore('notes', () => []);
    updateStore('reposts', () => undefined);
    updateStore('lastNote', () => undefined);

    clearFuture();
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

    if (scope === 'search') {
      return;
    }

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

  const updatePage = (content: NostrEventContent, scope?: 'future') => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      if (scope) {
        updateStore(scope, 'page', 'users',
          (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
        );
        return;
      }

      updateStore('page', 'users',
        (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;
      const messageId = nip19.noteEncode(message.id);

      if (scope) {
        const isFirstNote = message.kind === Kind.Text ?
          store.notes[0]?.post?.noteId === messageId :
          store.notes[0]?.repost?.note.noteId === messageId;

        // const isAlreadyFetched = message.kind === Kind.Text ?
        //   store.future.notes[0]?.post?.noteId === messageId :
        //   store.future.notes[0]?.repost?.note.noteId === messageId;

          if (!isFirstNote) {
            updateStore(scope, 'page', 'messages',
              (msgs) => [ ...msgs, { ...message }]
            );
          }
        return;
      }

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

      if (scope) {
        updateStore(scope, 'page', 'postStats',
        (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
        );
        return;
      }
      updateStore('page', 'postStats',
        (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
      );
      return;
    }

    if (content.kind === Kind.Mentions) {
      const mentionContent = content as NostrMentionContent;
      const mention = JSON.parse(mentionContent.content);

      if (scope) {
        updateStore(scope, 'page', 'mentions',
        (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
        );
        return;
      }

      updateStore('page', 'mentions',
        (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
      );
      return;
    }

    if (content.kind === Kind.NoteActions) {
      const noteActionContent = content as NostrNoteActionsContent;
      const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

      if (scope) {
        updateStore(scope, 'page', 'noteActions',
        (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
        );
        return;
      }

      updateStore('page', 'noteActions',
        (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
      );
      return;
    }
  };

  const savePage = (page: FeedPage, scope?: 'future') => {
    const topic = (store.selectedFeed?.hex || '').split(';');
    const sortingFunction = sortingPlan(topic[1]);

    const newPosts = sortingFunction(convertToNotes(page));

    saveNotes(newPosts, scope);
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

        getEvents(account?.publicKey, ids, `home_reposts_${APP_ID}`);

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

    if (subId === `home_future_${APP_ID}`) {
      if (type === 'EOSE') {
        const reposts = parseEmptyReposts(store.future.page);
        const ids = Object.keys(reposts);

        if (ids.length === 0) {
          savePage(store.future.page, 'future');
          return;
        }

        updateStore('future', 'reposts', () => reposts);

        getEvents(account?.publicKey, ids, `home_future_reposts_${APP_ID}`);

        return;
      }

      if (type === 'EVENT') {
        updatePage(content, 'future');
        return;
      }
    }

    if (subId === `home_future_reposts_${APP_ID}`) {
      if (type === 'EOSE') {
        savePage(store.future.page, 'future');
        return;
      }

      if (type === 'EVENT') {
        const repostId = (content as NostrNoteContent).id;
        const reposts = store.future.reposts || {};
        const parent = store.future.page.messages.find(m => m.id === reposts[repostId]);

        if (parent) {
          updateStore('future', 'page', 'messages', (msg) => msg.id === parent.id, 'content', () => JSON.stringify(content));
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

  createEffect(() => {
    if (account?.isKeyLookupDone) {
      selectFeed(settings?.defaultFeed);
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
      checkForNewNotes,
      loadFutureContent,
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
