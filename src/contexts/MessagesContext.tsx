import { createStore } from "solid-js/store";
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
  UserRelation,
} from "../types/primal";
import { APP_ID } from "../App";
import { getMessageCounts, getNewMessages, getOldMessages, markAllAsRead, resetMessageCount, subscribeToMessagesStats } from "../lib/messages";
import { useAccountContext } from "./AccountContext";
import { convertToUser } from "../stores/profile";
import { getUserProfiles } from "../lib/profile";
import { getEvents } from "../lib/feed";
import { nip19 } from "nostr-tools";
import { convertToNotes } from "../stores/note";
import { sendEvent } from "../lib/notes";
import { useResolvedPath } from "@solidjs/router";
import { useProfileContext } from "./ProfileContext";

type DirectMessage = {
  id: string,
  sender: string,
  content: string,
  created_at: number,
};

type DirectMessageThread = {
  author: string,
  messages: DirectMessage[],
};

type SenderMessageCount = {
  cnt: number,
  latest_at: number,
  latest_event_id: string,
}

export type MessagesContextStore = {
  messageCount: number,
  messageCountPerSender: Record<string, SenderMessageCount>,
  senders: Record<string, PrimalUser>;
  selectedSender: PrimalUser | null,
  encryptedMessages: NostrMessageEncryptedContent[],
  messages: DirectMessage[],
  conversation: DirectMessageThread[],
  isConversationLoaded: boolean,
  referecedUsers: Record<string, PrimalUser>,
  referecedNotes: Record<string, PrimalNote>,
  referencePage: FeedPage,
  now: number,
  senderRelation: UserRelation,
  addSender: PrimalUser | undefined,
  actions: {
    getMessagesPerSender: () => void,
    changeSenderRelation: (relation: UserRelation) => void,
    selectSender: (senderId: string | undefined) => void,
    resetConversationLoaded: () => void,
    addToConversation: (messages: DirectMessage[]) => void,
    sendMessage: (receiver: PrimalUser, message: DirectMessage) => Promise<boolean>,
    resetAllMessages: () => Promise<void>,
    addSender: (user: PrimalUser) => void,
    getNextConversationPage: () => void,
    addUserReference: (user: PrimalUser) => void,
  }
}

export const initialData = {
  messageCount: 0,
  messageCountPerSender: {},
  senders: {},
  selectedSender: null,
  encryptedMessages: [],
  messages: [],
  conversation: [],
  isConversationLoaded: false,
  referecedUsers: {},
  referecedNotes: {},
  now: Math.floor(new Date().getTime() / 1000),
  senderRelation: 'follows' as UserRelation,
  addSender: undefined,
  referencePage: {
    messages: [],
    users: {},
    postStats: {},
    mentions: {},
    noteActions: {},
  },
};


export const MessagesContext = createContext<MessagesContextStore>();

export const MessagesProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();
  const profile = useProfileContext();

  const subidMsgCount = `msg_stats_${APP_ID}`;
  const subidMsgCountPerSender = `msg_count_p_s_ ${APP_ID}`;
  const subidResetMsgCount = `msg_reset_ ${APP_ID}`;
  const subidResetMsgCounts = `msg_mark_as_read_${APP_ID}`;
  const subidCoversation = `msg_conv_ ${APP_ID}`;
  const subidCoversationNextPage = `msg_conv_np_ ${APP_ID}`;
  const subidNewMsg = `msg_new_ ${APP_ID}`;
  const subidNoteRef = `msg_note_ ${APP_ID}`;
  const subidUserRef = `msg_user_ ${APP_ID}`;


  const getNostr = () => {
    const win = window as NostrWindow;
    return win.nostr;
  }

