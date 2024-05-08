import { nip19 } from "nostr-tools";
import { createStore } from "solid-js/store";
import { getEvents, getThread } from "../lib/feed";
import {
  convertToNotes,
  parseEmptyReposts,
  sortByRecency,
} from "../stores/note";
import { convertToUser } from "../stores/profile";
import { Kind } from "../constants";
import {
  createContext,
  createEffect,
  onCleanup,
  useContext
} from "solid-js";
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
  NostrMediaInfo,
  NostrMentionContent,
  NostrNoteActionsContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  NoteActions,
  PrimalNote,
  PrimalUser,
  TopZap,
} from "../types/primal";
import { APP_ID } from "../App";
import { useAccountContext } from "./AccountContext";
import { getEventQuoteStats, getEventZaps, setLinkPreviews } from "../lib/notes";
import { parseBolt11 } from "../utils";
import { getUserProfiles } from "../lib/profile";

export type ThreadContextStore = {
  primaryNote: PrimalNote | undefined,
  noteId: string;
  notes: PrimalNote[],
  users: PrimalUser[],
  isFetching: boolean,
  isFetchingTopZaps: boolean,
  page: FeedPage,
  reposts: Record<string, string> | undefined,
  lastNote: PrimalNote | undefined,
  topZaps: Record<string, TopZap[]>,
  quoteCount: number,
  actions: {
    saveNotes: (newNotes: PrimalNote[]) => void,
    clearNotes: () => void,
    fetchNotes: (noteId: string, until?: number) => void,
    updateNotes: (noteId: string, until?: number) => void,
    fetchNextPage: () => void,
    updatePage: (content: NostrEventContent) => void,
    savePage: (page: FeedPage) => void,
    setPrimaryNote: (context: PrimalNote | undefined) => void,
    fetchTopZaps: (noteId: string) => void,
    fetchUsers: (pubkeys: string[]) => void,
  }
}

export const initialData = {
  primaryNote: undefined,
  noteId: '',
  parentNotes: [],
  notes: [],
  users: [],
  replyNotes: [],
  isFetching: false,
  isFetchingTopZaps: false,
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
  topZaps: {},
  quoteCount: 0,
};


export const ThreadContext = createContext<ThreadContextStore>();

export const ThreadProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();

