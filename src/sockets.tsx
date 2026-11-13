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

const markConnected = () => {
  setConnected(true);
  resendPendingRequests();
};

const onOpen = () => {
  const disableBinary = localStorage.getItem('noBinary');

  if (disableBinary === 'true') {
    markConnected();
  }
  else {
    setPrimalProtocol('zlib', () => {
      markConnected();
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
  socket()?.removeEventListener('message', dispatchMessage);

  dropSettledHandlers();

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
    socket()?.addEventListener('message', dispatchMessage);

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
    !force && trackRequest(message);
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


type SubHandlers = {
  onEvent?: (subId: string, content: NostrEventContent) => void,
  onNotice?: (subId: string, reason: string) => void,
  onEose?: (subId: string) => void,
};

// subId -> handlers. Routing through one dispatcher (instead of one socket
// listener per subscription) means each frame is inflated and parsed once, not
// once per open subscription, and subscriptions survive socket reconnects.
const subHandlers = new Map<string, Set<SubHandlers>>();

// subId -> last REQ sent for it, until its EOSE arrives. If the socket drops
// mid-request these are re-sent on reconnect; otherwise their callers would
// wait forever for a response that the new socket will never deliver.
const pendingRequests = new Map<string, string>();

// subIds whose last request already completed (EOSE received).
const settledSubs = new Set<string>();

// On disconnect, forget handlers of completed subscriptions (their socket is
// gone, as before this registry existed); keep in-flight ones for re-sending.
const dropSettledHandlers = () => {
  settledSubs.forEach(subId => {
    if (!pendingRequests.has(subId)) subHandlers.delete(subId);
  });

  settledSubs.clear();
};

const trackRequest = (message: string) => {
  if (!message.startsWith('["REQ"') && !message.startsWith('["CLOSE"')) return;

  try {
    const [type, subId] = JSON.parse(message);

    if (typeof subId !== 'string') return;

    if (type === 'REQ') {
      pendingRequests.set(subId, message);
      settledSubs.delete(subId);
    }
    else {
      pendingRequests.delete(subId);
    }
  } catch {
    // not a parsable request, nothing to track
  }
};

const resendPendingRequests = () => {
  const requests = [...pendingRequests.entries()];

  pendingRequests.clear();

  for (const [subId, message] of requests) {
    // Only re-send requests someone is still waiting on
    if (!subHandlers.has(subId)) continue;

    logInfo('Re-sending request after reconnect: ', subId);
    sendMessage(message);
  }
};

const runHandler = (subId: string, fn: () => void) => {
  try {
    fn();
  } catch (e) {
    logError('SOCKET HANDLER ERROR: ', subId, e);
  }
};

const dispatchMessage = async (event: MessageEvent) => {
  let message: any;

  try {
    message = JSON.parse(await readData(event));
  } catch (e) {
    logError('Malformed message from cache server: ', e);
    return;
  }

  if (!Array.isArray(message)) return;

  const [type, subId] = message;

  if (type === 'EOSE') {
    pendingRequests.delete(subId);
    settledSubs.add(subId);
  }

  const handlers = subHandlers.get(subId);

  if (!handlers) return;

  // Copy: handlers commonly unsubscribe themselves on EOSE
  for (const h of [...handlers]) {
    if (type === 'EVENTS' && h.onEvent && Array.isArray(message[2])) {
      const events = message[2];

      for (let i=0;i<events.length;i++) {
        runHandler(subId, () => h.onEvent && h.onEvent(subId, events[i]));
      }
    }

    if (type === 'EVENT' && h.onEvent) {
      runHandler(subId, () => h.onEvent && h.onEvent(subId, message[2]));
    }

    if (type === 'EOSE' && h.onEose) {
      runHandler(subId, () => h.onEose && h.onEose(subId));
    }

    if (type === 'NOTICE' && h.onNotice) {
      runHandler(subId, () => h.onNotice && h.onNotice(subId, message[2]));
    }
  }
};

export const subsTo = (
  subId: string,
  handlers?: SubHandlers,
) => {
  if (!handlers) return () => {};

  const entry = { ...handlers };

  let set = subHandlers.get(subId);

  if (!set) {
    set = new Set();
    subHandlers.set(subId, set);
  }

  set.add(entry);

  return () => {
    const current = subHandlers.get(subId);

    if (!current) return;

    current.delete(entry);

    if (current.size === 0) {
      subHandlers.delete(subId);
    }
  };
};
