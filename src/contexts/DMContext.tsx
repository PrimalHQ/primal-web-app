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
import { handleSubscription } from "../utils";
import { DMContact, fetchDMContacts } from "../megaFeeds";


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

  actions: {
    setDmContacts: (contacts: DMContact[], relation: UserRelation) => void,
    setDmRelation: (relation: UserRelation) => void,
    getContacts: (relation: UserRelation) => void,
    selectContact: (pubkey: string) => void,
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

const setDmRelation = (relation: UserRelation) => {
  if (!account?.publicKey) return;

  updateStore('lastConversationRelation', () => relation);
  saveLastDMRelation(account.publicKey, relation);

  getContacts(relation);
}

const getContacts = async (relation: UserRelation) => {
  const { dmContacts } = await fetchDMContacts(account?.publicKey, relation, `dm_contacts_${relation}_${APP_ID}`);

  setDmContacts(dmContacts, relation);
}

const selectContact = (pubkey: string) => {
  if (!account?.publicKey) return;

  const relation = store.lastConversationRelation;
  const contact = store.dmContacts[relation].find(c => c.pubkey === pubkey);

  updateStore('lastConversationContact', () => ({ ...contact }));
  saveLastDMConversations(account.publicKey, pubkey);
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
