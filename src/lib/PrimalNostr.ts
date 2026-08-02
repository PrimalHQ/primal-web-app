import { generatePrivateKey, getPublicKey, nip04, nip44, nip19, finalizeEvent, verifyEvent } from '../lib/nTools';
import { NostrExtension, NostrRelayEvent, NostrRelays, NostrRelaySignedEvent } from '../types/primal';
import { readSecFromStorage, storeSec } from './localStore';
import { base64 } from '@scure/base';
import { pinEncodeIVSeparator, pinEncodePrefix, pinEncodePrefixV2 } from '../constants';
import { createSignal } from 'solid-js';
import { logError } from './logger';


export const [currentPin, setCurrentPin] = createSignal('');

export const [tempNsec, setTempNsec] = createSignal<string | undefined>();

export const generateKeys = () => {
  const sec = generatePrivateKey();
  const nsec = nip19.nsecEncode(sec);
  const pubkey = getPublicKey(sec);

  return { sec, nsec, pubkey };
};

const PIN_KDF_ITERATIONS = 600_000;
const PIN_SALT_LENGTH = 16;
const PIN_IV_LENGTH = 12;

// PBKDF2 is deliberately slow; cache the derived key so signing many events
// during a session doesn't re-run the KDF on every getSec call.
let cachedPinKey: { pin: string, saltB64: string, key: CryptoKey } | undefined;

const derivePinKey = async (pin: string, salt: Uint8Array) => {
  const saltB64 = base64.encode(salt);

  if (cachedPinKey && cachedPinKey.pin === pin && cachedPinKey.saltB64 === saltB64) {
    return cachedPinKey.key;
  }

  const utf8Encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    utf8Encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PIN_KDF_ITERATIONS },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  cachedPinKey = { pin, saltB64, key };

  return key;
};

export const encryptWithPin = async (pin: string, text: string) => {
  try {
    const crypto = window.crypto;

    if (!crypto) {
      throw('not-secure-env');
    }

    const utf8Encoder = new TextEncoder();

    const salt = crypto.getRandomValues(new Uint8Array(PIN_SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(PIN_IV_LENGTH));

    const key = await derivePinKey(pin, salt);

    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8Encoder.encode(text));

    const payload = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    payload.set(salt, 0);
    payload.set(iv, salt.length);
    payload.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return `${pinEncodePrefixV2}${base64.encode(payload)}`;
  } catch(e) {
    logError('Failed to encrypt with PIN: ', e);
    return '';
  }
};

const decryptWithPinLegacy = async (pin: string, cipher: string) => {
  const utf8Encoder = new TextEncoder();
  const utf8Decoder = new TextDecoder('utf-8');

  const data = cipher.slice(pinEncodePrefix.length);
  const key = await crypto.subtle.digest('SHA-256', utf8Encoder.encode(pin));

  let [ctb64, ivb64] = data.split(pinEncodeIVSeparator)

  let cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['decrypt'])
  let ciphertext = base64.decode(ctb64)
  let iv = base64.decode(ivb64)

  let plaintext = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, ciphertext)

  return utf8Decoder.decode(plaintext);
};

// Once a legacy blob decrypts to a valid nsec, replace the stored copy with
// the v2 format. Only touches storage when the cipher is the stored sec, so
// a wrong-PIN decrypt that slips past CBC padding can't clobber the key.
const upgradeLegacyPinCipher = async (pin: string, plain: string, legacyCipher: string) => {
  try {
    if (readSecFromStorage() !== legacyCipher) return;

    const decoded = nip19.decode(plain);
    if (decoded.type !== 'nsec' || !decoded.data) return;

    const enc = await encryptWithPin(pin, plain);
    if (enc.startsWith(pinEncodePrefixV2)) {
      storeSec(enc);
    }
  } catch(e) {
    logError('Failed to upgrade legacy PIN cipher: ', e);
  }
};

export const decryptWithPin = async (pin: string, cipher: string) => {
  try {
    const crypto = window.crypto;

    if (!crypto) {
      throw('not-secure-env');
    }

    if (cipher.startsWith(pinEncodePrefixV2)) {
      const payload = base64.decode(cipher.slice(pinEncodePrefixV2.length));

      const salt = payload.slice(0, PIN_SALT_LENGTH);
      const iv = payload.slice(PIN_SALT_LENGTH, PIN_SALT_LENGTH + PIN_IV_LENGTH);
      const ciphertext = payload.slice(PIN_SALT_LENGTH + PIN_IV_LENGTH);

      const key = await derivePinKey(pin, salt);

      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

      return new TextDecoder('utf-8').decode(plaintext);
    }

    if (!cipher.startsWith(pinEncodePrefix)) {
      throw('bad-cipher');
    }

    const text = await decryptWithPinLegacy(pin, cipher);

    await upgradeLegacyPinCipher(pin, text, cipher);

    return text;
  } catch(e) {
    logError('Failed to decrypt with PIN: ', e);
    return '';
  }
};

export const PrimalNostr: (pk?: string) => NostrExtension = (pk?: string) => {
  const getSec = async () => {
    let sec: string | undefined = pk || readSecFromStorage() || tempNsec();

    if (!sec) {
      throw('no-nsec');
    }

    if (sec.startsWith(pinEncodePrefix)) {
      sec = await decryptWithPin(currentPin(), sec);
    }

    const decoded = nip19.decode(sec);

    if (decoded.type !== 'nsec' || !decoded.data) {
      throw('invalid-nsec');
    }

    const sk = decoded.data;

    return sk.length > 0 ? sk : undefined;
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

  const encrypt44: (pubkey: string, message: string) => Promise<string> =
    async (pubkey, message) => {
      const sec = await getSec();
      if (!sec) throw('encrypt-no-nsec');

      const key = nip44.getConversationKey(sec, pubkey);

      return nip44.v2.encrypt(message, key);
    };

  const decrypt44: (pubkey: string, message: string) => Promise<string> =
    async (pubkey, message) => {
      const sec = await getSec();
      if (!sec) throw('decrypt-no-nsec');

      const key = nip44.getConversationKey(sec, pubkey);

      return nip44.v2.decrypt(message, key);
    };

  const signEvent = async (event: NostrRelayEvent) => {
    const sec = await getSec();
    if (!sec) throw('sign-no-nsec');

    // const pubkey: string = await gPk();

    let evt = finalizeEvent({ ...event }, sec);

    const isVerified = verifyEvent(evt);

    // let evt = { ...event, pubkey };

    // // @ts-ignore
    // evt.id = getEventHash(evt);
    // // @ts-ignore
    // evt.sig = getSignature(evt, sec);

    // const isValid = validateEvent(evt);
    // const isVerified = verifySignature(evt);

    // if (!isValid) throw('event-not-valid');
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
    nip44: {
      encrypt: encrypt44,
      decrypt: decrypt44,
    },
    signEvent,
  };
};
