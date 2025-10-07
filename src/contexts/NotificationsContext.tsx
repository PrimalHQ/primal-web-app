import { createStore } from "solid-js/store";
import { andRD, andVersion, iosRD, iosVersion, Kind } from "../constants";
import {
  batch,
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

    return count;

  };

  const excludedNotificationStatKeys = new Set([
    'kind',
    'pubkey',
    'created_at',
    'id',
    'tags',
  ]);
  const excludedNotificationStatKeysTopLevel = new Set([
    ...excludedNotificationStatKeys,
    'content',
  ]);

  const sumNumericValues = (value: unknown, excludedKeys: Set<string>): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }

      try {
        const parsedJson = JSON.parse(value);

        return sumNumericValues(parsedJson, excludedKeys);
      } catch {
        return 0;
      }
    }

    if (Array.isArray(value)) {
      return value.reduce((acc, item) => acc + sumNumericValues(item, excludedKeys), 0);
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).reduce((acc, [key, val]) => {
        if (excludedKeys.has(key)) {
          return acc;
        }

        return acc + sumNumericValues(val, excludedKeys);
      }, 0);
    }

    return 0;
  };

  const getNotificationCountTotal = (event: NostrEventContent) => {
    const topLevelTotal = sumNumericValues(event, excludedNotificationStatKeysTopLevel);
    if (Number.isFinite(topLevelTotal) && topLevelTotal > 0) {
      return Math.max(0, Math.trunc(topLevelTotal));
    }

    const rawContent = (event as { content?: unknown }).content;
    if (typeof rawContent === 'string') {
      try {
        const parsed = JSON.parse(rawContent);
        const parsedTotal = sumNumericValues(parsed, excludedNotificationStatKeys);

        if (Number.isFinite(parsedTotal)) {
          return Math.max(0, Math.trunc(parsedTotal));
        }
      } catch {
        // ignore invalid JSON payloads
      }
    }

    return 0;
  };

  const resetNotificationCounter = () => updateStore('notificationCount', () => 0);

// SOCKET HANDLERS ------------------------------

  const handleNotifStatsEvent = (content: NostrEventContent) => {
    if (content?.kind === Kind.NotificationStats) {
      const sum = getNotificationCountTotal(content);

      const downloadCount = calculateDownloadCount();

      if (sum !== store.notificationCount || downloadCount !== store.downloadsCount) {
        batch(() => {
          if (sum !== store.notificationCount) {
            updateStore('notificationCount', () => sum);
          }

          if (downloadCount !== store.downloadsCount) {
            updateStore('downloadsCount', () => downloadCount);
          }
        });
      }

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
