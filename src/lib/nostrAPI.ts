import { unwrap } from "solid-js/store";
import { accountStore, dequeUnsignedEvent, enqueUnsignedEvent } from "../stores/accountStore";
import {
  NostrExtension,
  NostrRelayEvent,
  NostrRelays,
  NostrRelaySignedEvent,
  NostrWindow,
  SendPaymentResponse,
  WebLnExtension,
 } from "../types/primal";
import { uuidv4 } from "../utils";
import { PrimalNip46 } from "./PrimalNip46";
import { PrimalNostr } from "./PrimalNostr";


type QueueItem = {
  action: () => Promise<any>,
  resolve: (result: any) => void,
  reject: (reason: any) => void,
};

export class Queue {
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

  abortCurrent() {
    return this.#items.shift();
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
  const loginType = accountStore.loginType;

  if (['none', 'guest', 'npub'].includes(loginType)) throw('no_login');

  let nostr: NostrExtension | undefined;

  if (loginType === 'extension') {
    const win = window as NostrWindow;
    nostr = win.nostr;

    if (nostr === undefined) {
      throw('no_nostr_extension');
    }
  }

  if (loginType === 'local') {
    nostr = PrimalNostr();

    if (nostr === undefined) {
      throw('no_nostr_local');
    }
  }

  if (loginType === 'nip46') {
    nostr = PrimalNip46();

    if (nostr === undefined) {
      throw('no_nostr_nip46');
    }
  }

  if (nostr === undefined) {
    throw('unknown_login');
  }

  return await eventQueue.enqueue<T>(() => action(nostr));
}

export const SIGN_TIMEOUT = 12_000;

export const timeoutPromise = (timeout = 8_000) => {
  return new Promise((_resolve, reject) => {
    setTimeout(() => {
      reject('promise_timeout');
    }, timeout);
  });
}

export const signEvent = async (event: NostrRelayEvent) => {
  const tempId = event.id || `${uuidv4()}`;
  try {
    return await enqueueNostr<NostrRelaySignedEvent>(async (nostr) => {
      try {
        const signed = await Promise.race([
          nostr.signEvent(unwrap(event)),
          timeoutPromise(),
        ]) as NostrRelaySignedEvent;
        // const signed = await nostr.signEvent(event);

        dequeUnsignedEvent(unwrap(event), tempId);
        return signed;
      } catch(reason) {
        throw(reason);
      }
    })
  } catch (reason: any) {
    eventQueue.abortCurrent();

    if (reason === 'user rejected' || reason?.message?.includes('denied') || reason?.message?.includes('reject')) {
      dequeUnsignedEvent(unwrap(event), tempId);
      throw(reason);
    }
    enqueUnsignedEvent(unwrap(event), tempId);
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
