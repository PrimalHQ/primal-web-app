import { noteEncode } from "nostr-tools/nip19";
import { createStore } from "solid-js/store";
import { getEvents, getUserFeed } from "../lib/feed";
import { convertToNotes, paginationPlan, parseEmptyReposts, sortByRecency, sortByScore } from "../stores/note";
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
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  PrimalNote,
  PrimalUser,
  VanityProfiles,
} from "../types/primal";
import { APP_ID } from "../App";
import { hexToNpub } from "../lib/keys";
import {
  getOldestProfileEvent,
  getProfileContactList,
  getProfileScoredNotes,
  getUserProfileInfo,
} from "../lib/profile";

export type ProfileContextStore = {
  profileKey: string | undefined,
  userProfile: PrimalUser | undefined,
  userStats: {
    follows_count: number,
    followers_count: number,
    note_count: number,
  },
  knownProfiles: VanityProfiles,
  oldestNoteDate: number | undefined,
  notes: PrimalNote[],
  isFetching: boolean,
  page: FeedPage,
  reposts: Record<string, string> | undefined,
  lastNote: PrimalNote | undefined,
  following: string[],
  sidebar: FeedPage & { notes: PrimalNote[] },
  actions: {
    saveNotes: (newNotes: PrimalNote[]) => void,
    clearNotes: () => void,
    fetchNotes: (noteId: string | undefined, until?: number) => void,
    fetchNextPage: () => void,
    updatePage: (content: NostrEventContent) => void,
    savePage: (page: FeedPage) => void,
    setProfileKey: (profileKey?: string) => void,
  }
}

export const emptyStats = {
  follows_count: 0,
  followers_count: 0,
  note_count: 0,
};

export const initialData = {
  profileKey: undefined,
  userProfile: undefined,
  userStats: { ...emptyStats },
  knownProfiles: { names: {} },
  oldestNoteDate: undefined,
  notes: [],
  isFetching: false,
  page: { messages: [], users: {}, postStats: {}, mentions: {} },
  reposts: {},
  lastNote: undefined,
  following: [],
  sidebar: {
    messages: [],
    users: {},
    postStats: {},
    notes: [],
  },
};


export const ProfileContext = createContext<ProfileContextStore>();

