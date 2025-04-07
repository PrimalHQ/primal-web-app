import { createStore } from "solid-js/store";
import { Kind } from "../constants";
import {
  createContext,
  createEffect,
  on,
  useContext
} from "solid-js";
import {
  isConnected,
  subsTo
} from "../sockets";
import {
  ContextChildren,
  DirectMessage,
  FeedPage,
  NostrEventContent,
  NostrMentionContent,
  NostrMessageEncryptedContent,
  NostrNoteActionsContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  NoteActions,
  PrimalArticle,
  PrimalNote,
  PrimalUser,
  UserRelation,
} from "../types/primal";
import { APP_ID } from "../App";
import { markAllAsRead, resetMessageCount, subscribeToMessagesStats, unsubscribeToMessagesStats } from "../lib/messages";
import { useAccountContext } from "./AccountContext";
import { convertToUser, emptyUser } from "../stores/profile";
import { getUserProfiles } from "../lib/profile";
import { getEvents } from "../lib/feed";
import { nip19 } from "../lib/nTools";
import { convertToNotes } from "../stores/note";
import { importEvents, sanitize, sendEvent } from "../lib/notes";
import { decrypt, encrypt } from "../lib/nostrAPI";
import { saveLastDMConversations, saveLastDMRelation } from "../lib/localStore";
import { useAppContext } from "./AppContext";
import { calculateDMContactsOffset, calculateDMConversationOffset, handleSubscriptionAsync } from "../utils";
import { DMContact, emptyPaging, fetchDMContacts, fetchDMConversation, fetchDMConversationNew, PaginationInfo } from "../megaFeeds";
import { logError, logWarning } from "../lib/logger";
import { fetchUserProfile } from "../handleNotes";
import { hexToNpub } from "../lib/keys";


export type DMCount = {
  cnt: number,
  latest_at: number,
  latest_event_id: string,
};

export type DMStore = {
  dmCountPerContact: Record<string, DMCount>,
  dmCountUnread: number,
  dmContacts: Record<UserRelation, DMContact[]>,
  contactsPaging: PaginationInfo,
  dmCount: number,
  lastMessageCheck: number,
  lastConversationContact: DMContact | undefined,
  lastConversationRelation: UserRelation,

  encryptedMessages: NostrMessageEncryptedContent[],
  messages: DirectMessage[],
  conversationPaging: PaginationInfo,
  isFetchingMessages: boolean,

  referecedUsers: Record<string, PrimalUser>,
  referecedNotes: Record<string, PrimalNote>,
  referecedReads: Record<string, PrimalArticle>,
  referencePage: FeedPage,

  actions: {
    setDmContacts: (contacts: DMContact[], relation: UserRelation) => void,
    setDmRelation: (relation: UserRelation) => Promise<void>,
    setDmRelation2: (relation: UserRelation) => void,
    getContacts: (relation: UserRelation) => Promise<void>,
    getContactsNextPage: (relation: UserRelation) => void,
    refreshContacts: (relation: UserRelation) => void,
    selectContact: (pubkey: string) => Promise<void>,
    addContact: (user: PrimalUser) => void,
    getConversation: (contact: string | null, until: number) => void,
    getConversationNextPage: () => void,
    sendMessage: (reciever: string, message: DirectMessage) => Promise<boolean>,
    resetAllMessages: () => Promise<boolean>,
    resetRelation: () => void,
  },

};

export const emptyDMContacts = () => ({
  any: [],
  follows: [],
  other: [],
}) as Record<UserRelation, DMContact[]>;

export const emptyDMStore: () => Omit<DMStore, 'actions'> = () => ({
  dmCountPerContact: {},
  dmCountUnread: 0,
  dmContacts: { ...emptyDMContacts() },
  contactsPaging: { ...emptyPaging() },
  dmCount: 0,
  lastMessageCheck: 0,
  lastConversationContact: undefined,
  lastConversationRelation: 'follows',

  encryptedMessages: [],
  messages: [],
  conversationPaging: { ...emptyPaging() },
  isFetchingMessages: false,

  referecedUsers: {},
  referecedNotes: {},
  referecedReads: {},
  referencePage: {
    messages: [],
    users: {},
    postStats: {},
    mentions: {},
    noteActions: {},
    topZaps: {},
  },
});


export const DMContext = createContext<DMStore>();

export const DMProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();
  const app = useAppContext();

  let unsubFromDMCount: (() => void) | undefined;

  let subIdMsgCount = '';

  const subidMsgCount = () => `dm_count_${Math.random() * 35_000}_${APP_ID}`;

// ACTIONS --------------------------------------

