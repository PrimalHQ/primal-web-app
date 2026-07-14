import { unwrap } from "solid-js/store";
import { abortAllPendingEvents, accountStore, closeConfirmDialog, closeSignerUnreachableDialog, consumeAbortedEvent, dequeUnsignedEvent, enqueUnsignedEvent, logout, openConfirmDialog, openSignerUnreachableDialog, refreshQueue, updateAccountStore } from "../stores/accountStore";
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

export const handleSignerFailure = (reason: any, tempId: string, suppressDialog = false) => {
  isDev() && updateAccountStore('sendErrors', () => ({ [tempId]: `${reason}` }));

  // Only user-initiated event publishing (signEvent of a write) should surface
  // the unreachable dialog. Reads (throwaway settings events) and background
  // crypto/auth ops (getPublicKey, encrypt/decrypt, webln) pass suppressDialog so
  // a disconnected signer doesn't nag the user without any action on their part.
  if (suppressDialog) return;

  if (reason === 'promise_timeout' && accountStore.loginType === 'nip46') {
    openSignerUnreachableDialog({
      title: 'Remote signer unreachable',
      description: 'Primal can\'t reach the remote signer. Please make sure your signer is online and the Primal session is active',
      confirmLabel: 'Retry',
      onConfirm: () => {
        refreshQueue();
        closeSignerUnreachableDialog();
      },
      // Abort (also triggered by dismissing the dialog): drop every pending
      // write and revert the optimistic UI effects they applied.
      abortLabel: 'Abort',
      onAbort: () => {
        abortAllPendingEvents();
        closeSignerUnreachableDialog();
      },
      // Log out: abort pending writes as above, then end the session.
      cancelLabel: 'Log out',
      onCancel: () => {
        abortAllPendingEvents();
        logout();
        closeSignerUnreachableDialog();
      },
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

export const signEvent = async (e: NostrRelayEvent, opts?: { isRead?: boolean, onAbort?: () => void }) => {
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

        // The user aborted this event while this signing was in flight (e.g. the
        // signer reconnected just after Abort). Forget it: don't broadcast.
        if (consumeAbortedEvent(tempId)) {
          throw('event_aborted');
        }

        dequeUnsignedEvent(unwrap(event), tempId);
        return signed;
      } catch(reason) {
        throw(reason);
      }
    })
  } catch (reason: any) {
    eventQueue.abortCurrent();

    // Aborted after a successful sign — already forgotten above; don't re-queue
    // or reopen the dialog.
    if (reason === 'event_aborted') {
      throw(reason);
    }

    if (reason === 'user rejected' || reason?.message?.includes('denied') || reason?.message?.includes('reject')) {
      dequeUnsignedEvent(unwrap(event), tempId);
      throw(reason);
    }
    // The user aborted this event's signer flow while this signing was in flight
    // (e.g. a queue-monitor retry mid-timeout). Don't re-queue it or reopen the dialog.
    if (consumeAbortedEvent(tempId)) {
      throw(reason);
    }
    // Reads sign a throwaway settings event just to authenticate a fetch. Never
    // enqueue them: the queue monitor would retry via signEvent(item) without the
    // isRead flag and reopen the dialog later, "by just waiting". Fail silently.
    if (opts?.isRead) {
      handleSignerFailure(reason, tempId, true);
      throw(reason);
    }
    enqueUnsignedEvent(unwrap(event), tempId, opts?.onAbort);
    handleSignerFailure(reason, tempId);
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
        handleSignerFailure(reason, 'getPublicKey', true);
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
        handleSignerFailure(reason, 'getRelays', true);
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
        handleSignerFailure(reason, 'encrypt', true);
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
        handleSignerFailure(reason, 'decrypt', true);
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
        handleSignerFailure(reason, 'encrypt44', true);
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
        handleSignerFailure(reason, 'decrypt44', true);
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
        handleSignerFailure(reason, 'webln', true);
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
        handleSignerFailure(reason, 'sendPayment', true);
        throw(reason);
      }
    });
  } catch (reason) {
    throw(reason);
  }
};
