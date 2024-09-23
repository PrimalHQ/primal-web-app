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
  PrimalArticle,
  PrimalNote,
  PrimalUser,
} from '../types/primal';
import { Kind } from "../constants";
import { APP_ID } from "../App";
import { getUserProfiles } from "../lib/profile";
import { advancedSearchContent, searchContent, searchFilteredUsers, searchUsers } from "../lib/search";
import { convertToUser } from "../stores/profile";
import { sortByRecency, convertToNotes, convertToArticles } from "../stores/note";
import { subscribeTo, subsTo } from "../sockets";
import { nip19 } from "../lib/nTools";
import { useAccountContext } from "./AccountContext";
import { npubToHex } from "../lib/keys";
import { fetchMegaFeed, PaginationInfo } from "../megaFeeds";
import { logError } from "../lib/logger";

const recomendedUsers = [
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

export type AdvancedSearchContextStore = {
  contentQuery: string,
  users: PrimalUser[],
  scores: Record<string, number>,
  contentUsers: PrimalUser[],
  contentScores: Record<string, number>,
  notes: PrimalNote[],
  reads: PrimalArticle[],
  isFetchingUsers: boolean,
  isFetchingContent: boolean,
  reposts: Record<string, string> | undefined,
  mentionedNotes: Record<string, NostrNoteContent>,
  filteringReasons: string[],
  errors: string[],
  paging: PaginationInfo,
  actions: {
    findUsers: (query: string, pubkey?: string) => void,
    findUserByNupub: (npub: string) => void,
    findContentUsers: (query: string, pubkey?: string) => void,
    findContent: (query: string, until?: number) => void,
    fetchContentNextPage: (query: string) => void,
    setContentQuery: (query: string) => void,
    getRecomendedUsers: (profiles?: PrimalUser[]) => void,
    findFilteredUserByNpub: (npub: string) => void,
  },
}

const initialData = {
  contentQuery: '',
  users: [],
  scores: {},
  contentUsers: [],
  contentScores: {},
  notes: [],
  reads: [],
  isFetchingUsers: false,
  isFetchingContent: false,
  reposts: {},
  mentionedNotes: {},
  filteringReasons: [],
  errors: [],
  paging: {
    since: 0,
    until: 0,
    sortBy: 'created_at',
  },
};

export const AdvancedSearchContext = createContext<AdvancedSearchContextStore>();

export function AdvancedSearchProvider(props: { children: JSX.Element }) {

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

    const unsub = subscribeTo(subId, (type, _, content) => {
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

        if (users.length > 0) {
          updateStore('users', () => [users[0]]);
        }

        updateStore('isFetchingUsers', () => false);

        unsub();
        return;
      }
    });

    getUserProfiles([hex], subId);
  };

  const getRecomendedUsers = (profiles?: PrimalUser[]) => {
    const subid = `recomended_users_${APP_ID}`;

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
        return;
      }
    });


    updateStore('isFetchingUsers', () => true);
    getUserProfiles(recomendedUsers, subid);

  };

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

  const fetchContentNextPage = (query: string) => {

    if (store.isFetchingContent) {
      return;
    }

    const until = store.paging.since || 0;

    if (until > 0) {
      findContent(query, until);
    }
  };

  const findContent = async (query: string, until = 0) => {

    try {

      const spec = JSON.stringify({ id: 'advsearch', query });

      updateStore('isFetchingContent' , () => true);

      const { notes, reads, paging } = await fetchMegaFeed(
        account?.publicKey,
        spec,
        `adv_search_${APP_ID}`,
        {
          limit: 20,
          until,
          offset: store.reads.map(n => n.repost ? n.repost.note.created_at : (n.published || 0)),
        }
      );

      updateStore('paging', () => ({ ...paging }));
      updateStore('reads', (ns) => [ ...ns, ...reads]);
      updateStore('notes', (ns) => [ ...ns, ...notes]);

    } catch (e) {
      logError('ERROR fetching search results: ', e);
    }

    updateStore('isFetchingContent' , () => false);
  }

  const setContentQuery = (query: string) => {
    updateStore('contentQuery', () => query);
  };

  const findFilteredUserByNpub = (npub: string) => {
    const pubkey = npubToHex(npub);

    let reasons: string[] = [];

    if (pubkey.length > 0) {
      const subId = `search_filtered_users_${APP_ID}`;

      const unsub = subscribeTo(subId, (type, _, response) => {
        if (type === 'EVENT') {
          if (response?.kind === Kind.FilteringReason) {
            const content: { action: 'block' | 'allow', pubkey?: string, group?: string } = JSON.parse(response.content);

            if (content.action === 'allow') {
              return;
            }

            if (content.pubkey) {
              reasons.push(content.pubkey);
              return
            }

            if (content.group) {
              reasons.push(content.group);
              return
            }
          }
        }

        if (type === 'EOSE') {
          updateStore('filteringReasons', () => [...reasons]);
          unsub();
        }
      });

      searchFilteredUsers(pubkey, account?.publicKey, subId);
    }
  }

// STORES ---------------------------------------

const [store, updateStore] = createStore<AdvancedSearchContextStore>({
  ...initialData,
  actions: {
    findUsers,
    findUserByNupub,
    findContent,
    fetchContentNextPage,
    findContentUsers,
    setContentQuery,
    getRecomendedUsers,
    findFilteredUserByNpub,
  },
});

  return (
    <AdvancedSearchContext.Provider value={store}>
      {props.children}
    </AdvancedSearchContext.Provider>
  );
}

export function useAdvancedSearchContext() { return useContext(AdvancedSearchContext); }
