import { nip19 } from "nostr-tools";
import { createStore, reconcile } from "solid-js/store";
import { getEvents, getFutureUserFeed, getUserFeed } from "../lib/feed";
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
  NostrMentionContent,
  NostrNoteActionsContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  NoteActions,
  PrimalNote,
  PrimalUser,
  VanityProfiles,
} from "../types/primal";
import { APP_ID } from "../App";
import { hexToNpub } from "../lib/keys";
import {
  getProfileContactList,
  getProfileFollowerList,
  getProfileScoredNotes,
  getUserProfileInfo,
  getUserProfiles,
  isUserFollowing,
} from "../lib/profile";
import { useAccountContext } from "./AccountContext";
import { setLinkPreviews } from "../lib/notes";
import { subscribeTo } from "../sockets";

export type ProfileContextStore = {
  profileKey: string | undefined,
  userProfile: PrimalUser | undefined,
  userStats: {
    follows_count: number,
    followers_count: number,
    note_count: number,
    reply_count: number,
    time_joined: number,
  },
  knownProfiles: VanityProfiles,
  notes: PrimalNote[],
  replies: PrimalNote[],
  future: {
    notes: PrimalNote[],
    page: FeedPage,
    replies: PrimalNote[],
    repliesPage: FeedPage,
    reposts: Record<string, string> | undefined,
  },
  isProfileFollowing: boolean,
  isFetching: boolean,
  isFetchingReplies: boolean,
  page: FeedPage,
  repliesPage: FeedPage,
  reposts: Record<string, string> | undefined,
  lastNote: PrimalNote | undefined,
  lastReply: PrimalNote | undefined,
  following: string[],
  sidebar: FeedPage & { notes: PrimalNote[] },
  filterReason: { action: 'block' | 'allow', pubkey?: string, group?: string } | null,
  contacts: PrimalUser[],
  followers: PrimalUser[],
  isFetchingContacts: boolean,
  isFetchingFollowers: boolean,
  profileStats: Record<string, number>,
  actions: {
    saveNotes: (newNotes: PrimalNote[]) => void,
    clearNotes: () => void,
    saveReplies: (newNotes: PrimalNote[]) => void,
    clearReplies: () => void,
    fetchReplies: (noteId: string | undefined, until?: number) => void,
    fetchNextRepliesPage: () => void,
    fetchNotes: (noteId: string | undefined, until?: number) => void,
    fetchNextPage: () => void,
    updatePage: (content: NostrEventContent) => void,
    savePage: (page: FeedPage) => void,
    updateRepliesPage: (content: NostrEventContent) => void,
    saveRepliesPage: (page: FeedPage) => void,
    setProfileKey: (profileKey?: string) => void,
    refreshNotes: () => void,
    checkForNewNotes: (pubkey: string | undefined) => void,
    fetchContactList: (pubkey: string | undefined) => void,
    fetchFollowerList: (pubkey: string | undefined) => void,
    clearContacts: () => void,
    removeContact: (pubkey: string) => void,
    addContact: (pubkey: string, source: PrimalUser[]) => void,
  }
}

export const emptyStats = {
  follows_count: 0,
  followers_count: 0,
  note_count: 0,
  reply_count: 0,
  time_joined: 0,
};

export const initialData = {
  profileKey: undefined,
  userProfile: undefined,
  userStats: { ...emptyStats },
  knownProfiles: { names: {} },
  notes: [],
  replies: [],
  isFetching: false,
  isFetchingReplies: false,
  isProfileFollowing: false,
  page: { messages: [], users: {}, postStats: {}, mentions: {}, noteActions: {} },
  repliesPage: { messages: [], users: {}, postStats: {}, mentions: {}, noteActions: {} },
  reposts: {},
  lastNote: undefined,
  lastReply: undefined,
  following: [],
  filterReason: null,
  contacts: [],
  profileStats: {},
  isFetchingContacts: false,
  followers: [],
  isFetchingFollowers: false,
  sidebar: {
    messages: [],
    users: {},
    postStats: {},
    notes: [],
    noteActions: {},
  },
  future: {
    notes: [],
    replies: [],
    reposts: {},
    page: {
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
    },
    repliesPage: {
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
    },
  },
};