// ACTIONS --------------------------------------

  const changeSenderRelation = (relation: UserRelation) => {
    updateStore('senderRelation', () => relation);
    // @ts-ignore
    updateStore('senders', () => undefined );
    updateStore('senders', () => ({}));
    getMessagesPerSender(true);
  };

  const subToMessagesStats = () => {
    if (!account?.hasPublicKey()) {
      return;
    }

    // @ts-ignore
    subscribeToMessagesStats(account?.publicKey, subidMsgCount);
  }

  const getMessagesPerSender = (changeSender?: boolean) => {
    if (account?.isKeyLookupDone && account.hasPublicKey()) {
      changeSender && updateStore('selectedSender', () => null);
      // @ts-ignore
      getMessageCounts(account.publicKey, store.senderRelation, subidMsgCountPerSender);
    }
  };

  const selectSender = async (senderId: string | undefined) => {
    if (!senderId) {
      return;
    }

    let pubkey = senderId;

    if (senderId.startsWith('npub') || senderId.startsWith('nevent')) {
      const decoded = nip19.decode(senderId);

      if (decoded.type === 'npub') {
        pubkey = decoded.data;
      }

      if (decoded.type === 'nevent') {
        pubkey = decoded.data.id;
      }
    }

    const sender = store.senders[pubkey];

    await resetMessageCount(sender.pubkey, subidResetMsgCount);

    updateStore('selectedSender', () => null);
    updateStore('selectedSender', () => ({ ...sender }));
  };

  const resetAllMessages = async () => {
    markAllAsRead(subidResetMsgCounts);
  };

  const getConversationWithSender = (sender: PrimalUser | null, until = 0) => {
    if (!account?.isKeyLookupDone || !account.hasPublicKey() || !sender) {
      return;
    }
    resetConversationLoaded();
    // @ts-ignore
    getOldMessages(account.publicKey, sender.pubkey, subidCoversation, until);
  };

  const getNextConversationPage = () => {
    if (
      !account?.isKeyLookupDone ||
      !account.hasPublicKey() ||
      !store.selectedSender
    ) {
      return;

    }
    const lastMessage = store.messages[store.messages.length - 1] || { created_at: 0};

    updateStore('encryptedMessages', () => []);

    // @ts-ignore
    getOldMessages(account.publicKey, store.selectedSender.pubkey, subidCoversationNextPage, lastMessage.created_at);
  };

  const decryptMessages = async (then: (messages: DirectMessage[]) => void) => {
    const nostr = getNostr();

    if (nostr === undefined || store.selectedSender === null) {
      return;
    }

    let newMessages: DirectMessage[] = [];

    for (let i = 0; i < store.encryptedMessages.length; i++) {
      const eMsg = store.encryptedMessages[i];

      if (!store.messages.find(m => eMsg.id === m.id) && store.selectedSender) {
        const content = await nostr.nip04.decrypt(store.selectedSender.pubkey, eMsg.content);

        const msg: DirectMessage = {
          sender: eMsg.pubkey,
          content,
          created_at: eMsg.created_at,
          id: eMsg.id,
        };

        newMessages.push(msg);
      }
    }

    updateStore('messages', (conv) => [ ...conv, ...newMessages ]);
    resetMessageCount(store.selectedSender.pubkey, subidResetMsgCount);
    updateStore('messageCountPerSender', store.selectedSender.pubkey, 'cnt', 0)

    parseForMentions(newMessages);
    then(newMessages);
    // areNewMessages ? addToConversation(newMessages, true) : generateConversation(newMessages);
  };

  const parseForMentions = (messages: DirectMessage[]) => {
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

    const pubkeys = userRefs.map(x => {
      const decoded = nip19.decode(x);

      if (decoded.type === 'npub') {
        return decoded.data;
      }

      if (decoded.type === 'nprofile') {
        return decoded.data.pubkey;
      }

      return '';

    });
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

    getUserProfiles(pubkeys, subidUserRef);
    getEvents(account?.publicKey, noteIds, subidNoteRef, true);


  };

  const prependToConversation = (messages: DirectMessage[]) => {
    let firstThread = store.conversation[store.conversation.length - 1];

    for (let i=0;i<messages.length;i++) {
      const message = messages[i];

      if (firstThread && message.sender === firstThread.author) {

        updateStore('conversation',
          store.conversation.length - 1,
          'messages',
          (msgs) => [...msgs, message]
        );
      }
      else {
        firstThread = {
          author: message.sender,
          messages: [message],
        }

        updateStore('conversation', (conv) => [...conv, { ...firstThread }]);
      }

      // updateStore('isConversationLoaded', () => true);
      updateMessageTimings();

    };

  };

  const addToConversation = (messages: DirectMessage[], ignoreMy?: boolean) => {
    let lastThread = store.conversation[0];

    for (let i=0;i<messages.length;i++) {
      const message = messages[i];

      if (ignoreMy && message.sender === account?.publicKey) {
        return;
      }

      if (lastThread && message.sender === lastThread.author) {

        updateStore('conversation',
          0,
          'messages',
          (msgs) => [message, ...msgs]
        );
      }
      else {
        lastThread = {
          author: message.sender,
          messages: [message],
        }

        updateStore('conversation', (conv) => [{ ...lastThread }, ...conv]);
      }

      updateStore('isConversationLoaded', () => true);
      updateMessageTimings();

    };
  };

  const generateConversation = (messages: DirectMessage[]) => {

    let author: string | undefined;
    let thread: DirectMessageThread = { author: '', messages: [] };
    let conversation: any[] = [];

    for (let i=0;i<messages.length;i++) {
      const message = messages[i];

      if (message.sender !== author) {
        author = message.sender;
        thread.messages.length > 0 && conversation.push(thread);
        thread = { author, messages: []};
      }

      thread.messages.push(message);

    };

    thread.messages.length > 0 && conversation.push(thread);

    updateStore('conversation', (conv) => [...conv, ...conversation]);
    updateStore('isConversationLoaded', () => true);
  };

  const resetConversationLoaded = () => {
    updateStore('isConversationLoaded', () =>  false);
  }

  const updateRefUsers = () => {
    const refs = store.referencePage.users;

    const users = Object.keys(refs).reduce((acc, id) => {
      const user = convertToUser(refs[id]);
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

  const sendMessage = async (receiver: PrimalUser, message: DirectMessage) => {
    const nostr = getNostr();
    if (!account || !nostr) {
      return false;
    }

    const content = await nostr.nip04.encrypt(receiver.pubkey, message.content);

    const event = {
      content,
      kind: Kind.EncryptedDirectMessage,
      tags: [['p', receiver.pubkey]],
      created_at: Math.floor((new Date).getTime() / 1000),
    };

    const success = await sendEvent(event, account?.relays);

    if (success) {
      addToConversation([message]);
      updateStore('messageCountPerSender', receiver.pubkey, 'latest_at', message.created_at);
    }

    return success;
  }

  const addNewSender = (user: PrimalUser) => {
    if (!store.senders[user.pubkey]) {
      updateStore('senders', () => ({ [user.pubkey]: {...user }}));
      updateStore('messageCountPerSender', user.pubkey, () => ({ cnt: 0 }));
    }

    selectSender(user.npub);
  };

  const addSender = (user: PrimalUser) => {
    const isFollowing = profile?.following.includes(user.pubkey);

    if (isFollowing && store.senderRelation === 'follows' ||
      !isFollowing && store.senderRelation === 'other'
    ) {
      addNewSender(user);
      return;
    }

    updateStore('addSender', () => ({ ...user }));

    changeSenderRelation(isFollowing ? 'follows' : 'other');

  }

  const addUserReference = (user: PrimalUser) => {
    updateStore('referecedUsers', () => ({ [user.pubkey]: {...user} }));
  };


// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === subidMsgCount) {
      if (content?.kind === Kind.MessageStats) {
        const count = parseInt(content.cnt);

        if (count !== store.messageCount) {
          updateStore('messageCount', () => count);
        }

      }
    }

    if (subId === subidMsgCountPerSender) {
      if (type === 'EVENT') {
        if (content?.kind === Kind.MesagePerSenderStats) {
          const senderCount = JSON.parse(content.content);

          updateStore('messageCountPerSender', () => ({ ...senderCount }));
          updateMessageTimings();
        }

        if (content?.kind === Kind.Metadata) {
          if (store.senders[content.pubkey]) {
            return;
          }
          const user = convertToUser(content);

          updateStore('senders', () => ({ [user.pubkey]: { ...user } }));
        }
      }

      if (type === 'EOSE') {
        if (store.addSender !== undefined) {
          const key = store.addSender.pubkey;
          const user = { ...store.addSender }

          updateStore('senders', () => ({ [key]: user }));
          updateStore('messageCountPerSender', user.pubkey, () => ({ cnt: 0 }));
          selectSender(store.addSender.pubkey);
          updateStore('addSender', () => undefined);
          return;
        }

        const senderIds = Object.keys(store.senders);
        if (!store.selectedSender) {
          selectSender(senderIds[0]);
        }
        // !store.selectedSender && updateStore('selectedSender', () => ({ ...store.senders[senderIds[0]] }));
      }
    }

    if (subId === subidCoversation || subId === subidCoversationNextPage) {
      if (type === 'EVENT') {
        if (content?.kind === Kind.EncryptedDirectMessage) {
          updateStore('encryptedMessages', (conv) => [ ...conv, {...content}]);
        }
      }

      if (type === 'EOSE') {
        if (subId === subidCoversation) {
          decryptMessages(generateConversation);
          return;
        }

        if (subId === subidCoversationNextPage) {
          decryptMessages(prependToConversation);
          return;
        }
      }
    }

    if (subId === subidNewMsg) {
      if (type === 'EVENT') {
        if (content?.kind === Kind.EncryptedDirectMessage) {
          updateStore('encryptedMessages', (conv) => [ ...conv, {...content}]);
        }
      }

      if (type === 'EOSE') {
        decryptMessages((msgs) => addToConversation(msgs, true));
      }
    }

    if (subId === subidUserRef) {
      if (type === 'EVENT') {
        if (content?.kind === Kind.Metadata) {
          const user = content as NostrUserContent;

          updateStore('referencePage', 'users',
            (usrs) => ({ ...usrs, [user.pubkey]: { ...user } })
          );
        }
      }

      if (type === 'EOSE') {
        updateRefUsers();
      }
    }

    if (subId === subidNoteRef) {
      if (type === 'EVENT') {
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

      if (type === 'EOSE') {
        updateRefNotes();
        updateRefUsers();
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
    if (isConnected() && account?.isKeyLookupDone && account?.hasPublicKey()) {
      subToMessagesStats();
    }
  });

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

  let conversationRefreshInterval = 0;

  const updateMessageTimings = () => {
    updateStore('now', () => Math.floor((new Date()).getTime() / 1000));
  };

  // When a sender is selected, get the first page of the conversation
  createEffect(() => {
    if (store.selectedSender) {
      clearInterval(conversationRefreshInterval);

      updateStore('encryptedMessages', () => []);
      updateStore('conversation', () => []);
      updateStore('messages', () => []);
      getConversationWithSender(store.selectedSender);

      conversationRefreshInterval = setInterval(() => {
        updateMessageTimings();
      }, 60_000);
    }
  });

  // when the total number of messages increases, check for new messages
  createEffect(() => {
    if (
      account?.hasPublicKey() &&
      store.selectedSender &&
      store.messageCountPerSender[store.selectedSender?.pubkey] &&
      store.messageCountPerSender[store.selectedSender.pubkey].cnt > 0
    ) {

      updateStore('encryptedMessages', () => []);

      let time = Math.floor((new Date()).getTime() / 1000);

      const lastThread = store.conversation[store.conversation.length - 1];

      if (lastThread) {
        const lastMessage = lastThread.messages[lastThread.messages.length - 1];

        if (lastMessage) {
          time = lastMessage.created_at
        }
      }

      getNewMessages(
        // @ts-ignore
        account?.publicKey,
        store.selectedSender.pubkey,
        subidNewMsg,
        time,
      );
    }
  });


// STORES ---------------------------------------


  const [store, updateStore] = createStore<MessagesContextStore>({
    ...initialData,
    actions: {
      getMessagesPerSender,
      selectSender,
      addToConversation,
      resetConversationLoaded,
      sendMessage,
      changeSenderRelation,
      resetAllMessages,
      addSender,
      getNextConversationPage,
      addUserReference,
    },
  });

// RENDER ---------------------------------------

  return (
    <MessagesContext.Provider value={store}>
      {props.children}
    </MessagesContext.Provider>
  );
}

export const useMessagesContext = () => useContext(MessagesContext);
