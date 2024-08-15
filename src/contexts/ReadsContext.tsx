import { createContext, createEffect, onCleanup, useContext } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { APP_ID } from "../App";
import { Kind, minKnownProfiles } from "../constants";
import { getArticlesFeed, getArticlesFeed2, getEvents, getExploreFeed, getFeed, getFutureArticlesFeed, getFutureArticlesFeed2, getFutureExploreFeed, getFutureFeed } from "../lib/feed";
import { fetchStoredFeed, saveStoredFeed } from "../lib/localStore";
import { setLinkPreviews } from "../lib/notes";
import { getRecomendedArticleIds, getScoredUsers, searchContent } from "../lib/search";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket } from "../sockets";
import { sortingPlan, convertToNotes, parseEmptyReposts, paginationPlan, isInTags, isRepostInCollection, convertToArticles, isLFRepostInCollection } from "../stores/note";
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
  PrimalArticle,
  PrimalArticleFeed,
  PrimalFeed,
  PrimalUser,
  SelectionOption,
  TopZap,
} from "../types/primal";
import { parseBolt11 } from "../utils";
import { useAccountContext } from "./AccountContext";
import { useSettingsContext } from "./SettingsContext";


type ReadsContextStore = {
  notes: PrimalArticle[],
  isFetching: boolean,
  scrollTop: number,
  selectedFeed: PrimalArticleFeed | undefined,
  page: FeedPage,
  lastNote: PrimalArticle | undefined,
  reposts: Record<string, string> | undefined,
  mentionedNotes: Record<string, NostrNoteContent>,
  recomendedReads: string[],
  future: {
    notes: PrimalArticle[],
    page: FeedPage,
    reposts: Record<string, string> | undefined,
    scope: string,
    timeframe: string,
    latest_at: number,
  },
  sidebar: {
    notes: PrimalArticle[],
    page: FeedPage,
    isFetching: boolean,
    query: SelectionOption | undefined,
  },
  articleHeights: Record<string, number>,
  topPicks: PrimalArticle[],
  topics: string[],
  featuredAuthor: PrimalUser | undefined,
  actions: {
    saveNotes: (newNotes: PrimalArticle[]) => void,
    clearNotes: () => void,
    fetchNotes: (topic: string, subId: string, until?: number) => void,
    fetchNextPage: (topic?: string) => void,
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
    setArticleHeight: (id: string, height: number) => void,
    setTopPicks: (picks: PrimalArticle[]) => void,
    setTopics: (topicks: string[]) => void,
    setFeaturedAuthor: (author: PrimalUser) => void,
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
    wordCount: {},
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
      wordCount: {},
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
      wordCount: {},
    },
    isFetching: false,
    query: undefined,
  },
  recomendedReads: [],
  articleHeights: {},
  topPicks: [],
  topics: [],
  featuredAuthor: undefined,
};

export const ReadsContext = createContext<ReadsContextStore>();

