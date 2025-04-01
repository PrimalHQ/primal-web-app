import {
  NostrExtension,
  NostrRelayEvent,
  NostrRelays,
  NostrRelaySignedEvent,
  NostrWindow,
  SendPaymentResponse,
  WebLnExtension,
 } from "../types/primal";
import { PrimalNostr } from "./PrimalNostr";


type QueueItem = {
  action: () => Promise<any>,
  resolve: (result: any) => void,
  reject: (reason: any) => void,
};

class Queue {
  #items: QueueItem[];
  #pendingPromise: boolean;

  constructor() {
    this.#items = [];
    this.#pendingPromise = false;
  }

  enqueue<T>(action: () => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      this.#items.push({ action, resolve, reject });
      this.dequeue();
    });
  }

  async dequeue() {
    if (this.#pendingPromise) return false;

    let item = this.#items.shift();

    if (!item) return false;

    try {
      this.#pendingPromise = true;

      let payload = await item.action();

      this.#pendingPromise = false;
      item.resolve(payload);
    } catch (e) {
      this.#pendingPromise = false;
      item.reject(e);
    } finally {
      this.dequeue();
    }

    return true;
  }

  get size() {
    return this.#items.length;
  }
}

const eventQueue = new Queue();

const enqueueWebLn = async <T>(action: (webln: WebLnExtension) => Promise<T>) => {
  const win = window as NostrWindow;
  const webln = win.webln;

  if (webln === undefined) {
    throw('no_webln_extension');
  }

  return await eventQueue.enqueue<T>(() => action(webln));
}

const enqueueNostr = async <T>(action: (nostr: NostrExtension) => Promise<T>) => {
  const win = window as NostrWindow;
  const nostr = win.nostr || PrimalNostr();

  if (nostr === undefined) {
    throw('no_nostr_extension');
  }

  return await eventQueue.enqueue<T>(() => action(nostr));
}

export const signEvent = async (event: NostrRelayEvent) => {
  try {
    return await enqueueNostr<NostrRelaySignedEvent>(async (nostr) => {
      try {
        return await nostr.signEvent(event);
      } catch(reason) {
        throw(reason);
      }
    })
  } catch (reason) {
    throw(reason);
  }
};

export const getPublicKey = async () => {
  try {
    return await enqueueNostr<string>(async (nostr) => {
      try {
        return await nostr.getPublicKey();
      } catch(reason) {
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const getRelays = async () => {
  try {
    return await enqueueNostr<NostrRelays>(async (nostr) => {
      try {
        return await nostr.getRelays();
      } catch(reason) {
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const encrypt = async (pubkey: string, message: string) => {
  try {
    return await enqueueNostr<string>(async (nostr) => {
      try {
        return await nostr.nip04.encrypt(pubkey, message);
      } catch(reason) {
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const decrypt = async (pubkey: string, message: string) => {
  try {
    return await enqueueNostr<string>(async (nostr) => {
      try {
        return await nostr.nip04.decrypt(pubkey, message);
      } catch(reason) {
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};


export const encrypt44 = async (pubkey: string, message: string) => {
  try {
    return await enqueueNostr<string>(async (nostr) => {
      try {
        return await nostr.nip44.encrypt(pubkey, message);
      } catch(reason) {
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const decrypt44 = async (pubkey: string, message: string) => {
  try {
    return await enqueueNostr<string>(async (nostr) => {
      try {
        return await nostr.nip44.decrypt(pubkey, message);
      } catch(reason) {
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const enableWebLn = async () => {
  try {
    return await enqueueWebLn<void>(async (webln) => {
      try {
        return await webln.enable();
      } catch(reason) {
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};

export const sendPayment = async (paymentRequest: string) => {
  try {
    return await enqueueWebLn<SendPaymentResponse>(async (webln) => {
      try {
        return await webln.sendPayment(paymentRequest);
      } catch(reason) {
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};
