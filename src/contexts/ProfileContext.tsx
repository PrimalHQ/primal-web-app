import { noteEncode } from "nostr-tools/nip19";
import { createStore } from "solid-js/store";
import { getUserFeed } from "../lib/feed";
import { convertToNotes, sortByRecency } from "../stores/note";
import { Kind } from "../constants";
import {
  createContext,
  createEffect,
  onCleanup,
  onMount,
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
} from "../types/primal";
import { APP_ID } from "../App";
import { hexToNpub } from "../lib/keys";
import { getUserProfileInfo } from "../lib/profile";

export type ProfileContextStore = {
  profileKey: string | undefined,
  userProfile: PrimalUser | undefined,
  userStats: {
    follows_count: number,
    followers_count: number,
    note_count: number,
  },
  notes: PrimalNote[],
  isFetching: boolean,
  page: FeedPage,
  lastNote: PrimalNote | undefined,
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

export const initialData = {
  profileKey: undefined,
  userProfile: undefined,
  userStats: {
    follows_count: 0,
    followers_count: 0,
    note_count: 0,
  },
  notes: [],
  isFetching: false,
  page: { messages: [], users: {}, postStats: {} },
  lastNote: undefined,
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
    updateStore('lastNote', () => undefined);
  };

  const fetchNextPage = () => {
    const lastNote = store.notes[store.notes.length - 1];

    if (!lastNote) {
      return;
    }

    updateStore('lastNote', () => ({ ...lastNote }));

    const until = lastNote.post?.created_at || 0;

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

      if (store.lastNote?.post?.noteId !== noteEncode(message.id)) {
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

  const setProfileKey = (profileKey?: string) => {
    updateStore('profileKey', () => profileKey);

    console.log('pk: ', profileKey)

    if (profileKey) {
      console.log('get profile info');
      getUserProfileInfo(profileKey, `profile_info_${APP_ID}`);
    }
  }

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `profile_feed_${APP_ID}`) {
      if (type === 'EOSE') {
        savePage(store.page);
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

        user.pubkey = content.pubkey;
        user.npub = hexToNpub(content.pubkey);
        user.created_at = content.created_at;

        updateStore('userProfile', () => ({ ...user }));
        return;
      }

      if (content?.kind === Kind.UserStats) {
        const stats = JSON.parse(content.content);

        updateStore('userStats', () => ({ ...stats }));
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