export const ProfileProvider = (props: { children: ContextChildren }) => {

// ACTIONS --------------------------------------

  const saveNotes = (newNotes: PrimalNote[]) => {
    updateStore('notes', (notes) => [ ...notes, ...newNotes ]);
    updateStore('isFetching', () => false);
  };

  const fetchNotes = (pubkey: string | undefined, until = 0, limit = 20) => {
    if (!pubkey) {
      return;
    }

    updateStore('isFetching', () => true);
    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));
    getUserFeed(pubkey, `profile_feed_${APP_ID}`, until, limit);
  }

  const clearNotes = () => {
    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));
    updateStore('notes', () => []);
    updateStore('reposts', () => undefined);
    updateStore('lastNote', () => undefined);
    updateStore('sidebar', () => ({
      messages: [],
      users: {},
      postStats: {},
      notes: [],
    }));
  };

  const fetchNextPage = () => {
    const lastNote = store.notes[store.notes.length - 1];

    if (!lastNote) {
      return;
    }

    updateStore('lastNote', () => ({ ...lastNote }));

    const criteria = paginationPlan('latest');

    const noteData: Record<string, any> =  lastNote.repost ?
      lastNote.repost.note :
      lastNote.post;

    const until = noteData[criteria];

    if (until > 0 && store.profileKey) {
      fetchNotes(store.profileKey, until);
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
      const messageId = noteEncode(message.id);

      const isLastNote = message.kind === Kind.Text ?
        store.lastNote?.post?.noteId === messageId :
        store.lastNote?.repost?.note.noteId === messageId;

      if (!isLastNote) {
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

    saveNotes(newPosts);
  };


  const updateSidebar = (content: NostrEventContent) => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      updateStore('sidebar', 'users',
        (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;

      if (store.lastNote?.post?.noteId !== noteEncode(message.id)) {
        updateStore('sidebar', 'messages',
          (msgs) => [ ...msgs, { ...message }]
        );
      }

      return;
    }

    if (content.kind === Kind.NoteStats) {
      const statistic = content as NostrStatsContent;
      const stat = JSON.parse(statistic.content);

      updateStore('sidebar', 'postStats',
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

  const saveSidebar = (page: FeedPage) => {
    const newPosts = sortByScore(convertToNotes(page));

    updateStore('sidebar', 'notes', () => [...newPosts]);
  };

  const setProfileKey = (profileKey?: string) => {
    updateStore('profileKey', () => profileKey);

    if (profileKey) {
      updateStore('userProfile', () => undefined);
      updateStore('userStats', () => ({ ...emptyStats }));
      getUserProfileInfo(profileKey, `profile_info_${APP_ID}`);
      getOldestProfileEvent(profileKey, `profile_oldest_${APP_ID}`);
      getProfileContactList(profileKey, `profile_contacts_${APP_ID}`);
      getProfileScoredNotes(profileKey, `profile_scored_${APP_ID}`, 10);
    }
  }

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `profile_feed_${APP_ID}`) {
      if (type === 'EOSE') {
        const reposts = parseEmptyReposts(store.page);
        const ids = Object.keys(reposts);

        if (ids.length === 0) {
          savePage(store.page);
          return;
        }

        updateStore('reposts', () => reposts);

        getEvents(ids, `profile_reposts_${APP_ID}`);
        return;
      }

      if (type === 'EVENT') {
        updatePage(content);
        return;
      }
    }

    if (subId === `profile_info_${APP_ID}`) {

      if (content?.kind === Kind.Metadata) {
        let user = JSON.parse(content.content);

        if (!user.displayName || typeof user.displayName === 'string' && user.displayName.trim().length === 0) {
          user.displayName = user.display_name;
        }
        user.pubkey = content.pubkey;
        user.npub = hexToNpub(content.pubkey);
        user.created_at = content.created_at;

        updateStore('userProfile', () => user);
        return;
      }

      if (content?.kind === Kind.UserStats) {
        const stats = JSON.parse(content.content);

        updateStore('userStats', () => ({ ...stats }));
        return;
      }
    }

    if (subId === `profile_reposts_${APP_ID}`) {
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

    if (subId === `profile_oldest_${APP_ID}`) {
      if (content?.kind === Kind.OldestEvent) {
        const timestamp = Number.parseInt(content.content);
        if (isNaN(timestamp)) {
          updateStore('oldestNoteDate', () => undefined);
          return;
        }
        updateStore('oldestNoteDate', () => timestamp);
      }
      return;
    }

    if (subId === `profile_contacts_${APP_ID}`) {
      if (content && content.kind === Kind.Contacts) {
        const tags = content.tags;

        const contacts = tags.reduce((acc, t) => {
          return t[0] === 'p' ? [ ...acc, t[1] ] : acc;
        }, []);

        updateStore('following', () => contacts);
      }
      return;
    }

    if (subId === `profile_scored_${APP_ID}`) {
      if (type === 'EOSE') {
        saveSidebar(store.sidebar);
        return;
      }

      if (type === 'EVENT') {
        updateSidebar(content);
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


  const [store, updateStore] = createStore<ProfileContextStore>({
    ...initialData,
    actions: {
      saveNotes,
      clearNotes,
      fetchNotes,
      fetchNextPage,
      updatePage,
      savePage,
      setProfileKey,
    },
  });

// RENDER ---------------------------------------

  return (
    <ProfileContext.Provider value={store}>
      {props.children}
    </ProfileContext.Provider>
  );
}

export const useProfileContext = () => useContext(ProfileContext);