const setDmContacts = (contacts: DMContact[], relation: UserRelation, opts?: { update: 'add' | 'clear' | 'replace' }) => {
  const replace = opts?.update || 'add';

  const existingContacts = store.dmContacts[relation];
  const existingPubkeys = existingContacts.map(c => c.pubkey);

  let sorted: DMContact[] = [];

  if (replace === 'replace') {
    sorted = [ ...contacts ].
      sort((a, b) => b.dmInfo.latest_at - a.dmInfo.latest_at);

    const extra = existingContacts.filter(e => !contacts.map(c => c.pubkey).includes(e.pubkey));

    sorted = [ ...extra, ...sorted];
  }
  else if (replace === 'add') {
    const filtered = contacts.filter(c => !existingPubkeys.includes(c.pubkey));

    sorted = [...filtered].
      sort((a, b) => b.dmInfo.latest_at - a.dmInfo.latest_at);

    sorted = [...existingContacts, ...sorted]
  } else {
    sorted = [ ...contacts ].
      sort((a, b) => b.dmInfo.latest_at - a.dmInfo.latest_at);
  }

  updateStore('dmContacts', relation, () => [ ...sorted ]);

  const selected = contacts.find(c => c.pubkey === store.lastConversationContact?.pubkey);

  if (selected) {
    updateStore('lastConversationContact', 'dmInfo', 'cnt', () => selected.dmInfo.cnt);
    updateStore('lastConversationContact', 'dmInfo', 'latest_at', () => selected.dmInfo.latest_at);
    updateStore('lastConversationContact', 'dmInfo', 'latest_event_id', () => selected.dmInfo.latest_event_id);
  }
}

const resetRelation = () => {
  updateStore('lastConversationRelation', () => 'any');
}

const setDmRelation = async (relation: UserRelation) => {
  if (!account?.publicKey) return;

  updateStore('contactsPaging', () => ({ ...emptyPaging() }))
  updateStore('lastConversationRelation', () => relation);
  saveLastDMRelation(account.publicKey, relation);


  return await getContacts(relation);
}

const setDmRelation2 = (relation: UserRelation) => {
  if (!account?.publicKey) return;

  updateStore('contactsPaging', () => ({ ...emptyPaging() }))
  updateStore('lastConversationRelation', () => relation);
  saveLastDMRelation(account.publicKey, relation);


  replaceContacts(relation);
}

const replaceContacts = async (relation: UserRelation) => {

  const existing = store.dmContacts[relation] || [];

  const { dmContacts, paging } = await fetchDMContacts(
    account?.publicKey,
    relation,
    `dm_contacts_${relation}_${APP_ID}`,
    {
      limit: existing.length,
    }
  );

  updateStore('contactsPaging', () => ({ ...paging }));
  setDmContacts(dmContacts, relation, { update: 'clear' });
}

const refreshContacts = async (relation: UserRelation) => {

  const existing = store.dmContacts[relation] || [];

  const { dmContacts, paging } = await fetchDMContacts(
    account?.publicKey,
    relation,
    `dm_contacts_${relation}_${APP_ID}`,
    {
      limit: existing.length,
    }
  );

  updateStore('contactsPaging', () => ({ ...paging }));
  setDmContacts(dmContacts, relation, { update: 'replace' });
}

const getContacts = async (relation: UserRelation) => {

  const existing = store.dmContacts[relation] || [];

  const since = store.contactsPaging.since || 0;
  const offset = calculateDMContactsOffset(existing, store.conversationPaging)

  const { dmContacts, paging } = await fetchDMContacts(
    account?.publicKey,
    relation,
    `dm_contacts_${relation}_${APP_ID}`,
    {
      limit: 20,
      since,
      offset,
    }
  );

  updateStore('contactsPaging', () => ({ ...paging }));
  return setDmContacts(dmContacts, relation, { update: 'replace' });
}

const getContactsNextPage = async (relation: UserRelation) => {

  // const existing = store.dmContacts[relation] || [];

  const since = store.contactsPaging.since || 0;
  const offset = 1//calculateDMContactsOffset(existing, store.conversationPaging)

  if (since === 0) return;

  const { dmContacts, paging } = await fetchDMContacts(
    account?.publicKey,
    relation,
    `dm_contacts_${relation}_${APP_ID}`,
    {
      limit: 20,
      since,
      offset,
    }
  );

  updateStore('contactsPaging', () => ({ ...paging }));
  setDmContacts(dmContacts, relation);
}

let atemptToSelect: string = '';