export const ReadsProvider = (props: { children: ContextChildren }) => {

  const settings = useSettingsContext();
  const account = useAccountContext();

// ACTIONS --------------------------------------

  const setTopPicks = (picks: PrimalArticle[]) => {
    updateStore('topPicks', () => [ ...picks ]);
  };

  const setTopics = (topics: string[]) => {
    updateStore('topics', () => [ ...topics ]);
  };

  const setFeaturedAuthor = (author: PrimalUser) => {
    updateStore('featuredAuthor', () => ({ ...author }) );
  };

  const updateSidebarQuery = (selection: SelectionOption) => {
    updateStore('sidebar', 'query', () => ({ ...selection }));
  };

  const saveSidebarNotes = (newNotes: PrimalArticle[]) => {
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
    const newPosts = convertToArticles(page);

    saveSidebarNotes(newPosts);
  };

  const doSidebarSearch = (query: string) => {
    const subid = `reads_recomended_${APP_ID}`;

    updateStore('sidebar', 'isFetching', () => true);
    updateStore('sidebar', 'notes', () => []);
    updateStore('sidebar', 'page', { messages: [], users: {}, postStats: {}, mentions: {}, noteActions: {}, topZaps: {} });

    getRecomendedArticleIds(subid);
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

  const saveNotes = (newNotes: PrimalArticle[], scope?: 'future') => {
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
        store.notes[0].published;
    }

    if (store.future.notes[0]) {
      const lastFutureNote = unwrap(store.future.notes).sort((a, b) => b.published - a.published)[0];

      since = lastFutureNote.repost ?
        lastFutureNote.repost.note.created_at :
        lastFutureNote.published;
    }

    updateStore('future', 'page', () =>({
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
    }))

    getFutureArticlesFeed2(account?.publicKey, spec, `reads_future_${APP_ID}`, since);
  }

  const loadFutureContent = () => {
    if (store.future.notes.length === 0) {
      return;
    }

    updateStore('notes', (notes) => [...store.future.notes, ...notes]);
    clearFuture();
  };

  const fetchNotes = (spec: string, subId: string, until = 0, includeReplies?: boolean) => {

    // const t = topic === 'none' ? '' : topic;//account?.publicKey || '532d830dffe09c13e75e8b145c825718fc12b0003f61d61e9077721c7fff93cb';
    // const [scope, timeframe] = t.split(';');

    updateStore('isFetching' , true);
    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));

    // if (scope && timeframe) {

    //   if (scope === 'filter') {
    //     getArticlesFeed(account?.publicKey, undefined, `reads_feed_${subId}`, until, 20, timeframe);
    //     return;
    //   }

    //   if (scope === 'search') {
    //     searchContent(account?.publicKey, `reads_feed_${subId}`, decodeURI(timeframe));
    //     return;
    //   }

    //   getExploreFeed(
    //     account?.publicKey,
    //     `reads_feed_${subId}`,
    //     scope,
    //     timeframe,
    //     until,
    //   );
    //   return;
    // }

    const pubkey = account?.publicKey || minKnownProfiles.names['primal'];

    getArticlesFeed2(pubkey, spec, `reads_feed_${subId}`, until, 20);
  };

  const clearNotes = () => {
    updateStore('scrollTop', () => 0);
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
    const lastNote = store.notes[store.notes.length - 1];

    if (!lastNote) {
      return;
    }

    updateStore('lastNote', () => ({ ...lastNote }));

    const spec = mainTopic || store.selectedFeed?.spec || '';

    // const topic = mainTopic ? `filter;${mainTopic}` : store.selectedFeed?.hex;
    // const includeReplies = store.selectedFeed?.includeReplies;

    // if (!topic) {
    //   return;
    // }

    // const [scope, timeframe] = topic.split(';');

    // if (scope === 'search') {
    //   return;
    // }

    // const pagCriteria = timeframe || 'latest';

    const criteria = 'published'; //paginationPlan(pagCriteria);

    const noteData: Record<string, any> =  lastNote.repost ?
    lastNote.repost.note :
    lastNote;

    const until = noteData[criteria];

    if (until > 0) {
      fetchNotes(spec, `${APP_ID}`, until);
    }
  };

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

  const resetSelectedFeed = () => {
    currentFeed = undefined;
    updateStore('selectedFeed', () => undefined);
  };

  const getFirstPage = () => {
    const feed = store.selectedFeed;
    if (!feed?.spec) return;

    clearNotes();
    fetchNotes(feed.spec , `${APP_ID}`, 0);
  };

  const updatePage = (content: NostrEventContent, scope?: 'future') => {
    if (content.kind === Kind.WordCount) {
      const count = JSON.parse(content.content) as { event_id: string, words: number };

      if (scope) {
        updateStore(scope, 'page', 'wordCount',
          () => ({ [count.event_id]: count.words })
        );
        return;
      }

      updateStore('page', 'wordCount',
        () => ({ [count.event_id]: count.words })
      );
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

    if ([Kind.LongForm, Kind.Repost, Kind.LongFormShell].includes(content.kind)) {
      const message = content as NostrNoteContent;

      const isRepost = message.kind === Kind.Repost;

      const isLastNote = [Kind.LongForm, Kind.LongFormShell].includes(message.kind) ?
        store.lastNote?.id === message.id :
        store.lastNote?.repost?.note.noteId === message.id;

      let isAlreadyReposted = isRepostInCollection(store.page.messages, message);

      if (isLastNote || isAlreadyReposted) return;

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
    // const topic = (store.selectedFeed?.spec || '').split(';');
    // const sortingFunction = sortingPlan(topic[1]);

    const topZaps = scope ? store[scope].page.topZaps : store.page.topZaps

    const newPosts = convertToArticles(page, topZaps);

    saveNotes(newPosts, scope);
  };

  const setArticleHeight = (id: string, height: number) => {
    updateStore('articleHeights', id, () => height);
  }

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `reads_recomended_${APP_ID}`) {
      if (type === 'EOSE') {
        // saveSidebarPage(store.sidebar.page);
        return;
      }

      if (!content) {
        return;
      }


      if (type === 'EVENT') {
        const recomended = JSON.parse(content?.content || '{}');
        const ids = recomended.reads.reduce((acc: string[], r: string[]) => r[0] ? [ ...acc, r[0] ] : acc, []);

        updateStore('recomendedReads', () => [ ...ids ])

        return;
      }
    }

    if (subId === `reads_sidebar_${APP_ID}`) {
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

    if (subId === `reads_feed_${APP_ID}`) {
      if (type === 'EOSE') {
        const reposts = parseEmptyReposts(store.page);
        const ids = Object.keys(reposts);

        if (ids.length === 0) {
          savePage(store.page);
          return;
        }

        updateStore('reposts', () => reposts);

        getEvents(account?.publicKey, ids, `reads_reposts_${APP_ID}`);

        return;
      }

      if (type === 'EVENT') {
        updatePage(content);
        return;
      }
    }

    if (subId === `reads_reposts_${APP_ID}`) {
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

    if (subId === `reads_future_${APP_ID}`) {
      if (type === 'EOSE') {
        const reposts = parseEmptyReposts(store.future.page);
        const ids = Object.keys(reposts);

        if (ids.length === 0) {
          savePage(store.future.page, 'future');
          return;
        }

        updateStore('future', 'reposts', () => reposts);

        getEvents(account?.publicKey, ids, `reads_future_reposts_${APP_ID}`);

        return;
      }

      if (type === 'EVENT') {
        updatePage(content, 'future');
        return;
      }
    }

    if (subId === `reads_future_reposts_${APP_ID}`) {
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

  onCleanup(() => {
    removeSocketListeners(
      socket(),
      { message: onMessage, close: onSocketClose },
    );
  });


// STORES ---------------------------------------

  const [store, updateStore] = createStore<ReadsContextStore>({
    ...initialHomeData,
    actions: {
      saveNotes,
      clearNotes,
      fetchNotes,
      fetchNextPage,
      selectFeed,
      resetSelectedFeed,
      updateScrollTop,
      updatePage,
      savePage,
      checkForNewNotes,
      loadFutureContent,
      doSidebarSearch,
      updateSidebarQuery,
      getFirstPage,
      setArticleHeight,
      setTopPicks,
      setTopics,
      setFeaturedAuthor,
    },
  });

// RENDER -------------------------------------

  return (
    <ReadsContext.Provider value={store}>
      {props.children}
    </ReadsContext.Provider>
  );
}

export const useReadsContext = () => useContext(ReadsContext);
