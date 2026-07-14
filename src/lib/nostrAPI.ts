import { unwrap } from "solid-js/store";
import { accountStore, closeConfirmDialog, closeSignerUnreachableDialog, dequeUnsignedEvent, enqueUnsignedEvent, logout, openConfirmDialog, openSignerUnreachableDialog, refreshQueue, updateAccountStore } from "../stores/accountStore";
import {
  NostrExtension,
  NostrRelayEvent,
  NostrRelays,
  NostrRelaySignedEvent,
  NostrWindow,
  SendPaymentResponse,
  WebLnExtension,
 } from "../types/primal";
import { isDev, uuidv4 } from "../utils";
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
      setTimeout(() => {
        this.#items.push({ action, resolve, reject });
        this.dequeue();
      }, 0);
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

export const handleSignerFailure = (reason: any, tempId: string, isRead = false) => {
  isDev() && updateAccountStore('sendErrors', () => ({ [tempId]: `${reason}` }));

  // Read requests sign a throwaway settings event just to authenticate a fetch.
  // A signer failure there should be silent — don't nag the user with the popup.
  if (isRead) return;

  if (reason === 'promise_timeout' && accountStore.loginType === 'nip46') {
    openSignerUnreachableDialog({
      title: 'Remote signer unreachable',
      description: 'Primal can\'t reach the remote signer. Please make sure your signer is online and the Primal session is active',
      confirmLabel: 'Retry',
      onConfirm: () => {
        refreshQueue();
        closeSignerUnreachableDialog();
      },
      abortLabel: 'Log out',
      onAbort: () => {
        logout();
        closeSignerUnreachableDialog();
      }
    });
  }

  if (reason === 'promise_timeout' && accountStore.loginType === 'extension') {
    updateAccountStore('signerTimeout', true);
  }

  // if (reason === 'promise_timeout' && accountStore.loginType === 'extension') {
  //   openConfirmDialog({
  //     title: 'Can\'t find a nostr extension',
  //     description: 'Primal was unable to find an active nostr extension. Please make sure an extension is available and active',
  //     confirmLabel: 'Retry',
  //     onConfirm: () => {
  //       refreshQueue();
  //       closeConfirmDialog();
  //     },
  //     abortLabel: 'Log out',
  //     onAbort: () => {
  //       logout();
  //       closeConfirmDialog();
  //     }
  //   });
  // }
}

export const timeoutPromiseResolve = (timeout = 8_000) => {
  return new Promise<undefined>((resolve, reject) => {
    setTimeout(() => {
      resolve(undefined);
    }, timeout);
  });
}

export const signEvent = async (e: NostrRelayEvent, opts?: { isRead?: boolean }) => {
  let event = {...e};
  const tempId = event.id || `${uuidv4()}`;

  const hastClientTag = event.tags.find(t => t[0] === 'client');

  if (!hastClientTag) {
    event.tags.push(['client', 'Primal Web']);
  }

  try {
    return await enqueueNostr<NostrRelaySignedEvent>(async (nostr) => {
      try {
        const signed = await Promise.race([
          nostr.signEvent(unwrap(event)),
          timeoutPromise(),
        ]) as NostrRelaySignedEvent;
        // const signed = await nostr.signEvent(event);

        updateAccountStore('signerTimeout', false);
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
    handleSignerFailure(reason, tempId, opts?.isRead);
    throw(reason);
  }
};

export const getPublicKey = async () => {
  try {
    return await enqueueNostr<string>(async (nostr) => {
      try {
        const pubkey = await Promise.race([
          nostr.getPublicKey(),
          timeoutPromise(),
        ]) as string;

        updateAccountStore('signerTimeout', false);
        return pubkey;

      } catch(reason) {
        handleSignerFailure(reason, 'getPublicKey');
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
        const relays = await Promise.race([
          nostr.getRelays(),
          timeoutPromise(),
        ]) as NostrRelays;

        updateAccountStore('signerTimeout', false);
        return relays;
      } catch(reason) {
        handleSignerFailure(reason, 'getRelays');
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
        const enc = await Promise.race([
          nostr.nip04.encrypt(pubkey, message),
          timeoutPromise(),
        ]) as string;

        updateAccountStore('signerTimeout', false);
        return enc;
      } catch(reason) {
        handleSignerFailure(reason, 'encrypt');
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
        const dec = await Promise.race([
          nostr.nip04.decrypt(pubkey, message),
          timeoutPromise(),
        ]) as string;

        updateAccountStore('signerTimeout', false);
        return dec;
      } catch(reason) {
        handleSignerFailure(reason, 'decrypt');
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
        const enc = await Promise.race([
          nostr.nip44.encrypt(pubkey, message),
          timeoutPromise(),
        ]) as string;

        updateAccountStore('signerTimeout', false);
        return enc;
      } catch(reason) {
        handleSignerFailure(reason, 'encrypt44');
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
        const dec = await Promise.race([
          nostr.nip44.decrypt(pubkey, message),
          timeoutPromise(),
        ]) as string;

        updateAccountStore('signerTimeout', false);
        return dec;
      } catch(reason) {
        handleSignerFailure(reason, 'decrypt44');
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
        await Promise.race([
          webln.enable(),
          timeoutPromise(),
        ]) as void;

        updateAccountStore('signerTimeout', false);

        return;
      } catch(reason) {
        handleSignerFailure(reason, 'webln');
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
        const pay = await Promise.race([
          webln.sendPayment(paymentRequest),
          timeoutPromise(),
        ]) as SendPaymentResponse;

        updateAccountStore('signerTimeout', false);
        return pay;
      } catch(reason) {
        handleSignerFailure(reason, 'sendPayment');
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};
