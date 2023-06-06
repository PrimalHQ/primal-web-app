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
} from "../types/primal";
import { APP_ID } from "../App";
import { subscribeToMessagesStats } from "../lib/messages";
import { useAccountContext } from "./AccountContext";

export type MessagesContextStore = {
  messageCount: number,
  actions: {
  }
}

export const initialData = {
  messageCount: 0,
};


export const MessagesContext = createContext<MessagesContextStore>();

export const MessagesProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();

  const subid = `msg_stats_${APP_ID}`;

// ACTIONS --------------------------------------

  const subToMessagesStats = () => {
    if (!account?.hasPublicKey()) {
      return;
    }

    // @ts-ignore
    subscribeToMessagesStats(account?.publicKey, subid);
  }

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === subid) {
      if (content?.kind === Kind.MessageStats) {
        const count = parseInt(content.cnt);

        if (count !== store.messageCount) {
          updateStore('messageCount', () => count)
        }

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
    if (isConnected() && account?.hasPublicKey()) {
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

// STORES ---------------------------------------


  const [store, updateStore] = createStore<MessagesContextStore>({
    ...initialData,
    actions: {
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
