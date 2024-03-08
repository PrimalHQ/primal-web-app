import { createSignal } from "solid-js";
import { logError, logInfo } from "./lib/logger";
import { NostrEvent, NostrEOSE, NostrEventType, NostrEventContent, PrimalWindow } from "./types/primal";

export const [socket, setSocket] = createSignal<WebSocket>();

export const [isConnected, setConnected] = createSignal<Boolean>(false);

export const isNotConnected = () => !isConnected();

const onOpen = () => {
  setConnected(true);
  if (localStorage.getItem('devMode') === 'true') {
    const hook = (window as PrimalWindow).onPrimalCacheServerConnected;
    hook && hook(cacheServer, socket());

    socket()?.addEventListener('message', function(event) {
      const hook = (window as PrimalWindow).onPrimalCacheServerMessageReceived;
      hook && hook(cacheServer, event.data);
    });
  }
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
  logError("ws error: ", error);
};

export let cacheServer = '';

export const connect = () => {
  if (isNotConnected()) {
    cacheServer =
      localStorage.getItem('cacheServer') ||
      import.meta.env.PRIMAL_CACHE_URL;

    setSocket(new WebSocket(cacheServer));
    logInfo('CACHE SOCKET: ', socket());

    socket()?.addEventListener('open', onOpen);
    socket()?.addEventListener('close', onClose);
    socket()?.addEventListener('error', onError);
  }
};

export const disconnect = () => {
  socket()?.close();
};

export const reset = () => {
  disconnect();
  setTimeout(connect, 1000);
};

export const sendMessage = (message: string) => {
  if (isConnected()) {
    const e = new CustomEvent('send', { detail: { message, ws: socket() }});
    socket()?.send(message);
    socket()?.dispatchEvent(e);

    const hook = (window as PrimalWindow).onPrimalCacheServerMessageSent;
    hook && hook(cacheServer, message);
  }
  else {
    setTimeout(() => {
      sendMessage(message);
    }, 100);
  }
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

export const subTo = (socket: WebSocket, subId: string, cb: (type: NostrEventType, subId: string, content?: NostrEventContent) => void ) => {
  const listener = (event: MessageEvent) => {
    const message: NostrEvent | NostrEOSE = JSON.parse(event.data);
    const [type, subscriptionId, content] = message;

    if (subId === subscriptionId) {
      cb(type, subscriptionId, content);
    }

  };

  socket.addEventListener('message', listener);

  return () => {
    socket.removeEventListener('message', listener);
  };
};
