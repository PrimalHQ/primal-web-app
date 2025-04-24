import { nip19 } from "../lib/nTools";
import { createStore } from "solid-js/store";
import { getEvents, getExploreFeed } from "../lib/feed";
import { useAccountContext } from "./AccountContext";
import { sortingPlan, convertToNotes, parseEmptyReposts, paginationPlan } from "../stores/note";
import { Kind } from "../constants";
import {
  batch,
  createContext,
  createEffect,
  onCleanup,
  onMount,
  useContext
} from "solid-js";
import {
  getLegendStats,
  startListeningForNostrStats,
  stopListeningForNostrStats
} from "../lib/stats";
import {
  decompressBlob,
  isConnected,
  readData,
  refreshSocketListeners,
  removeSocketListeners,
  socket
} from "../sockets";
import {
  ContextChildren,
  DVMMetadata,
  DVMStats,
  FeedPage,
  MegaFeedPage,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrEvents,
  NostrMentionContent,
  NostrNoteActionsContent,
  NostrNoteContent,
  NostrStats,
  NostrStatsContent,
  NostrUserContent,
  NoteActions,
  PrimalArticle,
  PrimalDVM,
  PrimalNote,
  PrimalUser,
  PrimalZap,
  TopZap,
} from "../types/primal";
import { APP_ID } from "../App";
import { handleSubscription, parseBolt11 } from "../utils";
import { filterAndSortNotes, filterAndSortUsers, filterAndSortZaps, PaginationInfo, TopicStat } from "../megaFeeds";
import { loadHotTopics, loadNostrStats, saveHotTopics, saveNostrStats } from "../lib/localStore";

export type ExploreContextStore = {
  previewDVM: PrimalDVM | undefined,
  previewDVMStats: DVMStats | undefined,
  previewDVMMetadata: DVMMetadata | undefined,
  previewDVMAuthor: PrimalUser | undefined,
  previewDVMActions: NoteActions | undefined,
  previewDVMUsers: Record<string, PrimalUser>,
  previewDVMFollows: string[],

  explorePeople: PrimalUser[],
  peoplePaging: PaginationInfo,

  exploreZaps: PrimalZap[],
  zapPaging: PaginationInfo,
  zapSubjects: {
    notes: PrimalNote[],
    reads: PrimalArticle[],
    users: PrimalUser[],
  },

  exploreMedia: PrimalNote[],
  mediaPaging: PaginationInfo,
  exploreTopics: TopicStat[],


  notes: PrimalNote[],
  scope: string,
  timeframe: string,
  isFetching: boolean,
  page: FeedPage,
  lastNote: PrimalNote | undefined,
  reposts: Record<string, string> | undefined,
  isNetStatsStreamOpen: boolean,
  selectedTab: string,
  stats: NostrStats,
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

    selectTab: (tab: string) => void,
    setPreviewDVM: (
      dvm: PrimalDVM,
      stats: DVMStats | undefined,
      metadata: DVMMetadata | undefined,
      author: PrimalUser | undefined,
      actions: NoteActions | undefined,
      users: Record<string, PrimalUser> | undefined,
      followers: string[] | undefined,
    ) => void,
    setExplorePeople: (users: PrimalUser[], paging: PaginationInfo, page: MegaFeedPage) => void,
    setExploreZaps: (zaps: PrimalZap[], paging: PaginationInfo, subjects: { notes: PrimalNote[], users: PrimalUser[], reads: PrimalArticle[]}) => void,
    setExploreMedia: (notes: PrimalNote[], paging: PaginationInfo) => void,
    setExploreTopics: (topics: TopicStat[]) => void,
    removeEvent: (id: string, kind: 'notes') => void,
  }
}

