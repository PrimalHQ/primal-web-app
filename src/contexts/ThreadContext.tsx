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
  useContext
} from "solid-js";
import {
  ContextChildren,
  FeedPage,
  NostrEventContent,
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
import { getEventQuoteStats, getEventZaps, parseLinkPreviews, setLinkPreviews } from "../lib/notes";
import { handleSubscription, parseBolt11 } from "../utils";
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
  highlights: any[],
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
    insertNote: (note: PrimalNote) => void,
    removeEvent: (id: string, kind: 'notes', isRepost?: boolean) => void,
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
  highlights: [],
};


export const ThreadContext = createContext<ThreadContextStore>();

export const ThreadProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();

// ACTIONS --------------------------------------

  const removeEvent = (id: string, kind: 'notes') => {
    updateStore(kind, (drs) => drs.filter(d => d.noteId !== id));
  }

  const saveNotes = (newNotes: PrimalNote[]) => {
    const oldNotesIds = store.notes.map(n => n.post.id);
    const reallyNewNotes = newNotes.filter(n => !oldNotesIds.includes(n.post.id));

    updateStore('notes', (notes) => [ ...reallyNewNotes, ...notes ]);
    updateStore('isFetching', () => false);
  };

  const fetchNotes = (noteId: string, until = 0, limit = 100) => {
    clearNotes();
    updateStore('noteId', noteId)

    const threadId = `thread_${APP_ID}`;

    handleSubscription(
      threadId,
      () => getThread(account?.publicKey, noteId, threadId),
      handleThreadEvent,
      handleThreadEose,
    )

    fetchTopZaps(noteId);
    fetchNoteQuoteStats(noteId);
    updateStore('isFetching', () => true);
  }

  const insertNote = (note: PrimalNote) => {
    updateStore('notes', (nts) => [ { ...note }, ...nts]);
  }

  const updateNotes = (noteId: string, until = 0, limit = 100) => {
    updateStore('page', () => ({ messages: [], users: {}, postStats: {}, noteActions: {}, mentions: {} }));

    const threadDiffId = `thread_diff_${APP_ID}`;

    handleSubscription(
      threadDiffId,
      () => getThread(account?.publicKey, noteId, threadDiffId, until, limit),
      handleThreadEvent,
      handleThreadEose,
    );
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

  const updatePage = (content: NostrEventContent) => {if (content.kind === Kind.WordCount) {
    const count = JSON.parse(content.content) as { event_id: string, words: number };


    updateStore('page', 'wordCount',
      () => ({ [count.event_id]: count.words })
    );
    return;
  }

    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      updateStore('page', 'users',
        (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;

      if (store.lastNote?.id !== message.id) {
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

      if (mention.kind === Kind.LongFormShell) {
        const naddr = `${mention.kind}:${mention.pubkey}:${(mention.tags.find((t: string[]) => t[0] === 'd') || [])[1]}`;

        updateStore('page', 'mentions',
          (mentions) => ({ ...mentions, [naddr]: { ...mention } })
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

      updateStore('page', 'noteActions',
        (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
      );
      return;
    }

    if (content.kind === Kind.LinkMetadata) {
      parseLinkPreviews(JSON.parse(content.content));
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
    const users = Object.values(page.users).map((u) => convertToUser(u, u.pubkey));

    updateStore('users', () => [ ...users ]);
    saveNotes(newPosts);
  };

  const setPrimaryNote = (context: PrimalNote | undefined) => {
    updateStore('primaryNote', () => ({ ...context }));
  };

  const fetchTopZaps = (noteId: string) => {
    updateStore('isFetchingTopZaps', () => true);

    const threadZapsId = `thread_zapps_${APP_ID}`;

    handleSubscription(
      threadZapsId,
      () => getEventZaps(noteId, account?.publicKey, threadZapsId, 10, 0),
      handleThreadZapsEvent,
      handleThreadZapsEose,
    );
  };

  const fetchUsers = (pubkeys: string[]) => {
    const threadPKId = `thread_pk_${APP_ID}`;

    handleSubscription(
      threadPKId,
      () => getUserProfiles(pubkeys, threadPKId),
      handleThreadPKEvent,
      handleThreadPKEose,
    );
  };

  const fetchNoteQuoteStats = (noteId: string) => {
    const threadQuoteStatsId = `thread_quote_stats_${APP_ID}`;

    handleSubscription(
      threadQuoteStatsId,
      () => getEventQuoteStats(noteId, threadQuoteStatsId),
      handleThreadPKEvent,
      handleThreadPKEose,
    );
  }

// SOCKET HANDLERS ------------------------------

  const handleThreadEvent = (content: NostrEventContent) => {
    updatePage(content);
  }
  const handleThreadEose = () => {
    const reposts = parseEmptyReposts(store.page);
    const ids = Object.keys(reposts);

    if (ids.length === 0) {
      savePage(store.page);
      return;
    }

    updateStore('reposts', () => reposts);

    const threadRepostId = `thread_reposts_${APP_ID}`;

    handleSubscription(
      threadRepostId,
      () => getEvents(account?.publicKey, ids, threadRepostId),
      handleThreadRepostEvent,
      handleThreadRepostEose,
    );
  }

  const handleThreadRepostEvent = (content: NostrEventContent) => {

    const repostId = (content as NostrNoteContent).id;
    const reposts = store.reposts || {};
    const parent = store.page.messages.find(m => m.id === reposts[repostId]);

    if (parent) {
      updateStore('page', 'messages', (msg) => msg.id === parent.id, 'content', () => JSON.stringify(content));
    }
  }
  const handleThreadRepostEose = () => {
    savePage(store.page);
  }
  const handleThreadZapsEvent = (content: NostrEventContent) => {

    updatePage(content);
  }
  const handleThreadZapsEose = () => {
    savePage(store.page);
    updateStore('isFetchingTopZaps', () => false);
  }
  const handleThreadPKEvent = (content: NostrEventContent) => {

    updatePage(content);
  }
  const handleThreadPKEose = () => {
    savePage(store.page);
  }
  const handleThreadQuoteStatsEvent = (content: NostrEventContent) => {

    updatePage(content);
  }
  const handleThreadQuoteStatsEose = () => {
    savePage(store.page);
  }

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
      insertNote,
      removeEvent,
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
