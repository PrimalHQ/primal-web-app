import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { NostrEvent, NostrEOSE, NostrEventType, NostrEventContent } from "./types/primal";

export const [socket, setSocket] = createSignal<WebSocket>();

export const [isConnected, setConnected] = createSignal<Boolean>(false);

export const isNotConnected = () => !isConnected();

export let cacheServer = '';

export const [cacheServerList, setCacheServerList] = createStore<string[]>([]);

const onOpen = () => {
  setConnected(true);
}

const onClose = () => {
  setConnected(false);

  socket()?.removeEventListener('open', onOpen);
  socket()?.removeEventListener('close', onClose);
  socket()?.removeEventListener('error', onError);

  setTimeout(() => {
    connect();
  }, 200);
}

const onError = (error: Event) => {
  console.log("ws error: ", error);
};

const getRandomCacheServer = (except?: string) => {
  const eligableList = except ?
    cacheServerList.filter(url => url !== except) :
    [...cacheServerList];

  const index = eligableList.length < 2 ?
    0 :
    Math.round(Math.random() * (eligableList.length - 1));

  return eligableList[index];
}

export const cacheServerListPath = () =>  {
  return import.meta.env.PRIMAL_CACHE_LIST_URL;
};


export const connectToDefault = async () => {
  const url = cacheServerListPath();

  if (url) {
    const response = await fetch(url);
    const list = await response.json();

    setCacheServerList(() => [...list]);
  }

  if (isConnected()) {
    disconnect();
    return;
  }

  connect();
}

export const connect = () => {
  if (isConnected()) {
    return;
  }

  const selectedCacheServer = getRandomCacheServer(cacheServer);

  cacheServer =
    localStorage.getItem('cacheServer') ||
    selectedCacheServer ||
    import.meta.env.PRIMAL_CACHE_URL;

  setSocket(new WebSocket(cacheServer));
  console.log('CACHE SOCKET: ', socket());

  socket()?.addEventListener('open', onOpen);
  socket()?.addEventListener('close', onClose);
  socket()?.addEventListener('error', onError);
};

export const disconnect = () => {
  socket()?.close();
};

export const reset = () => {
  disconnect();
  setTimeout(connect, 200);
};

export const sendMessage = (message: string) => {
  isConnected() && socket()?.send(message);
}

export const refreshSocketListeners = (
  ws: WebSocket | undefined,
  listeners: Record<string, (event: any) => any>,
  ) => {

  if (!ws) {
    return;
  }

  Object.keys(listeners).forEach((event: string) => {
    ws.removeEventListener(event, listeners[event]);
    ws.addEventListener(event, listeners[event]);
  });
};

export const removeSocketListeners = (
  ws: WebSocket | undefined,
  listeners: Record<string, (event: any) => any>,
  ) => {

  if (!ws) {
    return;
  }

  Object.keys(listeners).forEach((event: string) => {
    ws.removeEventListener(event, listeners[event]);
  });
};

export const subscribeTo = (subId: string, cb: (type: NostrEventType, subId: string, content?: NostrEventContent) => void ) => {
  const listener = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);
    const [type, subscriptionId, content] = message;

    if (subId === subscriptionId) {
      cb(type, subscriptionId, content);
    }

  };

  socket()?.addEventListener('message', listener);

  return () => {
    socket()?.removeEventListener('message', listener);
  };
};
