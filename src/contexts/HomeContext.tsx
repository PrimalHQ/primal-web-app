import { nip19 } from "../lib/nTools";
import { createContext, createEffect, onCleanup, useContext } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { APP_ID } from "../App";
import { Kind, minKnownProfiles } from "../constants";
import { getArticlesFeed2, getEvents, getExploreFeed, getFeed, getFutureExploreFeed, getFutureFeed, getFutureMegaFeed, getMegaFeed } from "../lib/feed";
import { fetchStoredFeed, saveStoredFeed } from "../lib/localStore";
import { setLinkPreviews } from "../lib/notes";
import { getScoredUsers, searchContent } from "../lib/search";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket } from "../sockets";
import { sortingPlan, convertToNotes, parseEmptyReposts, paginationPlan, isInTags, isRepostInCollection } from "../stores/note";
import {
  ContextChildren,
  FeedPage,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrFeedRange,
  NostrMentionContent,
  NostrNoteActionsContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  NoteActions,
  PrimalArticleFeed,
  PrimalFeed,
  PrimalNote,
  SelectionOption,
  TopZap,
} from "../types/primal";
import { parseBolt11 } from "../utils";
import { useAccountContext } from "./AccountContext";
import { useSettingsContext } from "./SettingsContext";
import { useLocation } from "@solidjs/router";
import { FeedRange } from "../pages/FeedQueryTest";

type HomeContextStore = {
  notes: PrimalNote[],
  isFetching: boolean,
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
    saveNotes: (newNotes: PrimalNote[]) => void,
    clearNotes: () => void,
    fetchNotes: (topic: string, subId: string, until?: number, includeIsFetching?: boolean) => void,
    fetchNextPage: () => void,
    selectFeed: (feed: PrimalArticleFeed | undefined) => void,
    updateScrollTop: (top: number) => void,
    updatePage: (content: NostrEventContent) => void,
    savePage: (page: FeedPage) => void,
    checkForNewNotes: (spec: string) => void,
    loadFutureContent: () => void,
    doSidebarSearch: (query: string) => void,
    updateSidebarQuery: (selection: SelectionOption) => void,
    getFirstPage: () => void,
    resetSelectedFeed: () => void,
    refetchSelectedFeed: () => void,
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
};

export const HomeContext = createContext<HomeContextStore>();

