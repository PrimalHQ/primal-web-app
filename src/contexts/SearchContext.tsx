import { createStore } from "solid-js/store";
import {
  createContext,
  JSX,
  useContext
} from "solid-js";
import {
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
} from '../types/primal';
import { Kind } from "../constants";
import { APP_ID } from "../App";
import { getUserProfiles } from "../lib/profile";
import { searchContent, searchFilteredUsers, searchUsers } from "../lib/search";
import { convertToUser } from "../stores/profile";
import { convertToNotes } from "../stores/note";
import { subsTo } from "../sockets";
import { nip19 } from "../lib/nTools";
import { useAccountContext } from "./AccountContext";
import { npubToHex } from "../lib/keys";

export const recomendedUsers = [
  '82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2', // jack
  'bf2376e17ba4ec269d10fcc996a4746b451152be9031fa48e74553dde5526bce', // carla
  'c48e29f04b482cc01ca1f9ef8c86ef8318c059e0e9353235162f080f26e14c11', // walker
  '85080d3bad70ccdcd7f74c29a44f55bb85cbcd3dd0cbb957da1d215bdb931204', // preston
  'eab0e756d32b80bcd464f3d844b8040303075a13eabc3599a762c9ac7ab91f4f', // lyn
  '04c915daefee38317fa734444acee390a8269fe5810b2241e5e6dd343dfbecc9', // odell
  '472f440f29ef996e92a186b8d320ff180c855903882e59d50de1b8bd5669301e', // marty
  'e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411', // nvk
  '91c9a5e1a9744114c6fe2d61ae4de82629eaaa0fb52f48288093c7e7e036f832', // rockstar
  'fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52', // pablo
];

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
  filteringReasons: string[],
  advancedSearchCommand: string,
  actions: {
    findUsers: (query: string, pubkey?: string) => void,
    findUserByNupub: (npub: string) => void,
    findContentUsers: (query: string, pubkey?: string) => void,
    findContent: (query: string) => void,
    setContentQuery: (query: string) => void,
    getRecomendedUsers: (profiles?: PrimalUser[]) => void,
    findFilteredUserByNpub: (npub: string) => void,
    setAdvancedSearchCommand: (cmd: string) => void,
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
  page: { messages: [], users: {}, postStats: {}, mentions: {}, noteActions: {}, topZaps: {} },
  reposts: {},
  mentionedNotes: {},
  filteringReasons: [],
  advancedSearchCommand: '',
};

export const SearchContext = createContext<SearchContextStore>();