export const initialExploreData = {
  previewDVM: undefined,
  previewDVMStats: undefined,
  previewDVMMetadata: undefined,
  previewDVMAuthor: undefined,
  previewDVMActions: undefined,
  previewDVMUsers: {},
  previewDVMFollows: [],


  explorePeople: [],
  peoplePaging: { since: 0, until: 0, sortBy: 'created_at', elements: [] },

  exploreZaps: [],
  zapPaging: { since: 0, until: 0, sortBy: 'created_at', elements: [] },
  zapSubjects: {
    notes: [],
    reads: [],
    users: [],
  },

  exploreMedia: [],
  mediaPaging: { since: 0, until: 0, sortBy: 'created_at', elements: [] },

  exploreTopics: [],


  notes: [],
  isFetching: false,
  scope: 'global',
  timeframe: 'latest',
  selectedTab: 'feeds',
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

  onMount(() => {
    const stats = loadNostrStats();
    const topics = loadHotTopics();

    updateStore('stats', () => ({ ...stats }));
    updateStore('exploreTopics', () => [...topics])
  })

// ACTIONS --------------------------------------

  const removeEvent = (id: string, kind: 'notes') => {
    updateStore(kind, (drs) => drs.filter(d => d.noteId !== id));
  }

  const setExplorePeople = (users: PrimalUser[], paging: PaginationInfo, page: MegaFeedPage) => {

    const sorted = filterAndSortUsers(users, paging, page);

    updateStore('explorePeople', (usrs) => [ ...usrs, ...sorted]);
    updateStore('peoplePaging', () => ({ ...paging }));
  }

  const setExploreZaps = (zaps: PrimalZap[], paging: PaginationInfo, subjects: { notes: PrimalNote[], users: PrimalUser[], reads: PrimalArticle[]}) => {

    const zapsToAdd = filterAndSortZaps(zaps, paging);

    updateStore('exploreZaps', (zps) => [...zps, ...zapsToAdd]);
    updateStore('zapPaging', () => ({ ...paging }));
    updateStore('zapSubjects', (s) => ({
      notes: [ ...s.notes, ...subjects.notes],
      reads: [ ...s.reads, ...subjects.reads],
      users: [ ...s.users, ...subjects.users],
    }));
  }

  const setExploreMedia = (notes: PrimalNote[], paging: PaginationInfo) => {

    const notesToAdd = filterAndSortNotes(notes, paging);

    updateStore('exploreMedia', (nts) => [...nts, ...notesToAdd]);
    updateStore('mediaPaging', () => ({ ...paging }));
  }

  const setExploreTopics = (topics: TopicStat[]) => {
    updateStore('exploreTopics', () => [...topics]);
    saveHotTopics(topics);
  }

  const setPreviewDVM = (
    dvm: PrimalDVM,
    stats: DVMStats | undefined,
    metadata: DVMMetadata | undefined,
    author: PrimalUser | undefined,
    actions: NoteActions | undefined,
    users: Record<string, PrimalUser> | undefined,
    followers: string[] | undefined,
  ) => {
    batch(() => {
      updateStore('previewDVM', () => (dvm ? {...dvm} : undefined));
      updateStore('previewDVMStats', () => (stats ? {...stats} : undefined));
      updateStore('previewDVMMetadata', () => (metadata ? {...metadata} : undefined));
      updateStore('previewDVMAuthor', () => (author ? {...author} : undefined));
      updateStore('previewDVMActions', () => (actions ? {...actions} : undefined));
      updateStore('previewDVMUsers', () => (users ? {...users} : {}));
      updateStore('previewDVMFollows', () => (followers ? [...followers] : []));
    })
  }

  const selectTab = (tab: string) => {
    updateStore('selectedTab', () => tab);
  }

  const saveNotes = (newNotes: PrimalNote[]) => {

    updateStore('notes', (notes) => [ ...notes, ...newNotes ]);
    updateStore('isFetching', () => false);
  };

  const fetchNotes = (topic: string, until = 0, limit = 20) => {
    const [scope, timeframe] = topic.split(';');


    if (scope && timeframe) {
      updateStore('isFetching', true);
      updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));

      updateStore('scope', () => scope);
      updateStore('timeframe', () => timeframe);

      const exploreId = `explore_${APP_ID}`;

      handleSubscription(
        exploreId,
        () => getExploreFeed(
          account?.publicKey || '',
          exploreId,
          scope,
          timeframe,
          until,
          limit,
        ),
        handleExploreEvent,
        handleExploreEose,
      )


      return;
    }
  }

  const clearNotes = () => {
    updateStore('page', () => ({ messages: [], users: {}, postStats: {}, noteActions: {} }));
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

    const criteria = paginationPlan(store.timeframe);

    const noteData: Record<string, any> =  lastNote.repost ?
      lastNote.repost.note :
      lastNote.post;

    const until = noteData[criteria];

    if (until > 0) {
      fetchNotes(
        `${store.scope};${store.timeframe}`,
        until,
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

  const savePage = (page: FeedPage) => {
    const sort = sortingPlan(store.timeframe);

    const newPosts = sort(convertToNotes(page, page.topZaps));

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

  const handleExploreEvent = (content: NostrEventContent) => {
    updatePage(content);
  }
  const handleExploreEose = () => {
    const reposts = parseEmptyReposts(store.page);
    const ids = Object.keys(reposts);

    if (ids.length === 0) {
      savePage(store.page);
      return;
    }

    updateStore('reposts', () => reposts);

    const exploreRepostsIds = `explore_reposts_${APP_ID}`;

    handleSubscription(
      exploreRepostsIds,
      () => getEvents(account?.publicKey, ids, exploreRepostsIds),
      handleExploreRepostEvent,
      handleExploreRepostEose,
    );

  }

  const handleExploreRepostEvent = (content: NostrEventContent) => {
    const repostId = (content as NostrNoteContent).id;
    const reposts = store.reposts || {};
    const parent = store.page.messages.find(m => m.id === reposts[repostId]);

    if (parent) {
      updateStore('page', 'messages', (msg) => msg.id === parent.id, 'content', () => JSON.stringify(content));
    }
  }

  const handleExploreRepostEose = () => {
    savePage(store.page);
  }

  const handleExploreStatsEvent = (content: NostrEventContent) => {
    const stats = JSON.parse(content.content || '{}');

    if (content.kind === Kind.NetStats) {
      updateStore('stats', () => ({ ...stats }));
      saveNostrStats(stats);
    }

    if (content.kind === Kind.LegendStats) {
      updateStore('legend', () => ({ ...stats }));
    }
  }

  const onMessage = async (event: MessageEvent) => {
    const data = await readData(event);
    const message: NostrEvent | NostrEOSE | NostrEvents = JSON.parse(data);

    const [type, subId, content] = message;

    if ([`netstats_${APP_ID}`, `legendstats_${APP_ID}`].includes(subId)) {
      if (type === 'EVENTS') {
        for (let i=0;i<content.length;i++) {
          const e = content[i];
          handleExploreStatsEvent(e);
        }
      }

      if (type === 'EVENT') {
        handleExploreStatsEvent(content);
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

      selectTab,
      setPreviewDVM,
      setExplorePeople,
      setExploreZaps,
      setExploreMedia,
      setExploreTopics,
      removeEvent,
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