export const ProfileContext = createContext<ProfileContextStore>();

export const ProfileProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();

// ACTIONS --------------------------------------

const addContact = (pubkey: string, source: PrimalUser[]) => {
  const newContact = source.find(c => c.pubkey === pubkey);

  newContact && updateStore('contacts', store.contacts.length, reconcile(newContact));
};

  const removeContact = (pubkey: string) => {
    const newContacts = store.contacts.filter(c => c.pubkey !== pubkey);

    updateStore('contacts', reconcile(newContacts));

  };

  const fetchContactList = (pubkey: string | undefined) => {
    if (!pubkey) return;

    updateStore('isFetchingContacts', () => true);

    const subIdContacts = `profile_contacts_${APP_ID}`;
    const subIdProfiles = `profile_contacts_2_${APP_ID}`;

    let ids: string[] = [];

    const unsubProfiles = subscribeTo(subIdProfiles, (type, _, content) => {
      if (type === 'EOSE') {
        updateStore('isFetchingContacts', () => false);
        unsubProfiles();
        return;
      }

      if (type === 'EVENT') {
        if (content?.kind === Kind.Metadata) {
          let user = JSON.parse(content.content);

          if (!user.displayName || typeof user.displayName === 'string' && user.displayName.trim().length === 0) {
            user.displayName = user.display_name;
          }
          user.pubkey = content.pubkey;
          user.npub = hexToNpub(content.pubkey);
          user.created_at = content.created_at;

          updateStore('contacts', store.contacts.length, () => ({ ...user }));
          return;
        }

        if (content?.kind === Kind.UserFollowerCounts) {
          const stats = JSON.parse(content.content);

          updateStore('profileStats', () => ({ ...stats }));
          return;
        }
      }
    });

    const unsubContacts = subscribeTo(subIdContacts, (type, _, content) => {

      if (type === 'EOSE') {
        getUserProfiles(ids, subIdProfiles);
        unsubContacts();
        return;
      }

      if (type === 'EVENT') {
        if (content && content.kind === Kind.Contacts) {
          const tags = content.tags;

          for (let i = 0;i<tags.length;i++) {
            const tag = tags[i];
            if (tag[0] === 'p') {
              ids.push(tag[1]);
            }
          }
        }
      }
    });

    getProfileContactList(pubkey, subIdContacts);
  };

  const fetchFollowerList = (pubkey: string | undefined) => {
    if (!pubkey) return;

    updateStore('isFetchingFollowers', () => true);

    const subIdProfiles = `profile_followers_2_${APP_ID}`;

    const unsubProfiles = subscribeTo(subIdProfiles, (type, _, content) => {
      if (type === 'EOSE') {
        updateStore('isFetchingFollowers', () => false);
        unsubProfiles();
        return;
      }

      if (type === 'EVENT') {
        if (content?.kind === Kind.Metadata) {
          let user = JSON.parse(content.content);

          if (!user.displayName || typeof user.displayName === 'string' && user.displayName.trim().length === 0) {
            user.displayName = user.display_name;
          }
          user.pubkey = content.pubkey;
          user.npub = hexToNpub(content.pubkey);
          user.created_at = content.created_at;

          updateStore('followers', store.followers.length, () => ({ ...user }));
          return;
        }

        if (content?.kind === Kind.UserFollowerCounts) {
          const stats: Record<string, number> = JSON.parse(content.content);

          updateStore('profileStats', () => ({ ...stats }));
          return;
        }
      }
    });

    getProfileFollowerList(pubkey, subIdProfiles);
  };

  const saveNotes = (newNotes: PrimalNote[], scope?: 'future') => {
    if (scope) {
      updateStore(scope, 'notes', (notes) => [ ...notes, ...newNotes ]);
      loadFutureContent();
      return;
    }
    updateStore('notes', (notes) => [ ...notes, ...newNotes ]);
    updateStore('isFetching', () => false);
  };

  const saveReplies = (newNotes: PrimalNote[], scope?: 'future') => {
    if (scope) {
      updateStore(scope, 'replies', (notes) => [ ...notes, ...newNotes ]);
      loadFutureContent();
      return;
    }
    updateStore('replies', (notes) => [ ...notes, ...newNotes ]);
    updateStore('isFetchingReplies', () => false);
  };

  const fetchNotes = (pubkey: string | undefined, until = 0, limit = 20) => {
    if (!pubkey) {
      return;
    }

    updateStore('isFetching', () => true);
    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));
    getUserFeed(account?.publicKey, pubkey, `profile_feed_${APP_ID}`, 'authored', until, limit);
  }

  const fetchReplies = (pubkey: string | undefined, until = 0, limit = 20) => {
    if (!pubkey) {
      return;
    }

    updateStore('isFetching', () => true);
    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));
    getUserFeed(account?.publicKey, pubkey, `profile_replies_${APP_ID}`, 'replies', until, limit);
  }

  const clearNotes = () => {
    updateStore('page', () => ({ messages: [], users: {}, postStats: {}, noteActions: {} }));
    updateStore('notes', () => []);
    updateStore('reposts', () => undefined);
    updateStore('lastNote', () => undefined);
    updateStore('sidebar', () => ({
      messages: [],
      users: {},
      postStats: {},
      notes: [],
      noteActions: {},
    }));
  };

  const clearReplies = () => {
    updateStore('repliesPage', () => ({ messages: [], users: {}, postStats: {}, noteActions: {} }));
    updateStore('replies', () => []);
    updateStore('lastReply', () => undefined);
  };

  const clearContacts = () => {
    updateStore('contacts', () => []);
    updateStore('followers', () => []);
    // @ts-ignore
    updateStore('profileStats', () => undefined);
    updateStore('profileStats', () => ({}));
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

  const fetchNextRepliesPage = () => {
    const lastReply = store.notes[store.notes.length - 1];

    if (!lastReply) {
      return;
    }

    updateStore('lastReply', () => ({ ...lastReply }));

    const criteria = paginationPlan('latest');

    const noteData: Record<string, any> =  lastReply.repost ?
      lastReply.repost.note :
      lastReply.post;

    const until = noteData[criteria];

    if (until > 0 && store.profileKey) {
      fetchReplies(store.profileKey, until);
    }
  };

  const clearFuture = () => {
    updateStore('future', () => ({
      notes: [],
      replies: [],
      reposts: {},
      page: {
        messages: [],
        users: {},
        postStats: {},
        mentions: {},
        noteActions: {},
      },
      repliesPage: {
        messages: [],
        users: {},
        postStats: {},
        mentions: {},
        noteActions: {},
      },
    }))
  }

  const checkForNewNotes = (pubkey: string | undefined) => {

    if (store.future.notes.length > 100) {
      return;
    }

    let since = 0;

    if (store.notes[0]) {
      since = store.notes[0].repost ?
        store.notes[0].repost.note.created_at :
        store.notes[0].post.created_at;
    }

    clearFuture();

    getFutureUserFeed(
      account?.publicKey,
      pubkey,
      `profile_future_${APP_ID}`,
      since,
    );
  }

  const loadFutureContent = () => {
    if (store.future.notes.length === 0) {
      return;
    }

    updateStore('notes', (notes) => [...store.future.notes, ...notes]);
    clearFuture();
  };

  const updatePage = (content: NostrEventContent, scope?: 'future') => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      if (scope) {
        updateStore(scope, 'page', 'users',
          () => ({ [user.pubkey]: { ...user } })
        );
        return;
      }

      updateStore('page', 'users',
        () => ({ [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;
      const messageId = nip19.noteEncode(message.id);

      if (scope) {
        const isFirstNote = message.kind === Kind.Text ?
          store.notes[0]?.post?.noteId === messageId :
          store.notes[0]?.repost?.note.noteId === messageId;

          if (!isFirstNote) {
            updateStore(scope, 'page', 'messages',
              (msgs) => [ ...msgs, { ...message }]
            );
          }
        return;
      }

      const isLastNote = message.kind === Kind.Text ?
        store.lastNote?.post?.noteId === messageId :
        store.lastNote?.repost?.note.noteId === messageId;

      if (!isLastNote) {
        updateStore('page', 'messages', messages => [ ...messages, message]);
      }

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

      updateStore('page', 'postStats', () => ({ [stat.event_id]: stat }));
      return;
    }

    if (content.kind === Kind.Mentions) {
      const mentionContent = content as NostrMentionContent;
      const mention = JSON.parse(mentionContent.content);

      if (scope) {
        updateStore(scope, 'page', 'mentions',
        () => ({ [mention.id]: { ...mention } })
        );
        return;
      }
      updateStore('page', 'mentions', () => ({ [mention.id]: { ...mention } }));
      return;
    }

    if (content.kind === Kind.NoteActions) {
      const noteActionContent = content as NostrNoteActionsContent;
      const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

      if (scope) {
        updateStore(scope, 'page', 'noteActions',
        () => ({ [noteActions.event_id]: { ...noteActions } })
        );
        return;
      }
      updateStore('page', 'noteActions', () => ({ [noteActions.event_id]: noteActions }));
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
  };

  const savePage = (page: FeedPage, scope?: 'future') => {
    const newPosts = sortByRecency(convertToNotes(page));

    saveNotes(newPosts, scope);
  };


  const updateRepliesPage = (content: NostrEventContent, scope?: 'future') => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      if (scope) {
        updateStore(scope, 'repliesPage', 'users',
          () => ({ [user.pubkey]: { ...user } })
        );
        return;
      }

      updateStore('repliesPage', 'users',
        () => ({ [user.pubkey]: { ...user } })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;
      const messageId = nip19.noteEncode(message.id);

      if (scope) {
        const isFirstReply = message.kind === Kind.Text ?
          store.replies[0]?.post?.noteId === messageId :
          store.replies[0]?.repost?.note.noteId === messageId;

          if (!isFirstReply) {
            updateStore(scope, 'repliesPage', 'messages',
              (msgs) => [ ...msgs, { ...message }]
            );
          }
        return;
      }

      const isLastReply = message.kind === Kind.Text ?
        store.lastReply?.post?.noteId === messageId :
        store.lastReply?.repost?.note.noteId === messageId;

      if (!isLastReply) {
        updateStore('repliesPage', 'messages', messages => [ ...messages, message]);
      }

      return;
    }

    if (content.kind === Kind.NoteStats) {
      const statistic = content as NostrStatsContent;
      const stat = JSON.parse(statistic.content);

      if (scope) {
        updateStore(scope, 'repliesPage', 'postStats',
        (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
        );
        return;
      }

      updateStore('repliesPage', 'postStats', () => ({ [stat.event_id]: stat }));
      return;
    }

    if (content.kind === Kind.Mentions) {
      const mentionContent = content as NostrMentionContent;
      const mention = JSON.parse(mentionContent.content);

      if (scope) {
        updateStore(scope, 'repliesPage', 'mentions',
        () => ({ [mention.id]: { ...mention } })
        );
        return;
      }
      updateStore('repliesPage', 'mentions', () => ({ [mention.id]: { ...mention } }));
      return;
    }

    if (content.kind === Kind.NoteActions) {
      const noteActionContent = content as NostrNoteActionsContent;
      const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

      if (scope) {
        updateStore(scope, 'repliesPage', 'noteActions',
        () => ({ [noteActions.event_id]: { ...noteActions } })
        );
        return;
      }
      updateStore('repliesPage', 'noteActions', () => ({ [noteActions.event_id]: noteActions }));
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
  };

  const saveRepliesPage = (page: FeedPage, scope?: 'future') => {
    const newPosts = sortByRecency(convertToNotes(page));

    saveReplies(newPosts, scope);
  };


  const updateSidebar = (content: NostrEventContent) => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      updateStore('sidebar', 'users', () => ({ [user.pubkey]: user })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost].includes(content.kind)) {
      const message = content as NostrNoteContent;

      if (store.lastNote?.post?.noteId !== nip19.noteEncode(message.id)) {
        updateStore('sidebar', 'messages', (msgs) => [ ...msgs, message ]);
      }

      return;
    }

    if (content.kind === Kind.NoteStats) {
      const statistic = content as NostrStatsContent;
      const stat = JSON.parse(statistic.content);

      updateStore('sidebar', 'postStats', () => ({ [stat.event_id]: stat }));
      return;
    }

    if (content.kind === Kind.Mentions) {
      const mentionContent = content as NostrMentionContent;
      const mention = JSON.parse(mentionContent.content);

      updateStore('page', 'mentions', () => ({ [mention.id]: mention }));
      return;
    }

    if (content.kind === Kind.NoteActions) {
      const noteActionContent = content as NostrNoteActionsContent;
      const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

      updateStore('page', 'noteActions', () => ({ [noteActions.event_id]: noteActions }));
      return;
    }
  };

  const saveSidebar = (page: FeedPage) => {
    const newPosts = sortByScore(convertToNotes(page));

    updateStore('sidebar', 'notes', () => [ ...newPosts ]);
  };

  const setProfileKey = (profileKey?: string) => {
    updateStore('profileKey', () => profileKey);

    if (profileKey) {
      updateStore('filterReason', () => null);
      updateStore('userProfile', () => undefined);
      updateStore('userStats', () => ({ ...emptyStats }));
      getUserProfileInfo(profileKey, account?.publicKey, `profile_info_${APP_ID}`);
      getProfileScoredNotes(profileKey, account?.publicKey, `profile_scored_${APP_ID}`, 10);

      isUserFollowing(profileKey, account?.publicKey, `is_profile_following_${APP_ID}`);
    }
  }

  const refreshNotes = () => {
  };

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

        getEvents(account?.publicKey, ids, `profile_reposts_${APP_ID}`);
        return;
      }

      if (type === 'EVENT') {
        updatePage(content);
        return;
      }
    }

    if (subId === `profile_replies_${APP_ID}`) {
      if (type === 'EOSE') {
        saveRepliesPage(store.repliesPage);
        return;
      }

      if (type === 'EVENT') {
        updateRepliesPage(content);
        return;
      }
    }

    if (subId === `profile_info_${APP_ID}`) {
      if (content?.kind === Kind.FilteringReason) {
        const reason:  { action: 'block' | 'allow', pubkey?: string, group?: string } | null =
          JSON.parse(content.content) || null;

        if (reason?.action === 'block') {
          updateStore('filterReason', () => ({ ...reason }));
        }
      }

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

    // if (subId === `profile_oldest_${APP_ID}`) {
    //   if (content?.kind === Kind.OldestEvent) {
    //     const timestamp = Number.parseInt(content.content);
    //     if (isNaN(timestamp)) {
    //       updateStore('oldestNoteDate', () => undefined);
    //       return;
    //     }
    //     updateStore('oldestNoteDate', () => timestamp);
    //   }
    //   return;
    // }

    if (subId === `profile_contacts_${APP_ID}`) {
      if (content && content.kind === Kind.Contacts) {
        const tags = content.tags;
        let contacts: string[] = [];

        for (let i = 0;i<tags.length;i++) {
          const tag = tags[i];
          if (tag[0] === 'p') {
            contacts.push(tag[1]);
          }
        }

        updateStore('following', () => contacts);
      }
      return;
    }

    if (subId === `is_profile_following_${APP_ID}`) {
      if (type === 'EVENT') {
        updateStore('isProfileFollowing', JSON.parse(content?.content || 'false'))
        return;
      }
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

    if (subId === `profile_future_${APP_ID}`) {
      if (type === 'EOSE') {
        const reposts = parseEmptyReposts(store.future.page);
        const ids = Object.keys(reposts);

        if (ids.length === 0) {
          savePage(store.future.page, 'future');
          return;
        }

        updateStore('future', 'reposts', () => reposts);

        getEvents(account?.publicKey, ids, `profile_future_reposts_${APP_ID}`);

        return;
      }

      if (type === 'EVENT') {
        updatePage(content, 'future');
        return;
      }
    }

    if (subId === `profile_future_reposts_${APP_ID}`) {
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


  const [store, updateStore] = createStore<ProfileContextStore>({
    ...initialData,
    actions: {
      saveNotes,
      clearNotes,
      fetchNotes,
      fetchNextPage,
      updatePage,
      savePage,
      saveReplies,
      clearReplies,
      fetchReplies,
      fetchNextRepliesPage,
      updateRepliesPage,
      saveRepliesPage,
      setProfileKey,
      refreshNotes,
      checkForNewNotes,
      fetchContactList,
      fetchFollowerList,
      clearContacts,
      addContact,
      removeContact,
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