export const HomeProvider = (props: { children: ContextChildren }) => {

  const settings = useSettingsContext();
  const account = useAccountContext();
  const location = useLocation();

// ACTIONS --------------------------------------

  const updateSidebarQuery = (selection: SelectionOption) => {
    updateStore('sidebar', 'query', () => ({ ...selection }));
  };

  const saveSidebarNotes = (newNotes: PrimalNote[]) => {
    updateStore('sidebar', 'notes', () => [ ...newNotes.slice(0, 24) ]);
    updateStore('sidebar', 'isFetching', () => false);
  };

  const updateSidebarPage = (content: NostrEventContent) => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      updateStore('sidebar', 'page', 'users',
        (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;

      if (store.sidebar.page.messages.find(m => m.id === message.id)) {
        return;
      }

      updateStore('sidebar', 'page', 'messages',
        (msgs) => [ ...msgs, { ...message }]
      );

      return;
    }

    if (content.kind === Kind.NoteStats) {
      const statistic = content as NostrStatsContent;
      const stat = JSON.parse(statistic.content);

      updateStore('sidebar', 'page', 'postStats',
        (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
      );
      return;
    }

    if (content.kind === Kind.Mentions) {
      const mentionContent = content as NostrMentionContent;
      const mention = JSON.parse(mentionContent.content);

      updateStore('sidebar', 'page', 'mentions',
        (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
      );
      return;
    }

    if (content.kind === Kind.NoteActions) {
      const noteActionContent = content as NostrNoteActionsContent;
      const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

      updateStore('sidebar', 'page', 'noteActions',
        (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
      );
      return;
    }
  };

  const saveSidebarPage = (page: FeedPage) => {
    const newPosts = convertToNotes(page);

    saveSidebarNotes(newPosts);
  };

  const doSidebarSearch = (query: string) => {
    const subid = `home_sidebar_${APP_ID}`;

    updateStore('sidebar', 'isFetching', () => true);
    updateStore('sidebar', 'notes', () => []);
    updateStore('sidebar', 'page', { messages: [], users: {}, postStats: {}, mentions: {}, noteActions: {} });

    getScoredUsers(account?.publicKey, query, 10, subid);
  }

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
        topZaps: {},
      },
      scope: '',
      timeframe: '',
      latest_at: 0,
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

  const checkForNewNotes = (spec: string) => {

    if (store.future.notes.length > 100) {
      return;
    }

    let since = 0;

    if (store.notes[0]) {
      since = store.notes[0].repost ?
        store.notes[0].repost.note.created_at :
        store.notes[0].post.created_at;
    }

    if (store.future.notes[0]) {
      const lastFutureNote = unwrap(store.future.notes).sort((a, b) => b.post.created_at - a.post.created_at)[0];

      since = lastFutureNote.repost ?
        lastFutureNote.repost.note.created_at :
        lastFutureNote.post.created_at;
    }

    updateStore('future', 'page', () =>({
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
    }))

    getFutureMegaFeed(account?.publicKey, spec, `home_future_${APP_ID}`, since);
  }

  // const checkForNewNotes = (topic: string | undefined) => {

  //   if (!topic) {
  //     return;
  //   }

  //   if (store.future.notes.length > 100) {
  //     return;
  //   }

  //   const [scope, timeframe] = topic.split(';');

  //   if (scope !== store.future.scope || timeframe !== store.future.timeframe) {
  //     clearFuture();
  //     updateStore('future', 'scope', () => scope);
  //     updateStore('future', 'timeframe', () => timeframe);
  //   }

  //   let since = 0;

  //   if (store.notes[0]) {
  //     since = store.notes[0].repost ?
  //       store.notes[0].repost.note.created_at :
  //       store.notes[0].post.created_at;
  //   }

  //   if (store.future.notes[0]) {
  //     const lastFutureNote = unwrap(store.future.notes).sort((a, b) => b.post.created_at - a.post.created_at)[0];

  //     since = lastFutureNote.repost ?
  //       lastFutureNote.repost.note.created_at :
  //       lastFutureNote.post.created_at;
  //   }

  //   updateStore('future', 'page', () =>({
  //     messages: [],
  //     users: {},
  //     postStats: {},
  //     mentions: {},
  //     noteActions: {},
  //   }))

  //   if (scope && timeframe) {
  //     if (timeframe !== 'latest') {
  //       return;
  //     }

  //     getFutureExploreFeed(
  //       account?.publicKey,
  //       `home_future_${APP_ID}`,
  //       scope,
  //       timeframe,
  //       since,
  //     );
  //     return;
  //   }

  //   getFutureFeed(account?.publicKey, topic, `home_future_${APP_ID}`, since);
  // }

  const loadFutureContent = () => {
    if (store.future.notes.length === 0) {
      return;
    }

    updateStore('notes', (notes) => [...store.future.notes, ...notes]);
    clearFuture();
  };

  const fetchNotes = (spec: string, subId: string, until = 0, includeIsFetching = true) => {

    updateStore('isFetching' , () => includeIsFetching);
    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));


    const pubkey = account?.publicKey || minKnownProfiles.names['primal'];

    getMegaFeed(pubkey, spec, `home_feed_${subId}`, until, 20);
  };

  // const fetchNotes = (topic: string, subId: string, until = 0, includeReplies?: boolean) => {
  //   const [scope, timeframe] = topic.split(';');

  //   updateStore('isFetching', true);
  //   updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));

  //   if (scope && timeframe) {

  //     if (scope === 'search') {
  //       searchContent(account?.publicKey, `home_feed_${subId}`, decodeURI(timeframe));
  //       return;
  //     }

  //     getExploreFeed(
  //       account?.publicKey,
  //       `home_feed_${subId}`,
  //       scope,
  //       timeframe,
  //       until,
  //     );
  //     return;
  //   }

  //   getFeed(account?.publicKey, topic, `home_feed_${subId}`, until, 20, includeReplies);
  // };

  const clearNotes = () => {
    updateStore('scrollTop', () => 0);
    window.scrollTo({ top: 0 });
    updateStore('page', () => ({ messages: [], users: {}, postStats: {}, noteActions: {} }));
    updateStore('notes', () => []);
    updateStore('reposts', () => undefined);
    updateStore('lastNote', () => undefined);

    clearFuture();
  };

  const fetchNextPage = (mainTopic?: string) => {
    if (store.isFetching) {
      return;
    }

    const spec = mainTopic || store.selectedFeed?.spec || '';

    const until = store.page.since || 0;

    if (until > 0) {
      fetchNotes(spec, `${APP_ID}`, until);
    }

    // const lastNote = store.notes[store.notes.length - 1];

    // if (!lastNote) {
    //   return;
    // }

    // updateStore('lastNote', () => ({ ...lastNote }));

    // const spec = mainTopic || store.selectedFeed?.spec || '';

    // const noteData =  lastNote.repost ?
    // lastNote.repost.note :
    // lastNote.post;

    // const until = noteData.created_at;

    // if (until > 0) {
    //   fetchNotes(spec, `${APP_ID}`, until);
    // }
  };

  // const fetchNextPage = () => {
  //   if (store.isFetching) {
  //     return;
  //   }
  //   const lastNote = store.notes[store.notes.length - 1];

  //   if (!lastNote) {
  //     return;
  //   }

  //   updateStore('lastNote', () => ({ ...lastNote }));

  //   const topic = store.selectedFeed?.hex;
  //   const includeReplies = store.selectedFeed?.includeReplies;

  //   if (!topic) {
  //     return;
  //   }

  //   const [scope, timeframe] = topic.split(';');

  //   if (scope === 'search') {
  //     return;
  //   }

  //   const pagCriteria = timeframe || 'latest';

  //   const criteria = paginationPlan(pagCriteria);

  //   const noteData: Record<string, any> =  lastNote.repost ?
  //     lastNote.repost.note :
  //     lastNote.post;

  //   const until = noteData[criteria];

  //   if (until > 0) {
  //     fetchNotes(topic, `${APP_ID}`, until, includeReplies);
  //   }
  // };

  const updateScrollTop = (top: number) => {
    updateStore('scrollTop', () => top);
  };

  let currentFeed: PrimalArticleFeed | undefined;

  const selectFeed = (feed: PrimalArticleFeed | undefined, force?: boolean) => {
    if (feed?.spec !== undefined && (feed.spec !== currentFeed?.spec)) {
      currentFeed = { ...feed };
      // saveStoredFeed(account?.publicKey, currentFeed);
      updateStore('selectedFeed', reconcile({...feed}));
      clearNotes();
      fetchNotes(feed.spec , `${APP_ID}`, 0);
    }
  };

  const refetchSelectedFeed = () => {
    if (!store.selectedFeed) return;

    clearNotes();
    fetchNotes(store.selectedFeed.spec , `${APP_ID}`, 0);
  }

  const resetSelectedFeed = () => {
    currentFeed = undefined;
    updateStore('selectedFeed', () => undefined);
  };

  const getFirstPage = () => {
    const feed = store.selectedFeed;
    if (!feed?.spec) return;

    clearNotes();
    fetchNotes(feed.spec , `${APP_ID}`, 0, false);
  };

  const updatePage = (content: NostrEventContent, scope?: 'future') => {
    if (content.kind === Kind.FeedRange) {
      const feedRange: FeedRange = JSON.parse(content.content || '{}');

      if (scope) {
        updateStore(scope, 'page', 'since', () => feedRange.since);
        updateStore(scope, 'page', 'until', () => feedRange.until);
        updateStore(scope, 'page', 'sortBy', () => feedRange.order_by);
        return;
      }

      updateStore('page', 'since', () => feedRange.since);
      updateStore('page', 'until', () => feedRange.until);
      updateStore('page', 'sortBy', () => feedRange.order_by);

      return;
    }
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

      const isRepost = message.kind === Kind.Repost;

      if (scope) {
        const isFirstNote = message.kind === Kind.Text ?
          store.notes[0]?.post?.noteId === messageId :
          store.notes[0]?.repost?.note.noteId === messageId;


        const scopeNotes = store[scope].notes;

        const isAlreadyIn = message.kind === Kind.Text &&
          scopeNotes &&
          scopeNotes.find(n => n.post.noteId === messageId);

        let isAlreadyReposted = isRepostInCollection(store[scope].page.messages, message);

        // const isAlreadyFetched = message.kind === Kind.Text ?
        //   store.future.notes[0]?.post?.noteId === messageId :
        //   store.future.notes[0]?.repost?.note.noteId === messageId;

        if (isFirstNote || isAlreadyIn || isAlreadyReposted) return;

        updateStore(scope, 'page', 'messages',
          (msgs) => [ ...msgs, { ...message }]
        );

        return;
      }

      const scopeNotes = store.notes;

      const isAlreadyIn = message.kind === Kind.Text &&
        scopeNotes &&
        scopeNotes.find(n => n.post.noteId === messageId);


      let isAlreadyReposted = isRepostInCollection(store.page.messages, message);

      if (isAlreadyIn || isAlreadyReposted) return;

      updateStore('page', 'messages',
        (msgs) => [ ...msgs, { ...message }]
      );

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

      if (scope) {
        const oldZaps = store[scope].page.topZaps[eventId];

        if (oldZaps === undefined) {
          updateStore(scope, 'page', 'topZaps', () => ({ [eventId]: [{ ...zap }]}));
          return;
        }

        if (oldZaps.find(i => i.id === zap.id)) {
          return;
        }

        const newZaps = [ ...oldZaps, { ...zap }].sort((a, b) => b.amount - a.amount);

        updateStore(scope, 'page', 'topZaps', eventId, () => [ ...newZaps ]);
        return;
      }

      const oldZaps = store.page.topZaps[eventId];

      if (oldZaps === undefined) {
        updateStore('page', 'topZaps', () => ({ [eventId]: [{ ...zap }]}));
        return;
      }

      if (oldZaps.find(i => i.id === zap.id)) {
        return;
      }

      const newZaps = [ ...oldZaps, { ...zap }].sort((a, b) => b.amount - a.amount);

      updateStore('page', 'topZaps', eventId, () => [ ...newZaps ]);

      return;
    }
  };

  const savePage = (page: FeedPage, scope?: 'future') => {
    const topZaps = scope ? store[scope].page.topZaps : store.page.topZaps

    const newPosts = convertToNotes(page, topZaps);

    saveNotes(newPosts, scope);
  };

  // const savePage = (page: FeedPage, scope?: 'future') => {
  //   const topic = (store.selectedFeed?.hex || '').split(';');
  //   const sortingFunction = sortingPlan(topic[1]);

  //   const topZaps = scope ? store[scope].page.topZaps : store.page.topZaps

  //   const newPosts = sortingFunction(convertToNotes(page, topZaps));

  //   saveNotes(newPosts, scope);
  // };

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `home_sidebar_${APP_ID}`) {
      if (type === 'EOSE') {
        saveSidebarPage(store.sidebar.page);
        return;
      }

      if (!content) {
        return;
      }


      if (type === 'EVENT') {
        updateSidebarPage(content);
        return;
      }
    }

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

  // createEffect(() => {
  //   if (account?.isKeyLookupDone && settings?.defaultFeed && location.pathname === '/home') {
  //     const storedFeed = fetchStoredFeed(account.publicKey);
  //     selectFeed(storedFeed || settings?.defaultFeed);
  //   }
  // });

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
      doSidebarSearch,
      updateSidebarQuery,
      getFirstPage,
      resetSelectedFeed,
      refetchSelectedFeed,
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