const selectContact = async (pubkey: string) => {
  if (store.isFetchingMessages) return;
  if (!account?.publicKey) return;
  if (atemptToSelect === pubkey) return;

  atemptToSelect = pubkey;

  const relation = store.lastConversationRelation;
  let contact = store.dmContacts[relation].find(c => c.pubkey === pubkey);

  if (!contact) {
    try {
      let user = await fetchUserProfile(account?.publicKey, pubkey, `dm_contact_info_${APP_ID}`);

      addContact(user);

      contact = {
        pubkey: user.pubkey,
        user,
        dmInfo: {
          cnt: 0,
          latest_at: 0,
          latest_event_id: '',
        }
      }
    } catch (e) {
      contact = {
        pubkey,
        user: { ...emptyUser(pubkey) },
        dmInfo: {
          cnt: 0,
          latest_at: 0,
          latest_event_id: '',
        }
      };
    }

  }

  await resetContactMessages(contact.pubkey, relation);

  updateStore('lastConversationContact', () => ({ ...contact }));
  saveLastDMConversations(account.publicKey, pubkey);

  updateStore('messages', () => []);
  updateStore('conversationPaging', () => ({ ...emptyPaging() }));
  updateStore('isFetchingMessages', () => true);

  await getConversation(pubkey);

  atemptToSelect = '';
  // refreshContacts(relation);
}

const addContact = async (user: PrimalUser) => {
  const isFollowing = account?.following.includes(user.pubkey);

  const contact: DMContact =  {
    pubkey: user.pubkey,
    user: {...user},
    dmInfo: {
      cnt: 0,
      latest_at: 0,
      latest_event_id: '',
    }
  }

  if (isFollowing) {
    await setDmRelation('follows');

    if (store.dmContacts.follows.find(c => c.pubkey === user.pubkey)) {
      selectContact(user.pubkey);
      return;
    }

    updateStore('dmContacts', 'follows', (cs) => [{ ...contact }, ...cs ]);
  }
  else {
    await setDmRelation('other');

    if (store.dmContacts.other.find(c => c.pubkey === user.pubkey)) {
      selectContact(user.pubkey);
      return;
    }
    updateStore('dmContacts', 'other', (cs) => [{ ...contact }, ...cs ]);
  }

  selectContact(user.pubkey);
}

const handleMsgCoversationEvent = (content: NostrEventContent) => {
  if (content?.kind === Kind.EncryptedDirectMessage) {
    updateStore('encryptedMessages', (conv) => [ ...conv, {...content}]);
  }
}


const actualDecrypt = (pubkey: string, message: string) => {
  return new Promise<string>((resolve) => {
    decrypt(pubkey, message).then((m) => {
      resolve(m)
    }).catch((reason) => {
      logWarning('Failed to decrypt, will retry: ', message, reason);
      resolve('');
    });
  });
}

const decryptMessages = async (contact: string, encrypted: NostrMessageEncryptedContent[],  then: (messages: DirectMessage[]) => void) => {

  let newMessages: DirectMessage[] = [];

  for (let i = 0; i < encrypted.length; i++) {
    const eMsg = encrypted[i];

    try {
      const content = await actualDecrypt(contact, eMsg.content);

      if (content === '') {
        throw(eMsg.content);
      }

      const msg: DirectMessage = {
        sender: eMsg.pubkey,
        content: sanitize(content),
        created_at: eMsg.created_at,
        id: eMsg.id,
      };

      newMessages.push(msg);
    } catch (e) {
      console.warn('Falied to decrypt message: ', e);
      continue;
    }
  }

  await parseForMentions(newMessages);

  then(newMessages);
};


const parseForMentions = async (messages: DirectMessage[]) => {
  const noteRegex = /\bnostr:((note|nevent)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)\b|#\[(\d+)\]/g;
  const userRegex = /\bnostr:((npub|nprofile)1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)\b|#\[(\d+)\]/g;

  let noteRefs = [];
  let userRefs = [];
  let match;

  for (let i=0; i<messages.length; i++) {
    const message = messages[i];

    while((match = noteRegex.exec(message.content)) !== null) {
      noteRefs.push(match[1]);
    }

    while((match = userRegex.exec(message.content)) !== null) {
      userRefs.push(match[1]);
    }
  }

  const pubkeys = userRefs.map((x) => {
    try {
      const decoded = nip19.decode(x);
      if (decoded.type === 'npub') {
        return decoded.data;
      }

      if (decoded.type === 'nprofile') {
        return decoded.data.pubkey;
      }

      return '';
    } catch (e) {
      logWarning('Unable to decode npub: ', e);
      return '';
    }
  }).filter(x => x.length > 0);

  const noteIds = noteRefs.map(x => {
    const decoded = nip19.decode(x);

    if (decoded.type === 'note') {
      return decoded.data;
    }

    if (decoded.type === 'nevent') {
      return decoded.data.id;
    }

    return '';

  });

  updateStore('referencePage', () => ({
    messages: [],
    users: {},
    postStats: {},
    mentions: {},
    noteActions: {},
  }));

  const subidNoteRef = `msg_note_ ${APP_ID}`;
  const subidUserRef = `msg_user_ ${APP_ID}`;

  await handleSubscriptionAsync(
    subidUserRef,
    () => getUserProfiles(pubkeys, subidUserRef),
    handleUserRefEvent,
    handleUserRefEose,
  );

  await handleSubscriptionAsync(
    subidNoteRef,
    () => getEvents(account?.publicKey, noteIds, subidNoteRef, true),
    handleNoteRefEvent,
    handleNoteRefEose,
  );
};

