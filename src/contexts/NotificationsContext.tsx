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
import { subscribeToNotificationStats } from "../lib/notifications";
import { useAccountContext } from "./AccountContext";

export type NotificationsContextStore = {
  notificationCount: number,
  actions: {
  }
}

export const initialData = {
  notificationCount: 0,
};


export const NotificationsContext = createContext<NotificationsContextStore>();

export const NotificationsProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();

  const subid = `notif_stats_${APP_ID}`;

// ACTIONS --------------------------------------

  const subToNotificationStats = () => {
    if (!account?.hasPublicKey()) {
      return;
    }

    // @ts-ignore
    subscribeToNotificationStats(account?.publicKey, subid);
  }

// SOCKET HANDLERS ------------------------------

  const onMessage = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);

    const [type, subId, content] = message;

    if (subId === subid) {
      if (content?.kind === Kind.NotificationStats) {
        const sum = Object.keys(content).reduce((acc, key) => {
          if (key === 'pubkey' || key == 'kind') {
            return acc;
          }

          // @ts-ignore
          return acc + content[key];
        }, 0);

        if (sum !== store.notificationCount) {
          updateStore('notificationCount', () => sum)
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
      subToNotificationStats();
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


  const [store, updateStore] = createStore<NotificationsContextStore>({
    ...initialData,
    actions: {
    },
  });

// RENDER ---------------------------------------

  return (
    <NotificationsContext.Provider value={store}>
      {props.children}
    </NotificationsContext.Provider>
  );
}

export const useNotificationsContext = () => useContext(NotificationsContext);
