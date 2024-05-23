import { nip19 } from "nostr-tools";
import { createContext, createEffect, onCleanup, useContext } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";
import { APP_ID } from "../App";
import { Kind } from "../constants";
import { getArticlesFeed, getEvents, getExploreFeed, getFeed, getFutureExploreFeed, getFutureFeed } from "../lib/feed";
import { fetchStoredFeed, saveStoredFeed } from "../lib/localStore";
import { setLinkPreviews } from "../lib/notes";
import { getScoredUsers, searchContent } from "../lib/search";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket, subscribeTo, subsTo } from "../sockets";
import { sortingPlan, convertToNotes, parseEmptyReposts, paginationPlan, isInTags, isRepostInCollection } from "../stores/note";
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
  PrimalFeed,
  PrimalNote,
  SelectionOption,
  TopZap,
} from "../types/primal";
import { parseBolt11 } from "../utils";
import { useAccountContext } from "./AccountContext";
import { useSettingsContext } from "./SettingsContext";

type Event = any;

type EventPage = Record<number, {
  events: Event[],
  since: number,
  until: number,
}>;

type ReadsContextData = {
  events: Record<number, Event[]>,
  pages: EventPage[],
  currentPageNumber: number,
}

type ReadsContextStore = ReadsContextData & {
  actions: {
    fetchPage: (page: number, kind: number) => void;
  }
}

const initialData: ReadsContextData = {
  events: {},
  pages: [],
  currentPageNumber: 0,
};

export const ReadsContext = createContext<ReadsContextStore>();

export const ReadsProvider = (props: { children: ContextChildren }) => {

  const settings = useSettingsContext();
  const account = useAccountContext();

  const handleEvent = (event: NostrEventContent, page: number) => {
    const { kind, content } = event;

    if (!store.pages[page]) {
      updateStore('pages', page, {})
    }

    if (!store.pages[page][kind]) {
      updateStore('pages', page, { [kind]: { events: [], since: 0, until: 0 }})
    }

    updateStore('pages', page, kind, 'events', (es) => [...es, content]);
  };

  const handleEose = (page: number) => {
    console.log('STORE: ', store.pages);
  };

// ACTIONS --------------------------------------

  const fetchPage = (page: number, kind: number) => {
    const subId = `e_${kind}_${page}_${APP_ID}`;

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        handleEvent(content, page);
      },
      onEose: (_) => {
        handleEose(page);
        unsub();
      },
      onNotice: (_, reason) => {},
    });

    const until = 0;
    const limit = 10;
    const offset = 0;

    if (kind === Kind.LongForm) {
      getArticlesFeed(
        account?.publicKey,
        account?.publicKey,
        subId,
        until,
        limit,
        offset,
      )
    }
  };

// SOCKET HANDLERS ------------------------------

  // const onMessage = (event: MessageEvent) => {
  //   const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

  //   const [type, subId, content] = message;

  //   if (subId === `home_sidebar_${APP_ID}`) {
  //     if (type === 'EOSE') {
  //       saveSidebarPage(store.sidebar.page);
  //       return;
  //     }

  //     if (!content) {
  //       return;
  //     }


  //     if (type === 'EVENT') {
  //       updateSidebarPage(content);
  //       return;
  //     }
  //   }

  //   if (subId === `home_feed_${APP_ID}`) {
  //     if (type === 'EOSE') {
  //       const reposts = parseEmptyReposts(store.page);
  //       const ids = Object.keys(reposts);

  //       if (ids.length === 0) {
  //         savePage(store.page);
  //         return;
  //       }

  //       updateStore('reposts', () => reposts);

  //       getEvents(account?.publicKey, ids, `home_reposts_${APP_ID}`);

  //       return;
  //     }

  //     if (type === 'EVENT') {
  //       updatePage(content);
  //       return;
  //     }
  //   }

  //   if (subId === `home_reposts_${APP_ID}`) {
  //     if (type === 'EOSE') {
  //       savePage(store.page);
  //       return;
  //     }

  //     if (type === 'EVENT') {
  //       const repostId = (content as NostrNoteContent).id;
  //       const reposts = store.reposts || {};
  //       const parent = store.page.messages.find(m => m.id === reposts[repostId]);

  //       if (parent) {
  //         updateStore('page', 'messages', (msg) => msg.id === parent.id, 'content', () => JSON.stringify(content));
  //       }

  //       return;
  //     }
  //   }

  //   if (subId === `home_future_${APP_ID}`) {
  //     if (type === 'EOSE') {
  //       const reposts = parseEmptyReposts(store.future.page);
  //       const ids = Object.keys(reposts);

  //       if (ids.length === 0) {
  //         savePage(store.future.page, 'future');
  //         return;
  //       }

  //       updateStore('future', 'reposts', () => reposts);

  //       getEvents(account?.publicKey, ids, `home_future_reposts_${APP_ID}`);

  //       return;
  //     }

  //     if (type === 'EVENT') {
  //       updatePage(content, 'future');
  //       return;
  //     }
  //   }

  //   if (subId === `home_future_reposts_${APP_ID}`) {
  //     if (type === 'EOSE') {
  //       savePage(store.future.page, 'future');
  //       return;
  //     }

  //     if (type === 'EVENT') {
  //       const repostId = (content as NostrNoteContent).id;
  //       const reposts = store.future.reposts || {};
  //       const parent = store.future.page.messages.find(m => m.id === reposts[repostId]);

  //       if (parent) {
  //         updateStore('future', 'page', 'messages', (msg) => msg.id === parent.id, 'content', () => JSON.stringify(content));
  //       }

  //       return;
  //     }
  //   }


  // };

  // const onSocketClose = (closeEvent: CloseEvent) => {
  //   const webSocket = closeEvent.target as WebSocket;

  //   removeSocketListeners(
  //     webSocket,
  //     { message: onMessage, close: onSocketClose },
  //   );
  // };

// EFFECTS --------------------------------------

  // createEffect(() => {
  //   if (isConnected()) {
  //     refreshSocketListeners(
  //       socket(),
  //       { message: onMessage, close: onSocketClose },
  //     );
  //   }
  // });

  // onCleanup(() => {
  //   removeSocketListeners(
  //     socket(),
  //     { message: onMessage, close: onSocketClose },
  //   );
  // });


// STORES ---------------------------------------

  const [store, updateStore] = createStore<ReadsContextStore>({
    ...initialData,
    actions: {
      fetchPage,
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
