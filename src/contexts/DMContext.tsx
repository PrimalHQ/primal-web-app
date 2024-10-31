import { createStore, reconcile, unwrap } from "solid-js/store";
import { Kind, threadLenghtInMs } from "../constants";
import {
  batch,
  createContext,
  createEffect,
  on,
  onCleanup,
  onMount,
  useContext
} from "solid-js";
import {
  isConnected,
  readData,
  refreshSocketListeners,
  removeSocketListeners,
  socket,
  subsTo
} from "../sockets";
import {
  ContextChildren,
  DirectMessage,
  DirectMessageThread,
  FeedPage,
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrEvents,
  NostrMentionContent,
  NostrMessageEncryptedContent,
  NostrNoteActionsContent,
  NostrNoteContent,
  NostrStatsContent,
  NostrUserContent,
  NostrWindow,
  NoteActions,
  PrimalArticle,
  PrimalNote,
  PrimalUser,
  SenderMessageCount,
  UserRelation,
} from "../types/primal";
import { APP_ID } from "../App";
import { getMessageCounts, getNewMessages, getOldMessages, markAllAsRead, resetMessageCount, subscribeToMessagesStats, unsubscribeToMessagesStats } from "../lib/messages";
import { useAccountContext } from "./AccountContext";
import { convertToUser, emptyUser } from "../stores/profile";
import { getUserProfiles } from "../lib/profile";
import { getEvents } from "../lib/feed";
import { nip19 } from "../lib/nTools";
import { convertToNotes } from "../stores/note";
import { sanitize, sendEvent } from "../lib/notes";
import { decrypt, encrypt } from "../lib/nostrAPI";
import { loadDmCoversations, loadLastDMRelation, loadMsgContacts, saveDmConversations, saveLastDMConversations, saveLastDMRelation, saveMsgContacts } from "../lib/localStore";
import { useAppContext } from "./AppContext";
import { useSettingsContext } from "./SettingsContext";
import { calculateDMConversationOffset, calculateNotesOffset, handleSubscription, handleSubscriptionAsync } from "../utils";
import { DMContact, emptyPaging, fetchDMContacts, fetchDMConversation, PaginationInfo } from "../megaFeeds";
import { logWarning } from "../lib/logger";


export type DMCount = {
  cnt: number,
  latest_at: number,
  latest_event_id: string,
};

export type DMStore = {
  dmCountPerContact: Record<string, DMCount>,
  dmCountUnread: number,
  dmContacts: Record<UserRelation, DMContact[]>,
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
    getContacts: (relation: UserRelation) => void,
    selectContact: (pubkey: string) => void,
    addContact: (user: PrimalUser) => void,
    getConversation: (contact: string | null, until: number) => void,
    getConversationNextPage: () => void,
    sendMessage: (reciever: string, message: DirectMessage) => void,
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
  lastMessageCheck: 0,
  lastConversationContact: undefined,
  lastConversationRelation: 'any',

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

// ACTIONS --------------------------------------

const setDmContacts = (contacts: DMContact[], relation: UserRelation) => {
  const existingContacts = store.dmContacts[relation];
  const existingPubkeys = existingContacts.map(c => c.pubkey);

  const filtered = contacts.filter(c => !existingPubkeys.includes(c.pubkey));

  const sorted = [ ...existingContacts, ...filtered].
    sort((a, b) => b.dmInfo.latest_at - a.dmInfo.latest_at);

  updateStore('dmContacts', relation, () => [ ...sorted ]);
}

const setDmRelation = async (relation: UserRelation) => {
  if (!account?.publicKey) return;

  updateStore('lastConversationRelation', () => relation);
  saveLastDMRelation(account.publicKey, relation);

  return await getContacts(relation);
}

const getContacts = async (relation: UserRelation) => {
  start = (new Date()).getTime();
  const { dmContacts } = await fetchDMContacts(account?.publicKey, relation, `dm_contacts_${relation}_${APP_ID}`);

  setDmContacts(dmContacts, relation);

  end = (new Date()).getTime();
  console.log('TIME: ', end - start);
}

const selectContact = (pubkey: string) => {
  if (store.isFetchingMessages) return;

  if (!account?.publicKey) return;

  const relation = store.lastConversationRelation;
  const contact = store.dmContacts[relation].find(c => c.pubkey === pubkey);

  if (!contact) return;

  updateStore('lastConversationContact', () => ({ ...contact }));
  saveLastDMConversations(account.publicKey, pubkey);

  updateStore('messages', () => []);
  updateStore('conversationPaging', () => ({ ...emptyPaging() }));
  updateStore('isFetchingMessages', () => true);

  getConversation(pubkey);
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
      console.log('DECRYPT: ', pubkey, message, ' -> ', m);
      resolve(m)
    }).catch((reason) => {
      console.warn('Failed to decrypt, will retry: ', message, reason);
      resolve('');
    });
  });
}

let start = 0;
let end = 0;

const decryptMessages = async (contact: string, encrypted: NostrMessageEncryptedContent[],  then: (messages: DirectMessage[]) => void) => {

  let newMessages: DirectMessage[] = [];

  for (let i = 0; i < encrypted.length; i++) {
    const eMsg = encrypted[i];

    console.log('ENCRYPT: ', eMsg.content);
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

  console.log('DECRYPTED: ', newMessages.length)

  updateStore('messages', (conv) => [ ...conv, ...newMessages ]);

  then(newMessages);
};


const parseForMentions = async (messages: DirectMessage[]) => {
  const noteRegex = /\bnostr:((note|nevent)1\w+)\b|#\[(\d+)\]/g;
  const userRegex = /\bnostr:((npub|nprofile)1\w+)\b|#\[(\d+)\]/g;

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
  console.log('NEXT PAGE 2: ', store.conversationPaging.since);

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

  decryptMessages(contact, store.encryptedMessages, () => {
    updateStore('isFetchingMessages', () => false);
    console.log('DONE DECRYPTING:');
  });
};

const getConversationNextPage = () => {
  if (store.messages.length === 0 || !store.conversationPaging.since) return;

  getConversation(store.lastConversationContact?.pubkey)
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

    const { success } = await sendEvent(event, account.activeRelays, account?.relaySettings, account?.proxyThroughPrimal || false);

    if (success) {
      const msg = { ...message, content: sanitize(message.content) };
      addToConversation([msg]);
      // updateStore('messageCountPerSender', receiver, 'latest_at', message.created_at);
    }

    return success;
  } catch (reason) {
    console.error('Failed to send message: ', reason);
    return false;
  }

}


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

// EFFECTS --------------------------------------

// STORES ---------------------------------------


  const [store, updateStore] = createStore<DMStore>({
    ...emptyDMStore(),
    actions: {
      setDmContacts,
      setDmRelation,
      getContacts,
      selectContact,
      addContact,
      getConversation,
      getConversationNextPage,
      sendMessage,
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
