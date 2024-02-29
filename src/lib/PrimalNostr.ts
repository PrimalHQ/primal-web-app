// @ts-ignore Bad types in nostr-tools
import { generatePrivateKey, getPublicKey, nip04, getSignature, getEventHash, validateEvent, verifySignature, nip19 } from 'nostr-tools';
import { NostrExtension, NostrRelayEvent, NostrRelays, NostrRelaySignedEvent } from '../types/primal';
import { readSecFromStorage, storeSec } from './localStore';
import { base64 } from '@scure/base';
import { pinEncodeIVSeparator, pinEncodePrefix } from '../constants';
import { createSignal } from 'solid-js';
import { logError } from './logger';


export const [currentPin, setCurrentPin] = createSignal('');

export const [tempNsec, setTempNsec] = createSignal<string | undefined>();

export const generateKeys = (forceNewKey?: boolean) => {
  const sec = forceNewKey ?
    generatePrivateKey() :
    readSecFromStorage() || generatePrivateKey();
  const pubkey = getPublicKey(sec);

  return { sec, pubkey };
};

export const encryptWithPin = async (pin: string, text: string) => {
  try {
    const crypto = window.crypto;

    if (!crypto) {
      throw('not-secure-env');
    }

    const utf8Encoder = new TextEncoder();

    const key = await crypto.subtle.digest('SHA-256', utf8Encoder.encode(pin));

    let iv = Uint8Array.from(crypto.getRandomValues(new Uint8Array(16)));
    let plaintext = utf8Encoder.encode(text)
    let cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['encrypt'])
    let ciphertext = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, cryptoKey, plaintext)
    let ctb64 = base64.encode(new Uint8Array(ciphertext))
    let ivb64 = base64.encode(new Uint8Array(iv.buffer))

    return `${pinEncodePrefix}${ctb64}${pinEncodeIVSeparator}${ivb64}`
  } catch(e) {
    logError('Failed to encrypt with PIN: ', e);
    return '';
  }
};

export const decryptWithPin = async (pin: string, cipher: string) => {
  try {
    if (!cipher.startsWith(pinEncodePrefix)) {
      throw('bad-cipher');
    }

    const crypto = window.crypto;

    if (!crypto) {
      throw('not-secure-env');
    }
    const utf8Encoder = new TextEncoder();
    const utf8Decoder = new TextDecoder('utf-8');

    const data = cipher.slice(pinEncodePrefix.length);
    const key = await crypto.subtle.digest('SHA-256', utf8Encoder.encode(pin));

    let [ctb64, ivb64] = data.split(pinEncodeIVSeparator)

    let cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['decrypt'])
    let ciphertext = base64.decode(ctb64)
    let iv = base64.decode(ivb64)

    let plaintext = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, ciphertext)

    let text = utf8Decoder.decode(plaintext)
    return text
  } catch(e) {
    logError('Failed to decrypt with PIN: ', e);
    return '';
  }
};

export const PrimalNostr: (pk?: string) => NostrExtension = (pk?: string) => {
  const getSec = async () => {
    let sec: string = pk || readSecFromStorage() || tempNsec() || generatePrivateKey();

    if (sec.startsWith(pinEncodePrefix)) {
      sec = await decryptWithPin(currentPin(), sec);
    }

    const decoded = nip19.decode(sec);

    if (decoded.type !== 'nsec' || !decoded.data) {
      throw('invalid-nsec');
    }

    sec = decoded.data;

    return sec.length > 0 ? sec : undefined;
  }

  const gPk: () => Promise<string> = async () => {
    const sec = await getSec();
    if (!sec) throw('pubkey-no-nsec');

    return await getPublicKey(sec);
  };

  const gRl: () => Promise<NostrRelays> = () => new Promise<NostrRelays>((resolve) => {resolve({})});

  const encrypt: (pubkey: string, message: string) => Promise<string> =
    async (pubkey, message) => {
      const sec = await getSec();
      if (!sec) throw('encrypt-no-nsec');

      return await nip04.encrypt(sec, pubkey, message);
    };

  const decrypt: (pubkey: string, message: string) => Promise<string> =
    async (pubkey, message) => {
      const sec = await getSec();
      if (!sec) throw('decrypt-no-nsec');

      return await nip04.decrypt(sec, pubkey, message);
    };

  const signEvent = async (event: NostrRelayEvent) => {
    const sec = await getSec();
    if (!sec) throw('sign-no-nsec');

    const pubkey: string = await gPk();

    let evt = { ...event, pubkey };

    // @ts-ignore
    evt.id = getEventHash(evt);
    // @ts-ignore
    evt.sig = getSignature(evt, sec);

    const isValid = validateEvent(evt);
    const isVerified = verifySignature(evt);

    if (!isValid) throw('event-not-valid');
    if (!isVerified) throw('event-sig-not-verified');

    return evt as NostrRelaySignedEvent;
  };

  return {
    getPublicKey: gPk,
    getRelays: gRl,
    nip04: {
      encrypt,
      decrypt,
    },
    signEvent,
  };
};
