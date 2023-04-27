import { createStore, unwrap } from "solid-js/store";
import {
  createContext,
  createEffect,
  JSX,
  onCleanup,
  onMount,
  useContext
} from "solid-js";
import {
  FeedPage,
  NostrContactsContent,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrMentionContent,
  NostrNoteContent,
  NostrRelays,
  NostrStatsContent,
  NostrUserContent,
  NostrWindow,
  PrimalNote,
  PrimalUser,
} from '../types/primal';
import { Kind, noKey, relayConnectingTimeout } from "../constants";
import { isConnected, refreshSocketListeners, removeSocketListeners, socket, subscribeTo } from "../sockets";
import { sendContacts, sendLike, setStoredLikes } from "../lib/notes";
import { Relay, relayInit } from "nostr-tools";
import { APP_ID } from "../App";
import { getLikes, getProfileContactList, getUserProfile } from "../lib/profile";
import { getStorage, saveFollowing, saveLikes, saveRelaySettings } from "../lib/localStore";
import { closeRelays, connectRelays } from "../lib/relays";
import { searchContent, searchUsers } from "../lib/search";
import { convertToUser } from "../stores/profile";
import { sortByRecency, convertToNotes } from "../stores/note";

export type SearchContextStore = {
  contentQuery: string,
  users: PrimalUser[],
  scores: Record<string, number>,
  contentUsers: PrimalUser[],
  contentScores: Record<string, number>,
  notes: PrimalNote[],
  isFetchingUsers: boolean,
  isFetchingContent: boolean,
  page: FeedPage,
  reposts: Record<string, string> | undefined,
  mentionedNotes: Record<string, NostrNoteContent>,
  actions: {
    findUsers: (query: string, pubkey?: string) => void,
    findContentUsers: (query: string, pubkey?: string) => void,
    findContent: (query: string) => void,
    setContentQuery: (query: string) => void,
  },
}

const initialData = {
  contentQuery: '',
  users: [],
  scores: {},
  contentUsers: [],
  contentScores: {},
  notes: [],
  isFetchingUsers: false,
  isFetchingContent: false,
  page: { messages: [], users: {}, postStats: {}, mentions: {} },
  reposts: {},
  mentionedNotes: {},
};

export const SearchContext = createContext<SearchContextStore>();

export function SearchProvider(props: { children: number | boolean | Node | JSX.ArrayElement | JSX.FunctionElement | (string & {}) | null | undefined; }) {

// ACTIONS --------------------------------------

  const findUsers = (query: string, publicKey?: string) => {
    const subid = `search_users_${APP_ID}`;

    let users: PrimalUser[] = [];

    const unsub = subscribeTo(subid, (type, _, content) => {
      if (type === 'EVENT') {
        if (!content) {
          return;
        }

        if (content.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          users.push(convertToUser(user));
          return;
        }

        if (content.kind === Kind.UserScore) {
          const scores = JSON.parse(content.content);

          updateStore('scores', () => ({ ...scores }));
          return;
        }
      }

      if (type === 'EOSE') {
        const sorted = users.sort((a, b) => {
          const aScore = store.scores[a.pubkey];
          const bScore = store.scores[b.pubkey];

          return bScore - aScore;
        });

        updateStore('users', () => sorted.slice(0, 10));
        updateStore('isFetchingUsers', () => false);

        unsub();
        return;
      }

    });

    const pubkey = query.length > 0 ? undefined : publicKey;

    updateStore('isFetchingUsers', () => true);
    searchUsers(pubkey, subid, query);
  }

  const findContentUsers = (query: string, publicKey?: string) => {
    const subid = `search_users_c_${APP_ID}`;

    let users: PrimalUser[] = [];

    const unsub = subscribeTo(subid, (type, _, content) => {
      if (type === 'EVENT') {
        if (!content) {
          return;
        }

        if (content.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          users.push(convertToUser(user));
          return;
        }

        if (content.kind === Kind.UserScore) {
          const scores = JSON.parse(content.content);

          updateStore('contentScores', () => ({ ...scores }));
          return;
        }
      }

      if (type === 'EOSE') {
        const sorted = users.sort((a, b) => {
          const aScore = store.scores[a.pubkey];
          const bScore = store.scores[b.pubkey];

          return bScore - aScore;
        });

        updateStore('contentUsers', () => sorted.slice(0, 10));

        unsub();
        return;
      }

    });

    const pubkey = query.length > 0 ? undefined : publicKey;

    updateStore('isFetchingUsers', () => true);
    searchUsers(pubkey, subid, query);
  }

  const saveNotes = (newNotes: PrimalNote[]) => {
    updateStore('notes', () => [ ...newNotes ]);
    updateStore('isFetchingContent', () => false);
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

      updateStore('page', 'messages',
        (msgs) => [ ...msgs, { ...message }]
      );

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
    const newPosts = sortByRecency(convertToNotes(page));

    saveNotes(newPosts);
  };

  const findContent = (query: string) => {
    const subid = `search_content_${APP_ID}`;

    const unsub = subscribeTo(subid, (type, _, content) => {

      if (type === 'EOSE') {
        savePage(store.page);
        unsub();
        return;
      }

      if (!content) {
        return;
      }


      if (type === 'EVENT') {
        updatePage(content);
        return;
      }

    });

    updateStore('isFetchingContent', () => true);
    updateStore('notes', () => []);
    updateStore('page', { messages: [], users: {}, postStats: {}, mentions: {} })
    searchContent(subid, query);
  }

  const setContentQuery = (query: string) => {
    updateStore('contentQuery', () => query);
  };



// EFFECTS --------------------------------------

// SOCKET HANDLERS ------------------------------


// STORES ---------------------------------------

const [store, updateStore] = createStore<SearchContextStore>({
  ...initialData,
  actions: {
    findUsers,
    findContent,
    findContentUsers,
    setContentQuery,
  },
});

  return (
    <SearchContext.Provider value={store}>
      {props.children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() { return useContext(SearchContext); }