// ACTIONS --------------------------------------

  const saveNotes = (newNotes: PrimalNote[]) => {
    const oldNotesIds = store.notes.map(n => n.post.id);
    const reallyNewNotes = newNotes.filter(n => !oldNotesIds.includes(n.post.id));

    updateStore('notes', (notes) => [ ...notes, ...reallyNewNotes ]);
    updateStore('isFetching', () => false);
  };

  const fetchNotes = (noteId: string, until = 0, limit = 100) => {
    clearNotes();
    updateStore('noteId', noteId)
    getThread(account?.publicKey, noteId, `thread_${APP_ID}`);
    fetchTopZaps(noteId);
    fetchNoteQuoteStats(noteId);
    updateStore('isFetching', () => true);
  }

  const updateNotes = (noteId: string, until = 0, limit = 100) => {
    getThread(account?.publicKey, noteId, `thread_${APP_ID}`, until, limit);
    // updateStore('isFetching', () => true);
  }

  const clearNotes = () => {
    updateStore('page', () => ({ messages: [], users: {}, postStats: {}, noteActions: {}, mentions: {} }));
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

      if (store.lastNote?.post?.noteId !== nip19.noteEncode(message.id)) {
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

    if (content.kind === Kind.NoteActions) {
      const noteActionContent = content as NostrNoteActionsContent;
      const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

      updateStore('page', 'noteActions',
        (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
      );
      return;
    }

    if (content.kind === Kind.LinkMetadata) {
      const metadata = JSON.parse(content.content);

      const data = metadata.resources[0];
      if (!data) {
        return;
      }

      const preview = {
        url: data.url,
        title: data.md_title,
        description: data.md_description,
        mediaType: data.mimetype,
        contentType: data.mimetype,
        images: [data.md_image],
        favicons: [data.icon_url],
      };

      setLinkPreviews(() => ({ [data.url]: preview }));
      return;
    }

    if (content.kind === Kind.RelayHint) {
      const hints = JSON.parse(content.content);
      updateStore('page', 'relayHints', (rh) => ({ ...rh, ...hints }));
    }

    if (content?.kind === Kind.Zap) {
      const zapTag = content.tags.find(t => t[0] === 'description');

      if (!zapTag) return;

      const zapInfo = JSON.parse(zapTag[1] || '{}');

      let amount = '0';

      let bolt11Tag = content?.tags?.find(t => t[0] === 'bolt11');

      if (bolt11Tag) {
        try {
          amount = `${parseBolt11(bolt11Tag[1]) || 0}`;
        } catch (e) {
          const amountTag = zapInfo.tags.find((t: string[]) => t[0] === 'amount');

          amount = amountTag ? amountTag[1] : '0';
        }
      }

      const eventId = (zapInfo.tags.find((t: string[]) => t[0] === 'e') || [])[1];

      const zap: TopZap = {
        id: zapInfo.id,
        amount: parseInt(amount || '0'),
        pubkey: zapInfo.pubkey,
        message: zapInfo.content,
        eventId,
      };

      const oldZaps = store.topZaps[eventId];

      if (oldZaps === undefined) {
        updateStore('topZaps', () => ({ [eventId]: [{ ...zap }]}));
        return;
      }

      if (oldZaps.find(i => i.id === zap.id)) {
        return;
      }

      const newZaps = [ ...oldZaps, { ...zap }].sort((a, b) => b.amount - a.amount);

      updateStore('topZaps', eventId, () => [ ...newZaps ]);

      return;
    }

    // if (content.kind === Kind.EventZapInfo) {
    //   const zapInfo = JSON.parse(content.content)

    //   const eventId = zapInfo.event_id || 'UNKNOWN';

    //   if (eventId === 'UNKNOWN') return;

    //   const zap: TopZap = {
    //     id: zapInfo.zap_receipt_id,
    //     amount: parseInt(zapInfo.amount_sats || '0'),
    //     pubkey: zapInfo.sender,
    //     message: zapInfo.content,
    //     eventId,
    //   };

    //   const oldZaps = store.topZaps[eventId];

    //   if (oldZaps === undefined) {
    //     updateStore('topZaps', () => ({ [eventId]: [{ ...zap }]}));
    //     return;
    //   }

    //   if (oldZaps.find(i => i.id === zap.id)) {
    //     return;
    //   }

    //   const newZaps = [ ...oldZaps, { ...zap }].sort((a, b) => b.amount - a.amount);

    //   updateStore('topZaps', eventId, () => [ ...newZaps ]);

    //   return;
    // }

    if (content.kind === Kind.NoteQuoteStats) {
      const quoteStats = JSON.parse(content.content);

      updateStore('quoteCount', () => quoteStats.count || 0);
    }
  };

  const savePage = (page: FeedPage) => {
    const newPosts = sortByRecency(convertToNotes(page, store.topZaps));
    const users = Object.values(page.users).map(convertToUser);

    updateStore('users', () => [ ...users ]);
    saveNotes(newPosts);
  };

  const setPrimaryNote = (context: PrimalNote | undefined) => {
    updateStore('primaryNote', () => ({ ...context }));
  };

  const fetchTopZaps = (noteId: string) => {
    updateStore('isFetchingTopZaps', () => true);
    getEventZaps(noteId, account?.publicKey, `thread_zapps_${APP_ID}`, 10, 0);
  };

  const fetchUsers = (pubkeys: string[]) => {
    getUserProfiles(pubkeys, `thread_pk_${APP_ID}`);
  };

  const fetchNoteQuoteStats = (noteId: string) => {
    getEventQuoteStats(noteId, `thread_quote_stats_${APP_ID}`)
  }

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `thread_${APP_ID}`) {
      if (type === 'EOSE') {
        const reposts = parseEmptyReposts(store.page);
        const ids = Object.keys(reposts);

        if (ids.length === 0) {
          savePage(store.page);
          return;
        }

        updateStore('reposts', () => reposts);

        getEvents(account?.publicKey, ids, `thread_reposts_${APP_ID}`);

        return;
      }

      if (type === 'EVENT') {
        updatePage(content);
        return;
      }
    }

    if (subId === `thread_reposts_${APP_ID}`) {
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

    if (subId === `thread_zapps_${APP_ID}`) {
      if (type === 'EOSE') {
        savePage(store.page);
        updateStore('isFetchingTopZaps', () => false);
      }

      if (type === 'EVENT') {
        updatePage(content);
        return;
      }
    }

    if (subId === `thread_pk_${APP_ID}`) {
      if (type === 'EOSE') {
        savePage(store.page);
      }

      if (type === 'EVENT') {
        updatePage(content);
        return;
      }
    }

    if (subId === `thread_quote_stats_${APP_ID}`) {
      if (type === 'EOSE') {
        savePage(store.page);
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
      updateNotes,
      clearNotes,
      fetchNextPage,
      updatePage,
      savePage,
      setPrimaryNote,
      fetchTopZaps,
      fetchUsers,
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
