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
  NostrEOSE,
  NostrEvent,
  NostrMessageEncryptedContent,
  NostrWindow,
  PrimalUser,
} from "../types/primal";
import { APP_ID } from "../App";
import { getMessageCounts, getNewMessages, getOldMessages, resetMessageCount, subscribeToMessagesStats } from "../lib/messages";
import { useAccountContext } from "./AccountContext";
import { convertToUser } from "../stores/profile";

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

export type MessagesContextStore = {
  messageCount: number,
  messageCountPerSender: Record<string, number>,
  senders: Record<string, PrimalUser>;
  selectedSender: PrimalUser | null,
  encryptedMessages: NostrMessageEncryptedContent[],
  messages: DirectMessage[],
  conversation: DirectMessageThread[],
  isConversationLoaded: boolean,
  actions: {
    getMessagesPerSender: () => void,
    selectSender: (sender: PrimalUser) => void,
    resetConversationLoaded: () => void,
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
};

const win = window as NostrWindow;
const nostr = win.nostr;


export const MessagesContext = createContext<MessagesContextStore>();

export const MessagesProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();

  const subidMsgCount = `msg_stats_${APP_ID}`;
  const subidMsgCountPerSender = `msg_count_p_s_ ${APP_ID}`;
  const subidResetMsgCount = `msg_reset_ ${APP_ID}`;
  const subidCoversation = `msg_conv_ ${APP_ID}`;
  const subidNewMsg = `msg_new_ ${APP_ID}`;

// ACTIONS --------------------------------------

  const subToMessagesStats = () => {
    if (!account?.hasPublicKey()) {
      return;
    }

    // @ts-ignore
    subscribeToMessagesStats(account?.publicKey, subidMsgCount);
  }

  const getMessagesPerSender = () => {
    if (account?.isKeyLookupDone && account.hasPublicKey()) {
      // @ts-ignore
      getMessageCounts(account.publicKey, subidMsgCountPerSender);
    }
  };

  const selectSender = async (sender: PrimalUser) => {
    await resetMessageCount(sender.pubkey, subidResetMsgCount);

    updateStore('selectedSender', () => ({ ...sender }));

  };

  const getConversationWithSender = (sender: PrimalUser) => {
    if (account?.isKeyLookupDone && account.hasPublicKey()) {
      // @ts-ignore
      getOldMessages(account.publicKey, sender.pubkey, subidCoversation);
    }
  };

  const decryptMessages = async (areNewMessages?: boolean) => {
    if (nostr === undefined || !store.selectedSender) {
      return;
    }

    let newMessages: DirectMessage[] = [];

    for (let i = 0; i < store.encryptedMessages.length; i++) {
      const eMsg = store.encryptedMessages[i];

      if (!store.messages.find(m => eMsg.id === m.id)) {
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
    areNewMessages ? addToConversation(newMessages) : generateConversation(newMessages);
  };

  const addToConversation = (messages: any[]) => {
    let lastThread = store.conversation[store.conversation.length - 1];

    for (let i=0;i<messages.length;i++) {
      const message = messages[i];

      if (lastThread && message.sender === lastThread.author) {
        updateStore('conversation',
          store.conversation.length - 1,
          'messages',
          (msgs) => [...msgs, message]
        );
      }
      else {
        lastThread = {
          author: message.sender,
          messages: [message],
        }

        updateStore('conversation', (conv) => [...conv, { ...lastThread }]);
      }

      updateStore('isConversationLoaded', () => true);

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
      if (content?.kind === Kind.MesagePerSenderStats) {
        const senderCount = JSON.parse(content.content);

        updateStore('messageCountPerSender', () => ({ ...senderCount }));
      }

      if (content?.kind === Kind.Metadata) {
        const user = convertToUser(content);

        updateStore('senders', () => ({ [user.pubkey]: user }));
      }
    }

    if (subId === subidCoversation) {
      if (type === 'EVENT') {
        if (content?.kind === Kind.EncryptedDirectMessage) {
          updateStore('encryptedMessages', (conv) => [ ...conv, {...content}]);
        }
      }

      if (type === 'EOSE') {
        decryptMessages();
      }
    }

    if (subId === subidNewMsg) {
      if (type === 'EVENT') {
        if (content?.kind === Kind.EncryptedDirectMessage) {
          updateStore('encryptedMessages', (conv) => [ ...conv, {...content}]);
        }
      }

      if (type === 'EOSE') {
        decryptMessages(true);
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

  // When a sender is selected, get the first page of the conversation
  createEffect(() => {
    if (store.selectedSender) {
      updateStore('encryptedMessages', () => []);
      updateStore('conversation', () => []);
      updateStore('messages', () => []);
      getConversationWithSender(store.selectedSender);
    }
  });

  let oldNum = 0;

  // when the total number of messages increases, check for new messages
  createEffect(() => {
    if (account?.hasPublicKey() && store.selectedSender && store.messageCountPerSender[store.selectedSender.pubkey] > oldNum) {

      if (store.messages.length === 0) {
        return;
      }

      updateStore('encryptedMessages', () => []);

      oldNum = store.messageCountPerSender[store.selectedSender.pubkey];

      getNewMessages(
        // @ts-ignore
        account?.publicKey,
        store.selectedSender.pubkey,
        subidNewMsg,
        store.messages[store.messages.length - 1].created_at,
      );
    }
  });


// STORES ---------------------------------------


  const [store, updateStore] = createStore<MessagesContextStore>({
    ...initialData,
    actions: {
      getMessagesPerSender,
      selectSender,
      resetConversationLoaded,
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