const getConversation = async (contact: string | null | undefined) => {
  if (!account?.isKeyLookupDone || !account.hasPublicKey() || !contact) {
    return;
  }

  updateStore('encryptedMessages', () => []);

  const subId = `dm_conversation_ ${APP_ID}`;

  const since = store.conversationPaging.since || 0;
  const offset = calculateDMConversationOffset(store.messages, store.conversationPaging)

  const { encryptedMessages, paging } = await fetchDMConversation(
    account.publicKey,
    contact,
    subId,
    {
      limit: 20,
      since,
      offset
    }
  );

  updateStore('encryptedMessages', () => [...encryptedMessages]);
  updateStore('conversationPaging', () => ({ ...paging }));

  decryptMessages(contact, store.encryptedMessages, (newMessages) => {
    updateStore('messages', (conv) => [ ...conv, ...newMessages ]);
    updateStore('isFetchingMessages', () => false);
  });
};

const getConversationNextPage = () => {
  if (store.messages.length === 0 || !store.conversationPaging.since) return;

  getConversation(store.lastConversationContact?.pubkey)
};

const getConversationNewMessages = async (contact: string | null | undefined) => {
  if (!contact) return;

  updateStore('encryptedMessages', () => []);

  const subId = `dm_conversation_new_ ${APP_ID}`;

  const since = store.conversationPaging.until || 0;
  // const offset = calculateDMConversationOffset(store.messages, store.conversationPaging)

  const { encryptedMessages, paging } = await fetchDMConversationNew(
    account?.publicKey,
    contact,
    subId,
    {
      limit: 20,
      since,
      offset: 0,
    }
  );

  updateStore('encryptedMessages', () => [...encryptedMessages]);
  updateStore('conversationPaging', () => ({ ...paging }));

  decryptMessages(contact, store.encryptedMessages, (newMessages) => {
    const existing = store.messages.map(m => m.id);
    const filtered = newMessages.filter(m => !existing.includes(m.id));

    updateStore('messages', (conv) => [ ...filtered, ...conv ]);
    updateStore('isFetchingMessages', () => false);

    resetContactMessages(contact, store.lastConversationRelation);
  });
};

const updateRefUsers = () => {
  const refs = store.referencePage.users;

  const users = Object.keys(refs).reduce((acc, id) => {
    const user = convertToUser(refs[id], id);
    return {...acc, [user.pubkey]: { ...user }};
  }, {});

  updateStore('referecedUsers', (usrs) => ({ ...usrs, ...users }));
};

const updateRefNotes = () => {
  const refs = convertToNotes(store.referencePage) || [];

  const notes = refs.reduce((acc, note) => {
    return { ...acc, [note.post.noteId]: note };
  }, {});

  updateStore('referecedNotes', (nts) => ({ ...nts, ...notes }));
};

const addToConversation = (messagesToAdd: DirectMessage[], ignoreMy?: boolean) => {

  for (let i=0;i<messagesToAdd.length;i++) {
    const message = messagesToAdd[i];

    if (ignoreMy && message.sender === account?.publicKey) {
      return;
    }

    updateStore('messages', (ms) => [{...message}, ...ms]);

  };
};

const sendMessage = async (receiver: string, message: DirectMessage) => {

  if (!account) {
    return false;
  }

  try {
    const content = await encrypt(receiver, message.content);

    const event = {
      content,
      kind: Kind.EncryptedDirectMessage,
      tags: [['p', receiver]],
      created_at: Math.floor((new Date).getTime() / 1000),
    };

    const { success, note } = await sendEvent(event, account.activeRelays, account?.relaySettings, account?.proxyThroughPrimal || false);

    if (success && note) {
      const subId = `import_dm_${APP_ID}`;

      const unsub = subsTo(subId, {
        onEose: () => {
          unsub();
          const msg = { ...message, content: sanitize(message.content) };
          addToConversation([msg]);

          refreshContacts(store.lastConversationRelation);
        }
      });

      importEvents([note], subId);
    }

    return success;
  } catch (reason) {
    logError('Failed to send message: ', reason);
    return false;
  }
};

