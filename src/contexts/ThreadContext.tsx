import { noteEncode } from "nostr-tools/nip19";
import { createStore } from "solid-js/store";
import { useToastContext } from "../components/Toaster/Toaster";
import { getExploreFeed, getThread } from "../lib/feed";
import { sortingPlan, convertToNotes, sortByRecency } from "../stores/note";
import { convertToUser, profile } from "../stores/profile";
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
  PrimalUser,
} from "../types/primal";
import { APP_ID } from "../App";

export type ThreadContextStore = {
  threadContext: string | undefined,
  noteId: string;
  notes: PrimalNote[],
  users: PrimalUser[],
  isFetching: boolean,
  page: FeedPage,
  lastNote: PrimalNote | undefined,
  actions: {
    saveNotes: (newNotes: PrimalNote[]) => void,
    clearNotes: () => void,
    fetchNotes: (noteId: string, until?: number) => void,
    fetchNextPage: () => void,
    updatePage: (content: NostrEventContent) => void,
    savePage: (page: FeedPage) => void,
    setThreadContext: (context: string | undefined) => void,
  }
}

export const initialData = {
  threadContext: undefined,
  noteId: '',
  parentNotes: [],
  notes: [],
  users: [],
  replyNotes: [],
  isFetching: false,
  page: { messages: [], users: {}, postStats: {} },
  lastNote: undefined,
};


export const ThreadContext = createContext<ThreadContextStore>();

export const ThreadProvider = (props: { children: ContextChildren }) => {

  const toaster = useToastContext();

// ACTIONS --------------------------------------

  const saveNotes = (newNotes: PrimalNote[]) => {
    updateStore('notes', (notes) => [ ...notes, ...newNotes ]);
    updateStore('isFetching', () => false);
  };

  const fetchNotes = (noteId: string, until = 0, limit = 100) => {
    clearNotes();
    updateStore('noteId', noteId)
    getThread(noteId, `thread_${APP_ID}`);
    updateStore('isFetching', () => true);
  }

  const clearNotes = () => {
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

    // Disable pagination for thread feeds
    const until = 0; //lastNote.post?.created_at || 0;

    if (until > 0) {
      fetchNotes(store.noteId);
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
    const newPosts = sortByRecency(convertToNotes(page));
    const users = Object.values(page.users).map(convertToUser);

    updateStore('users', () => [ ...users ]);
    saveNotes(newPosts);
  };

  const setThreadContext = (context: string | undefined) => {
    updateStore('threadContext', () => context);
  };

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `thread_${APP_ID}`) {
      if (type === 'EOSE') {
        savePage(store.page);
        return;
      }

      if (type === 'EVENT') {
        updatePage(content);
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

  const primaryNote: () => PrimalNote | undefined = () =>
    store.notes.find(n => n.post.id === store.noteId);

  const parentNotes: () => PrimalNote[] = () => {
    const note = primaryNote();

    if (!note) {
      return [];
    }

    return store.notes.filter(n =>
      n.post.id !== note.post.id && n.post.created_at <= note.post.created_at,
    );
  };
  const replyNotes: () => PrimalNote[] = () => {
    const note = primaryNote();

    if (!note) {
      return [];
    }

    return store.notes.filter(n =>
      n.post.id !== note.post.id && n.post.created_at >= note.post.created_at,
    );
  };

  const [store, updateStore] = createStore<ThreadContextStore>({
    ...initialData,
    actions: {
      saveNotes,
      fetchNotes,
      clearNotes,
      fetchNextPage,
      updatePage,
      savePage,
      setThreadContext,
    },
  });

// RENDER ---------------------------------------

  return (
    <ThreadContext.Provider value={store}>
      {props.children}
    </ThreadContext.Provider>
  );
}

export const useThreadContext = () => useContext(ThreadContext);
