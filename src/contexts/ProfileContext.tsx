import { nip19 } from "../lib/nTools";
import { createStore, reconcile } from "solid-js/store";
import { getEvents, getFutureUserFeed, getUserFeed } from "../lib/feed";
import { convertToArticles, convertToNotes, paginationPlan, parseEmptyReposts, sortByRecency, sortByScore } from "../stores/note";
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
  NostrRelays,
  NostrStatsContent,
  NostrUserContent,
  NostrUserZaps,
  NoteActions,
  PrimalArticle,
  PrimalNote,
  PrimalUser,
  PrimalZap,
  TopZap,
  UserStats,
  VanityProfiles,
} from "../types/primal";
import { APP_ID } from "../App";
import { hexToNpub } from "../lib/keys";
import {
  extractRelayConfigFromTags,
  getCommonFollowers,
  getProfileContactList,
  getProfileFollowerList,
  getProfileScoredNotes,
  getProfileZapList,
  getRelays,
  getUserProfileInfo,
  isUserFollowing,
} from "../lib/profile";
import { useAccountContext } from "./AccountContext";
import { setLinkPreviews } from "../lib/notes";
import { subscribeTo } from "../sockets";
import { parseBolt11 } from "../utils";
import { readRecomendedUsers, saveRecomendedUsers } from "../lib/localStore";
import { fetchUserArticles, fetchUserGallery } from "../handleNotes";
import { fetchUserZaps } from "../handleFeeds";
import { convertToUser } from "../stores/profile";


export type ProfileContextStore = {
  profileKey: string | undefined,
  userProfile: PrimalUser | undefined,
  userStats: UserStats,
  fetchedUserStats: boolean,
  knownProfiles: VanityProfiles,
  articles: PrimalArticle[],
  notes: PrimalNote[],
  replies: PrimalNote[],
  zaps: PrimalZap[],
  zappedNotes: PrimalNote[],
  zappedArticles: PrimalArticle[],
  gallery: PrimalNote[],
  zapListOffset: number,
  lastZap: PrimalZap | undefined,
  commonFollowers: PrimalUser[],
  future: {
    notes: PrimalNote[],
    articles: PrimalArticle[],
    page: FeedPage,
    replies: PrimalNote[],
    repliesPage: FeedPage,
    reposts: Record<string, string> | undefined,
  },
  contactListDate: number,
  isProfileFollowing: boolean,
  isFetching: boolean,
  isProfileFetched: boolean,
  isFetchingReplies: boolean,
  isFetchingGallery: boolean,
  page: FeedPage,
  repliesPage: FeedPage,
  reposts: Record<string, string> | undefined,
  lastNote: PrimalNote | undefined,
  lastArticle: PrimalArticle | undefined,
  lastReply: PrimalNote | undefined,
  lastGallery: PrimalNote | undefined,
  following: string[],
  sidebarNotes: FeedPage & { notes: PrimalNote[] },
  sidebarArticles: FeedPage & { notes: PrimalArticle[] },
  isFetchingSidebarArticles: boolean,
  filterReason: { action: 'block' | 'allow', pubkey?: string, group?: string } | null,
  contacts: PrimalUser[],
  followers: PrimalUser[],
  zappers: Record<string, PrimalUser>,
  isFetchingContacts: boolean,
  isFetchingFollowers: boolean,
  isFetchingZaps: boolean,
  isFetchingRelays: boolean,
  profileStats: Record<string, number>,
  relays: NostrRelays,
  profileHistory: {
    profiles: PrimalUser[],
    stats: Record<string, UserStats>,
  },
  actions: {
    saveNotes: (newNotes: PrimalNote[]) => void,
    clearNotes: () => void,
    saveReplies: (newNotes: PrimalNote[]) => void,
    clearReplies: () => void,
    clearZaps: () => void,
    fetchReplies: (noteId: string | undefined, until?: number) => void,
    fetchNextRepliesPage: () => void,
    fetchNotes: (noteId: string | undefined, until?: number) => void,
    fetchNextPage: () => void,
    fetchArticles: (noteId: string | undefined, until?: number) => void,
    fetchNextArticlesPage: () => void,
    clearArticles: () => void,
    fetchGallery: (noteId: string | undefined, until?: number) => void,
    fetchNextGalleryPage: () => void,
    clearGallery: () => void,
    updatePage: (content: NostrEventContent) => void,
    savePage: (page: FeedPage) => void,
    updateRepliesPage: (content: NostrEventContent) => void,
    saveRepliesPage: (page: FeedPage) => void,
    setProfileKey: (profileKey?: string) => void,
    refreshNotes: () => void,
    checkForNewNotes: (pubkey: string | undefined) => void,
    fetchContactList: (pubkey: string | undefined, extended?: boolean) => void,
    fetchFollowerList: (pubkey: string | undefined) => void,
    fetchRelayList: (pubkey: string | undefined) => void,
    clearContacts: () => void,
    clearFilterReason: () => void,
    removeContact: (pubkey: string) => void,
    addContact: (pubkey: string, source: PrimalUser[]) => void,
    fetchZapList: (pubkey: string | undefined) => void,
    fetchNextZapsPage: () => void,
    resetProfile: () => void,
  }
}

