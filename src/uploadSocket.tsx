import { createSignal } from "solid-js";
import { NostrEvent, NostrEOSE, NostrEventType, NostrEventContent } from "./types/primal";

export const [socket, setSocket] = createSignal<WebSocket>();

export const [isConnected, setConnected] = createSignal<Boolean>(false);

export const isNotConnected = () => !isConnected();

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

export const connect = () => {
  if (isNotConnected()) {
    const cacheServer = localStorage.getItem('uploadServer') ??
      'wss://uploads.primal.net/v1';

    setSocket(new WebSocket(cacheServer));
    console.log('UPLOAD SOCKET: ', socket());

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