export function SearchProvider(props: { children: JSX.Element }) {

  const account = useAccountContext();

// ACTIONS --------------------------------------

  const findUserByNupub = (npub: string) => {
    const subId = `find_npub_${APP_ID}`;

    let decoded: nip19.DecodeResult | undefined;

    try {
      decoded = nip19.decode(npub);
    } catch (e) {
      findUsers(npub);
      return;
    }

    if (!decoded) {
      findUsers(npub);
      return;
    }

    const hex = typeof decoded.data === 'string' ?
      decoded.data :
      (decoded.data as nip19.ProfilePointer).pubkey;

    let users: PrimalUser[] = [];

    const unsub = subsTo(subId, {
      onEvent: (_, content) => {
        if (!content) return;

        if (content.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          users.push(convertToUser(user, content.pubkey));
        }

        if (content.kind === Kind.UserScore) {
          const scores = JSON.parse(content.content);

          updateStore('scores', () => ({ ...scores }));
        }
      },
      onEose: () => {

        if (users.length > 0) {
          updateStore('users', () => [users[0]]);
        }

        updateStore('isFetchingUsers', () => false);

        unsub();
      },
    });

    getUserProfiles([hex], subId);
  };

  const getRecomendedUsers = (profiles?: PrimalUser[]) => {
    const subid = `recomended_users_${APP_ID}`;

    let users: PrimalUser[] = [];

    const unsub = subsTo(subid, {
      onEvent: (_, content) => {
        if (!content) return;

        if (content.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          users.push(convertToUser(user, content.pubkey));
        }

        if (content.kind === Kind.UserScore) {
          const scores = JSON.parse(content.content);

          updateStore('scores', () => ({ ...scores }));
        }
      },
      onEose: () => {

        let sorted: PrimalUser[] = [];

        users.forEach((user) => {
          const index = recomendedUsers.indexOf(user.pubkey);
          sorted[index] = { ...user };
        });

        if (profiles) {
          sorted = [...profiles, ...sorted].slice(0, 9);
        }

        updateStore('users', () => sorted);
        updateStore('isFetchingUsers', () => false);

        unsub();
      },
    });


    updateStore('isFetchingUsers', () => true);
    getUserProfiles(recomendedUsers, subid);

  };

  const findUsers = (query: string, publicKey?: string) => {
    const subid = `search_users_${APP_ID}`;

    let users: PrimalUser[] = [];

    const unsub = subsTo(subid, {
      onEvent: (_, content) => {
        if (!content) {
          return;
        }

        if (content.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          users.push(convertToUser(user, content.pubkey));
          return;
        }

        if (content.kind === Kind.UserScore) {
          const scores = JSON.parse(content.content);

          updateStore('scores', () => ({ ...scores }));
          return;
        }
      },
      onEose: () => {
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

    const unsub = subsTo(subid, {
      onEvent: (_, content) => {
        if (!content) {
          return;
        }

        if (content.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          users.push(convertToUser(user, content.pubkey));
          return;
        }

        if (content.kind === Kind.UserScore) {
          const scores = JSON.parse(content.content);

          updateStore('contentScores', () => ({ ...scores }));
          return;
        }
      },
      onEose: () => {
        const sorted = users.sort((a, b) => {
          const aScore = store.scores[a.pubkey];
          const bScore = store.scores[b.pubkey];

          return bScore - aScore;
        });

        updateStore('contentUsers', () => sorted.slice(0, 10));

        unsub();
      },
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

    if ([Kind.LongForm, Kind.LongFormShell, Kind.Text, Kind.Repost].includes(content.kind)) {
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

    if (content.kind === Kind.NoteActions) {
      const noteActionContent = content as NostrNoteActionsContent;
      const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

      updateStore('page', 'noteActions',
        (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
      );
      return;
    }
  };

  const savePage = (page: FeedPage) => {
    const newPosts = convertToNotes(page);

    saveNotes(newPosts);
  };

  const findContent = (query: string) => {
    const subid = `search_content_${APP_ID}`;

    const unsub = subsTo(subid, {
      onEvent: (_, content) => {
        updatePage(content);
      },
      onEose: () => {
        savePage(store.page);
        unsub();
      },
    });

    updateStore('isFetchingContent', () => true);
    updateStore('notes', () => []);
    updateStore('page', { messages: [], users: {}, postStats: {}, mentions: {}, noteActions: {} })
    searchContent(account?.publicKey, subid, query);
  }

  const setContentQuery = (query: string) => {
    updateStore('contentQuery', () => query);
  };

  const findFilteredUserByNpub = (npub: string) => {
    const pubkey = npubToHex(npub);

    let reasons: string[] = [];

    if (pubkey.length > 0) {
      const subId = `search_filtered_users_${APP_ID}`;

      const unsub = subsTo(subId, {
        onEvent: (_, content) => {
          if (content?.kind === Kind.FilteringReason) {
            const filterConfig: { action: 'block' | 'allow', pubkey?: string, group?: string } = JSON.parse(content.content);

            if (filterConfig.action === 'allow') {
              return;
            }

            if (filterConfig.pubkey) {
              reasons.push(filterConfig.pubkey);
              return
            }

            if (filterConfig.group) {
              reasons.push(filterConfig.group);
              return
            }
          }
        },
        onEose: () => {
          updateStore('filteringReasons', () => [...reasons]);
          unsub();
        },
      });

      searchFilteredUsers(pubkey, account?.publicKey, subId);
    }
  }

  const setAdvancedSearchCommand = (cmd: string) => {
    updateStore('advancedSearchCommand', () => cmd);
  }


// EFFECTS --------------------------------------

// SOCKET HANDLERS ------------------------------


// STORES ---------------------------------------

const [store, updateStore] = createStore<SearchContextStore>({
  ...initialData,
  actions: {
    findUsers,
    findUserByNupub,
    findContent,
    findContentUsers,
    setContentQuery,
    getRecomendedUsers,
    findFilteredUserByNpub,
    setAdvancedSearchCommand,
  },
});

  return (
    <SearchContext.Provider value={store}>
      {props.children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() { return useContext(SearchContext); }