export const emptyStats = {
  pubkey: '',
  follows_count: 0,
  followers_count: 0,
  note_count: 0,
  reply_count: 0,
  time_joined: 0,
  total_zap_count: 0,
  total_satszapped: 0,
  relay_count: 0,
  media_count: 0,
};

export const initialData = {
  profileKey: undefined,
  userProfile: undefined,
  userStats: { ...emptyStats },
  fetchedUserStats: false,
  knownProfiles: { names: {} },
  articles: [],
  notes: [],
  replies: [],
  gallery: [],
  contactListDate: 0,
  isFetching: false,
  isProfileFetched: false,
  isFetchingReplies: false,
  isProfileFollowing: false,
  isFetchingZaps: false,
  isFetchingGallery: false,
  page: { messages: [], users: {}, postStats: {}, mentions: {}, noteActions: {}, topZaps: {} },
  repliesPage: { messages: [], users: {}, postStats: {}, mentions: {}, noteActions: {}, topZaps: {} },
  reposts: {},
  zaps: [],
  zappedNotes: [],
  zappedArticles: [],
  zappers: {},
  zapListOffset: 0,
  lastNote: undefined,
  lastArticle: undefined,
  lastReply: undefined,
  lastZap: undefined,
  lastGallery: undefined,
  following: [],
  filterReason: null,
  contacts: [],
  profileStats: {},
  isFetchingContacts: false,
  followers: [],
  isFetchingFollowers: false,
  relays: {},
  isFetchingRelays: false,
  commonFollowers: [],
  sidebarNotes: {
    messages: [],
    users: {},
    postStats: {},
    notes: [],
    topZaps: {},
    noteActions: {},
  },
  sidebarArticles: {
    messages: [],
    users: {},
    postStats: {},
    notes: [],
    topZaps: {},
    noteActions: {},
  },
  isFetchingSidebarArticles: false,
  future: {
    notes: [],
    articles: [],
    replies: [],
    reposts: {},
    page: {
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
      topZaps: {},
    },
    repliesPage: {
      messages: [],
      users: {},
      postStats: {},
      mentions: {},
      noteActions: {},
      topZaps: {},
    },
  },
  profileHistory: {
    profiles: [],
    stats: {},
  },
};

export const ProfileContext = createContext<ProfileContextStore>();

export const ProfileProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();

  let commonFollowers: PrimalUser[] = [];

