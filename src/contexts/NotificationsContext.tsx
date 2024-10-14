import { createStore } from "solid-js/store";
import { andRD, andVersion, iosRD, iosVersion, Kind } from "../constants";
import {
  createContext,
  createEffect,
  onCleanup,
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
  NostrEOSE,
  NostrEvent,
  NostrEventContent,
  NostrEvents,
} from "../types/primal";
import { APP_ID } from "../App";
import { getLastSeen, subscribeToNotificationStats, unsubscribeToNotificationStats } from "../lib/notifications";
import { useAccountContext } from "./AccountContext";
import { timeNow } from "../utils";
import { useSettingsContext } from "./SettingsContext";
import { useAppContext } from "./AppContext";

export type NotificationsContextStore = {
  notificationCount: number,
  downloadsCount: number,
  actions: {
    resetNotificationCounter: () => void,
  }
}

export const initialData = {
  notificationCount: 0,
  downloadsCount: 0,
};

export let notifSince = timeNow();

export const setNotifSince = (val: number) => {
  notifSince = val;
}

export const NotificationsContext = createContext<NotificationsContextStore>();

export const NotificationsProvider = (props: { children: ContextChildren }) => {

  const account = useAccountContext();
  const settings = useSettingsContext();
  const app = useAppContext();

  const today = () => (new Date()).getTime();

  let notifSubscribed = '|';

  const notfiStatsSubId = () => `notif_stats_${notifSubscribed}_${APP_ID}`;

// ACTIONS --------------------------------------

  const subToNotificationStats = () => {

    if (notifSubscribed !== account?.publicKey) {
      unsubscribeToNotificationStats(notfiStatsSubId());
      notifSubscribed = '';
    }

    if (!account?.publicKey) return;

    notifSubscribed = account.publicKey;
    subscribeToNotificationStats(account.publicKey, notfiStatsSubId());
  }

  const calculateDownloadCount = () => {
    const iosDownload = localStorage.getItem('iosDownload');
    const andDownload = localStorage.getItem('andDownload');

    const ios = settings?.mobileReleases.ios || { date: iosRD, version: iosVersion};
    const and = settings?.mobileReleases.android || { date: andRD, version: andVersion};

    let count = 0;

    if (iosDownload !== ios.version && today() > (new Date(ios.date)).getTime()) {
      count++;
    }

    if (andDownload !== and.version && today() > (new Date(and.date)).getTime()) {
      count++;
    }

    updateStore('downloadsCount', () => count);

  };

  const resetNotificationCounter = () => updateStore('notificationCount', () => 0);

// SOCKET HANDLERS ------------------------------

  const handleNotifStatsEvent = (content: NostrEventContent) => {
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

      calculateDownloadCount();

    }
  }
  const onMessage = async (event: MessageEvent) => {
    const data = await readData(event);
    const message: NostrEvent | NostrEOSE | NostrEvents = JSON.parse(data);

    const [type, subId, content] = message;

    if (subId === notfiStatsSubId()) {
      if (type === 'EVENTS') {
        for (let i=0;i<content.length;i++) {
          const e = content[i];
          handleNotifStatsEvent(e);
        }

      }
      if (type === 'EVENT') {
        handleNotifStatsEvent(content);
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
    if (isConnected() && account?.isKeyLookupDone && account?.hasPublicKey() && !app?.isInactive) {
      subToNotificationStats();
    } else {
      unsubscribeToNotificationStats(notfiStatsSubId());
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


  createEffect(() => {
    const pk = account?.publicKey;

    if (pk) {
      const subid = `notif_ls_${APP_ID}`

      const unsub = subsTo(subid, {
        onEvent: (_, content) => {
          if (content?.kind === Kind.Timestamp) {

            const timestamp = parseInt(content.content);

            if (!isNaN(timestamp)) {
              setNotifSince(timestamp);
            }

            unsub();
            return;
          }
        },
        onEose: () => {
          if (!notifSince) {
            setNotifSince(0);
          }
        },
      });

      getLastSeen(pk as string, subid);
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
      resetNotificationCounter,
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
