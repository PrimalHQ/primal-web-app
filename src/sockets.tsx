import { createSignal } from "solid-js";
import { logError, logInfo } from "./lib/logger";
import { NostrEvent, NostrEOSE, NostrEventType, NostrEventContent, PrimalWindow, NostrNotice, NostrEvents } from "./types/primal";
import pako from 'pako';
import { APP_ID } from "./App";

export const [reconnect, setReconnect] = createSignal(true);

export const [socket, setSocket] = createSignal<WebSocket>();

export const [isConnected, setConnected] = createSignal<Boolean>(false);

export const isNotConnected = () => !isConnected();

export const setPrimalProtocol = (compression: 'zlib', then: () => void) => {

  const subId = `set_protocol_${APP_ID}`;

  const unsub = subsTo(subId, {
    onEose: () => {
      unsub();
      then();
    }
  });

  sendMessage(JSON.stringify([
    "REQ",
    subId,
    {cache: ["set_primal_protocol", { compression }]},
  ]), true);
}

const onOpen = () => {
  const disableBinary = localStorage.getItem('noBinary');

  if (disableBinary === 'true') {
    setConnected(true);
  }
  else {
    setPrimalProtocol('zlib', () => {
      setConnected(true);
    });
  }

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

  if (reconnect()) {
    setTimeout(() => {
      connect();
    }, 200);
  }
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

    let s = new WebSocket(cacheServer);
    s.binaryType = 'arraybuffer';
    setSocket(s);
    logInfo('CACHE SOCKET: ', socket());

    socket()?.addEventListener('open', onOpen);
    socket()?.addEventListener('close', onClose);
    socket()?.addEventListener('error', onError);

    setReconnect(() => true);
  }
};

export const disconnect = (autoreconnect = true) => {
  setReconnect(() => autoreconnect)
  socket()?.close();
};

export const reset = () => {
  disconnect();
  setTimeout(connect, 1000);
};

export const sendMessage = (message: string, force = false) => {
  if (isConnected() || force) {
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

export const decompressBlob  = async (blob: ArrayBuffer) => {
  try {
    const result = pako.inflate(blob, { to: 'string' });
    return result as string;
  } catch (e) {
    logError('ERROR PAKO: ', e)
    return '{}'
  }
}

export const readData = async (event: MessageEvent) => {
  if (typeof event.data === 'string') return event.data;

  try {
    const decom = await decompressBlob(event.data);
    return decom;
  } catch(e) {
    logError('ERROR TO DECOMPRESS BLOB: ', e)
    return '{}'
  }
}

export const subTo = (socket: WebSocket, subId: string, cb: (type: NostrEventType, subId: string, content?: NostrEventContent) => void ) => {
  const listener = async (event: MessageEvent) => {
    // try {
      const data = await readData(event);
      const message: NostrEvent | NostrEOSE | NostrEvents = JSON.parse(data);
      const [type, subscriptionId, content] = message;

      if (type === 'EVENTS') {
        let i = 0;

        for (i=0;i<content.length;i++) {
          const e = content[i];
          cb('EVENT', subscriptionId, e);
        }

        // cb('EOSE', subscriptionId);
        return;
      }

      if (subId === subscriptionId) {
        cb(type, subscriptionId, content);
      }
    // } catch (e) {
    //   logError('SOCKET LISTENER: ', subId, ' : ', e)
    // }

  };

  socket.addEventListener('message', listener);

  return () => {
    socket.removeEventListener('message', listener);
  };
};


export const subsTo = (
  subId: string,
  handlers?: {
    onEvent?: (subId: string, content: NostrEventContent) => void,
    onNotice?: (subId: string, reason: string) => void,
    onEose?: (subId: string) => void,
  },
) => {

  const listener = async (event: MessageEvent) => {
    // try {
      const data = await readData(event);
      const message: NostrEvent | NostrEOSE | NostrNotice | NostrEvents = JSON.parse(data);
      const [type, subscriptionId] = message;


      if (handlers && subId === subscriptionId) {
        if (type === 'EVENTS') {
          const events = message[2];

          let i = 0;

          for (i=0;i<events.length;i++) {
            const e = events[i];
            handlers.onEvent && handlers.onEvent(subscriptionId, e)
          }

          // handlers.onEose && handlers.onEose(subscriptionId);
        }

        if (type === 'EVENT') {
          handlers.onEvent && handlers.onEvent(subscriptionId, message[2]);
        }

        if (type === 'EOSE') {
          handlers.onEose && handlers.onEose(subscriptionId);
        }

        if (type === 'NOTICE') {
          handlers.onNotice && handlers.onNotice(subscriptionId, message[2])
        }
      }
    // } catch (e) {
    //   logError('SOCKET LISTENER: ', subId, ' : ', e)
    // }

  };

  socket()?.addEventListener('message', listener);

  return () => {
    socket()?.removeEventListener('message', listener);
  };
};