// ACTIONS --------------------------------------



  const fetchZapList = async (pubkey: string | undefined, until = 0, offset = 0, indicateFetching = true) => {
    if (!pubkey) return;
    const subIdProfiles = `profile_zaps_${APP_ID}`;

    const { zaps, notes, articles } = await fetchUserZaps(pubkey, subIdProfiles, until, offset, 20);

    updateStore('zaps', (zs) => [ ...zs, ...zaps ]);
    updateStore('zappedNotes', (zn) => [ ...zn,  ...notes ]);
    updateStore('zappedArticles', (za) => [ ...za, ...articles ]);

    // let zapList: NostrUserZaps[] = [];

    // const unsubProfiles = subscribeTo(subIdProfiles, (type, _, content) => {
    //   if (type === 'EOSE') {
    //     // let zapsToAdd: PrimalZap[] = [];
    //     for (let i=0; i< zapList.length; i++) {
    //       const zapContent = zapList[i];

    //       const bolt11 = (zapContent.tags.find(t => t[0] === 'bolt11') || [])[1];
    //       const zapEvent = JSON.parse((zapContent.tags.find(t => t[0] === 'description') || [])[1] || '{}');
    //       const senderPubkey = zapEvent.pubkey as string;

    //       const zap: PrimalZap = {
    //         id: zapContent.id,
    //         message: zapEvent.content || '',
    //         amount: parseBolt11(bolt11) || 0,
    //         sender: store.zappers[senderPubkey],
    //         reciver: store.userProfile,
    //         created_at: zapContent.created_at,
    //       };

    //       // zapsToAdd.push(zap);
    //       updateStore('zaps', store.zaps.length, () => ({ ...zap }));
    //     }

    //     // updateStore('zaps', (zs) => [...zs, ...zapsToAdd]);

    //     // updateStore('zaps', store.zaps.length, () => ({
    //     //   amount: store.zaps[store.zaps.length -1].amount,
    //     //   id: 'PAGE_END',
    //     // }));

    //     updateStore('isFetchingZaps', () => false);
    //     unsubProfiles();
    //     return;
    //   }

    //   if (type === 'EVENT') {
    //     if (content?.kind === Kind.Zap) {
    //       zapList.push(content);
    //     }

    //     if (content?.kind === Kind.Metadata) {
    //       let user = JSON.parse(content.content);

    //       if (!user.displayName || typeof user.displayName === 'string' && user.displayName.trim().length === 0) {
    //         user.displayName = user.display_name;
    //       }
    //       user.pubkey = content.pubkey;
    //       user.npub = hexToNpub(content.pubkey);
    //       user.created_at = content.created_at;

    //       updateStore('zappers', () => ({ [user.pubkey]: { ...user } }));
    //       return;
    //     }
    //   }
    // });

    // if (store.lastZap) {
    //   updateStore('lastZap', () => ({ ...store.lastZap }));
    // }

    // indicateFetching && updateStore('isFetchingZaps', () => true);

    // getProfileZapList(pubkey, subIdProfiles, until, offset, 20);
  };

  const fetchNextZapsPage = () => {
    const lastZap = store.zaps[store.zaps.length - 1];

    if (!lastZap) {
      return;
    }

    // const lastAmount = lastZap.amount;

    // const offset = store.zaps.reduce((acc, zap) =>
    //   zap.amount === lastAmount ? acc+1 : acc,
    //   0,
    // );
    // const until = lastZap.amount || 0;

    updateStore('lastZap', () => ({ ...lastZap }));

    const until = lastZap.created_at || 0;

    if (until > 0 && store.profileKey) {
      fetchZapList(store.profileKey, until, 0, false);
    }
  };

  const addContact = (pubkey: string, source: PrimalUser[]) => {
    const newContact = source.find(c => c.pubkey === pubkey);

    newContact && updateStore('contacts', store.contacts.length, reconcile(newContact));
  };

  const removeContact = (pubkey: string) => {
    const newContacts = store.contacts.filter(c => c.pubkey !== pubkey);

    updateStore('contacts', reconcile(newContacts));

  };

  const fetchContactList = (pubkey: string | undefined, extended = true) => {
    if (!pubkey) return;

    updateStore('isFetchingContacts', () => true);

    const subIdContacts = `profile_contacts_${APP_ID}`;

    const unsubContacts = subscribeTo(subIdContacts, (type, _, content) => {

      if (type === 'EOSE') {
        updateStore('isFetchingContacts', () => false);
        unsubContacts();
        return;
      }

      if (type === 'EVENT') {
        if (content?.kind === Kind.Contacts) {
          updateStore('contactListDate', () => content.created_at || 0);
        }

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

    getProfileContactList(pubkey, subIdContacts, extended);
  };


  const fetchRelayList = (pubkey: string | undefined) => {
    if (!pubkey) return;

    const subIdRelays = `profile_relays_${APP_ID}`;

    const unsubContacts = subscribeTo(subIdRelays, (type, _, content) => {

      if (type === 'EOSE') {
        updateStore('isFetchingRelays', () => false);
        unsubContacts();
        return;
      }

      if (type === 'EVENT') {
        if (content?.kind === Kind.UserRelays) {
          const relays = extractRelayConfigFromTags(content.tags);

          updateStore('relays', reconcile(relays));
          return;
        }
      }
    });

    updateStore('isFetchingRelays', () => true);

    getRelays(pubkey, subIdRelays);
  };

  const fetchFollowerList = (pubkey: string | undefined) => {
    if (!pubkey) return;
    const subIdProfiles = `profile_followers_${APP_ID}`;

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

    updateStore('isFetchingFollowers', () => true);

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

  const saveArticles = (newNotes: PrimalArticle[], scope?: 'future') => {
    if (scope) {
      updateStore(scope, 'articles', (notes) => [ ...notes, ...newNotes ]);
      loadFutureContent();
      return;
    }
    updateStore('articles', (notes) => [ ...notes, ...newNotes ]);
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

  const fetchArticles = async (pubkey: string | undefined, until = 0, limit = 20) => {
    if (!pubkey) {
      return;
    }

    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));
    updateStore('isFetching', () => true);
    let articles = await fetchUserArticles(account?.publicKey, pubkey, 'authored', `profile_articles_1_${APP_ID}`, until, limit);

    articles = articles.filter(a => a.id !== store.lastArticle?.id);

    updateStore('articles', (arts) => [ ...arts, ...articles]);
    updateStore('isFetching', () => false);
  }

  const fetchNotes = (pubkey: string | undefined, until = 0, limit = 20) => {
    if (!pubkey) {
      return;
    }

    updateStore('isFetching', () => true);
    updateStore('page', () => ({ messages: [], users: {}, postStats: {} }));
    getUserFeed(account?.publicKey, pubkey, `profile_feed_${APP_ID}`, 'authored', undefined, until, limit);
  }

  const fetchReplies = (pubkey: string | undefined, until = 0, limit = 20) => {
    if (!pubkey) {
      return;
    }

    updateStore('isFetchingReplies', () => true);
    updateStore('repliesPage', () => ({ messages: [], users: {}, postStats: {} }));
    getUserFeed(account?.publicKey, pubkey, `profile_replies_${APP_ID}`, 'replies', undefined, until, limit);
  }

  const fetchGallery = async (pubkey: string | undefined, until = 0, limit = 20) => {
    if (!pubkey) {
      return;
    }

    updateStore('isFetchingGallery', () => true);
    let gallery = await fetchUserGallery(account?.publicKey, pubkey, 'user_media_thumbnails', `profile_gallery_${APP_ID}`, until, limit);

    updateStore('gallery', (arts) => [ ...arts, ...gallery]);
    updateStore('isFetchingGallery', () => false);
  }

  const fetchNextGalleryPage = () => {
    const lastNote = store.gallery[store.gallery.length - 1];

    if (!lastNote) {
      return;
    }

    updateStore('lastGallery', () => ({ ...lastNote }));

    const criteria = paginationPlan('latest');

    const noteData: Record<string, any> =  lastNote.repost ?
      lastNote.repost.note :
      lastNote.post;

    const until = noteData[criteria];

    if (until > 0 && store.profileKey) {
      fetchGallery(store.profileKey, until);
    }
  };

  const clearGallery = () => {
    updateStore('gallery', () => []);
    updateStore('lastGallery', () => undefined);
  };

  const clearNotes = () => {
    updateStore('page', () => ({ messages: [], users: {}, postStats: {}, noteActions: {} }));
    updateStore('notes', () => []);
    updateStore('reposts', () => undefined);
    updateStore('lastNote', () => undefined);
    updateStore('sidebarNotes', () => ({
      messages: [],
      users: {},
      postStats: {},
      notes: [],
      noteActions: {},
    }));
    updateStore('sidebarArticles', () => ({
      messages: [],
      users: {},
      postStats: {},
      notes: [],
      noteActions: {},
    }));
  };

  const clearArticles = () => {
    updateStore('articles', () => []);
    updateStore('lastArticle', () => undefined);
  };

  const clearReplies = () => {
    updateStore('repliesPage', () => ({ messages: [], users: {}, postStats: {}, noteActions: {} }));
    updateStore('replies', () => []);
    updateStore('lastReply', () => undefined);
  };

  const clearZaps = () => {
    updateStore('zaps', () => []);
    updateStore('zappers', reconcile({}));
    updateStore('lastZap', () => undefined);
  };

  const clearContacts = () => {
    updateStore('contacts', () => []);
    updateStore('followers', () => []);
    // @ts-ignore
    updateStore('profileStats', () => undefined);
    updateStore('profileStats', () => ({}));
  };

  const clearFilterReason = () => {
    updateStore('filterReason', () => null);
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

  const fetchNextArticlesPage = () => {
    const lastArticle = store.articles[store.articles.length - 1];

    if (!lastArticle) {
      return;
    }

    updateStore('lastArticle', () => ({ ...lastArticle }));

    const until = parseInt((lastArticle.msg.tags.find(t => t[0] === 'published_at') || [])[1] || '0');

    if (!isNaN(until) && until > 0 && store.profileKey) {
      fetchArticles(store.profileKey, until);
    }
  };

  const fetchNextRepliesPage = () => {
    const lastReply = store.replies[store.replies.length - 1];

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
        topZaps: {},
      },
      repliesPage: {
        messages: [],
        users: {},
        postStats: {},
        mentions: {},
        noteActions: {},
        topZaps: {},
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

    if ([Kind.LongForm, Kind.LongFormShell].includes(content.kind)) {
      const message = content as NostrNoteContent;
      const messageId = nip19.naddrEncode({ kind: Kind.LongForm, pubkey: message.pubkey, identifier: (message.tags.find(t => t[0] === 'd') || [])[1]});

      if (scope) {
        const isFirstNote = store.articles[0]?.noteId === messageId;

          if (!isFirstNote) {
            updateStore(scope, 'page', 'messages',
              (msgs) => [ ...msgs, { ...message }]
            );
          }
        return;
      }

      const isLastNote = store.lastArticle?.noteId === messageId;

      if (!isLastNote) {
        updateStore('page', 'messages', messages => [ ...messages, message]);
      }

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
    const topZaps = scope ? store[scope].page.topZaps : store.page.topZaps;
    const newPosts = sortByRecency(convertToNotes(page, topZaps));

    saveNotes(newPosts, scope);
  };

  const saveArticlesPage = (page: FeedPage, scope?: 'future') => {
    const topZaps = scope ? store[scope].page.topZaps : store.page.topZaps;
    const newPosts = convertToArticles(page, topZaps);

    saveArticles(newPosts, scope);
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
        const oldZaps = store[scope].repliesPage.topZaps[eventId];

        if (oldZaps === undefined) {
          updateStore(scope, 'repliesPage', 'topZaps', () => ({ [eventId]: [{ ...zap }]}));
          return;
        }

        if (oldZaps.find(i => i.id === zap.id)) {
          return;
        }

        const newZaps = [ ...oldZaps, { ...zap }].sort((a, b) => b.amount - a.amount);

        updateStore(scope, 'repliesPage', 'topZaps', eventId, () => [ ...newZaps ]);
        return;
      }

      const oldZaps = store.repliesPage.topZaps[eventId];

      if (oldZaps === undefined) {
        updateStore('repliesPage', 'topZaps', () => ({ [eventId]: [{ ...zap }]}));
        return;
      }

      if (oldZaps.find(i => i.id === zap.id)) {
        return;
      }

      const newZaps = [ ...oldZaps, { ...zap }].sort((a, b) => b.amount - a.amount);

      updateStore('repliesPage', 'topZaps', eventId, () => [ ...newZaps ]);

      return;
    }
  };

  const saveRepliesPage = (page: FeedPage, scope?: 'future') => {
    const newPosts = sortByRecency(convertToNotes(page));

    saveReplies(newPosts, scope);
  };


  const updateSidebar = (content: NostrEventContent, scope: 'sidebarNotes' | 'sidebarArticles' = 'sidebarNotes') => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      updateStore(scope, 'users', () => ({ [user.pubkey]: user })
      );
      return;
    }

    if ([Kind.Text, Kind.Repost, Kind.LongForm].includes(content.kind)) {
      const message = content as NostrNoteContent;

      if (store.lastNote?.post?.noteId !== nip19.noteEncode(message.id)) {
        updateStore(scope, 'messages', (msgs) => [ ...msgs, message ]);
      }

      return;
    }

    if (content.kind === Kind.NoteStats) {
      const statistic = content as NostrStatsContent;
      const stat = JSON.parse(statistic.content);

      updateStore(scope, 'postStats', () => ({ [stat.event_id]: stat }));
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

  const saveSidebar = (page: FeedPage, scope: 'sidebarNotes' | 'sidebarArticles' = 'sidebarNotes') => {

    if (scope === 'sidebarNotes') {
     const newPosts = sortByScore(convertToNotes(page));
      updateStore(scope, 'notes', () => [ ...newPosts ]);
    }

    if (scope === 'sidebarArticles') {
      const newPosts = convertToArticles(page);
      updateStore(scope, 'notes', () => [ ...newPosts ]);
    }

  };



  const updateCommonFollowers = (content: NostrEventContent, scope: 'sidebarNotes' | 'sidebarArticles' = 'sidebarNotes') => {
    if (content.kind === Kind.Metadata) {
      const user = content as NostrUserContent;

      commonFollowers.push(convertToUser(user));
      return;
    }
  };

  const saveCommonFollowers = () => {
    updateStore('commonFollowers', () => [ ...commonFollowers ]);
    commonFollowers = [];
  };

  const setProfileKey = async (profileKey?: string) => {
    if (profileKey === store.profileKey) return;

    updateStore('profileKey', () => profileKey);

    if (profileKey) {
      updateStore('filterReason', () => null);
      updateStore('userProfile', () => undefined);
      updateStore('userStats', () => ({ ...emptyStats }));
      updateStore('fetchedUserStats', () => false);
      updateStore('isProfileFetched', () => false);
      updateStore('commonFollowers', () => []);
      getUserProfileInfo(profileKey, account?.publicKey, `profile_info_${APP_ID}`);
      getProfileScoredNotes(profileKey, account?.publicKey, `profile_scored_${APP_ID}`, 5);
      getCommonFollowers(profileKey, account?.publicKey, `profile_cf_${APP_ID}`, 5);

      updateStore('isFetchingSidebarArticles', () => true);
      const articles = await fetchUserArticles(account?.publicKey, profileKey, 'authored', `profile_articles_latest_${APP_ID}`, 0, 2);

      updateStore('sidebarArticles', () => ({ notes: [...articles ]}))
      updateStore('isFetchingSidebarArticles', () => false);

      isUserFollowing(profileKey, account?.publicKey, `is_profile_following_${APP_ID}`);
    }
  }

  const resetProfile = () => {
    updateStore('isProfileFetched', () => false);
    updateStore('profileKey', () => undefined);
    updateStore('userProfile', () => undefined);
    updateStore('isFetching', () => false);
    updateStore('commonFollowers', () => []);
    updateStore('userStats', reconcile(emptyStats));
  };

  const refreshNotes = () => {
  };

  const addProfileToHistory = (user: PrimalUser) => {
    let list = [...store.profileHistory.profiles];

    const index = list.findIndex(u => u.pubkey === user.pubkey)

    // user is first in the list so the job is done
    if (index === 0) return;

    if (index > 0) {
      list.splice(index, 1);

      updateStore('profileHistory', 'profiles', () => [user, ...list]);

      return;
    }

    list.unshift(user);

    if (list.length > 10) {
      const last = list[list.length - 1].pubkey;

      let stats = { ...store.profileHistory.stats };

      delete stats[last];

      updateStore('profileHistory', 'stats', reconcile(stats));

      list.pop()
    }

    updateStore('profileHistory', 'profiles', () => [...list]);
  };

  const addStatsToHistory = (stats: UserStats) => {
    updateStore('profileHistory', 'stats', () => ({ [stats.pubkey]: stats }));
  };

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === `profile_articles_${APP_ID}`) {
      if (type === 'EOSE') {
        const reposts = parseEmptyReposts(store.page);
        const ids = Object.keys(reposts);

        if (ids.length === 0) {
          saveArticlesPage(store.page);
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
      if (type === 'EOSE') {
        updateStore('isProfileFetched', () => true);
        return;
      }

      if (content?.kind === Kind.FilteringReason) {
        const reason:  { action: 'block' | 'allow', pubkey?: string, group?: string } | null =
          JSON.parse(content.content) || null;

        if (reason?.action === 'block') {
          updateStore('filterReason', () => ({ ...reason }));
        } else {
          updateStore('filterReason', () => null);
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

        updateStore('userProfile', () => ({ ...user }));
        addProfileToHistory(user);
        return;
      }

      if (content?.kind === Kind.UserStats) {
        const stats = JSON.parse(content.content);

        updateStore('userStats', () => ({ ...stats }));
        addStatsToHistory(stats)
        updateStore('fetchedUserStats', () => true);
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
        saveSidebar(store.sidebarNotes);
        return;
      }

      if (type === 'EVENT') {
        updateSidebar(content);
        return;
      }
    }

    if (subId === `profile_cf_${APP_ID}`) {
      if (type === 'EOSE') {
        saveCommonFollowers();
        return;
      }

      if (type === 'EVENT') {
        updateCommonFollowers(content);
        return;
      }
    }

    // if (subId === `profile_articles_latest_${APP_ID}`) {
    //   if (type === 'EOSE') {
    //     saveSidebar(store.sidebarArticles, 'sidebarArticles');
    //     return;
    //   }

    //   if (type === 'EVENT') {
    //     updateSidebar(content, 'sidebarArticles');
    //     return;
    //   }
    // }

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

  createEffect(() => {
    if (account && account.hasPublicKey()) {
      const history = readRecomendedUsers(account.publicKey);

      history && updateStore('profileHistory', reconcile(history));
    }
  });

  createEffect(() => {
    const profiles = [...store.profileHistory.profiles];
    const stats = { ...store.profileHistory.stats };

    saveRecomendedUsers(account?.publicKey, { profiles, stats });
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
      fetchArticles,
      fetchNextArticlesPage,
      clearArticles,
      fetchGallery,
      fetchNextGalleryPage,
      clearGallery,
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
      fetchRelayList,
      clearContacts,
      addContact,
      removeContact,
      fetchZapList,
      fetchNextZapsPage,
      clearZaps,
      resetProfile,
      clearFilterReason,
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