const resetAllMessages = async () => {
  return await markAllAsRead(`dm_all_read_${APP_ID}`);
};

const resetContactMessages = async (pubkey: string, relation: UserRelation) => {
  const success =  await resetMessageCount(pubkey, `dm_reset_msg_${pubkey}_${APP_ID}`);

  if (success) {
    updateStore('dmContacts', relation, c => c.pubkey === pubkey, 'dmInfo', 'cnt', () => 0);
    if (store.lastConversationContact) {
      updateStore('lastConversationContact', 'dmInfo', 'cnt', () => 0);
    }
  }

  return success;
};

const handleUserRefEvent = (content: NostrEventContent) => {
  if (content?.kind === Kind.Metadata) {
    const user = content as NostrUserContent;

    updateStore('referencePage', 'users',
      (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
    );
  }
}

const handleUserRefEose = () => {
  updateRefUsers();
}

const handleNoteRefEvent = (content: NostrEventContent) => {
  if (content?.kind === Kind.Metadata) {
    const user = content as NostrUserContent;

    updateStore('referencePage', 'users',
      (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
    );
  }

  if ([Kind.Text, Kind.Repost].includes(content.kind)) {
    const message = content as NostrNoteContent;

    updateStore('referencePage', 'messages',
      (msgs) => [ ...msgs, { ...message }]
    );

    return;
  }

  if (content.kind === Kind.NoteStats) {
    const statistic = content as NostrStatsContent;
    const stat = JSON.parse(statistic.content);

    updateStore('referencePage', 'postStats',
      (stats) => ({ ...stats, [stat.event_id]: { ...stat } })
    );
    return;
  }

  if (content.kind === Kind.Mentions) {
    const mentionContent = content as NostrMentionContent;
    const mention = JSON.parse(mentionContent.content);

    updateStore('referencePage', 'mentions',
      (mentions) => ({ ...mentions, [mention.id]: { ...mention } })
    );
    return;
  }

  if (content.kind === Kind.NoteActions) {
    const noteActionContent = content as NostrNoteActionsContent;
    const noteActions = JSON.parse(noteActionContent.content) as NoteActions;

    updateStore('referencePage', 'noteActions',
      (actions) => ({ ...actions, [noteActions.event_id]: { ...noteActions } })
    );
    return;
  }
}

const handleNoteRefEose = () => {
  updateRefNotes();
  updateRefUsers();
}

const subToMessagesStats = () => {
  if (!account?.publicKey || unsubFromDMCount !== undefined) return;

  subIdMsgCount = subidMsgCount();

  unsubFromDMCount = subsTo(subIdMsgCount, {
    onEvent: (_, content) => {
      if (content?.kind === Kind.MessageStats) {
        const count = parseInt(content.cnt);

        if (count !== store.dmCount) {
          updateStore('dmCount', () => count);
        }
      }
    },
  });

  subscribeToMessagesStats(account.publicKey, subIdMsgCount);
}

// EFFECTS --------------------------------------

createEffect(() => {
  if (isConnected() && account?.isKeyLookupDone && account?.hasPublicKey() && !app?.isInactive) {
    subToMessagesStats();
  } else if (app?.isInactive) {
    unsubscribeToMessagesStats(subIdMsgCount);
    unsubFromDMCount = undefined;
  }
});

createEffect(on(() => store.lastConversationContact?.dmInfo.cnt, (v, p) => {
  if (!v || v === p || (p && v < p)) return;

  getConversationNewMessages(store.lastConversationContact?.pubkey)
}));

// STORES ---------------------------------------


  const [store, updateStore] = createStore<DMStore>({
    ...emptyDMStore(),
    actions: {
      setDmContacts,
      setDmRelation,
      setDmRelation2,
      getContacts,
      getContactsNextPage,
      refreshContacts,
      selectContact,
      addContact,
      getConversation,
      getConversationNextPage,
      sendMessage,
      resetAllMessages,
      resetRelation,
    },
  });

// RENDER ---------------------------------------

  return (
    <DMContext.Provider value={store}>
      {props.children}
    </DMContext.Provider>
  );
}

export const useDMContext = () => useContext(DMContext);
