import { base64 } from '@scure/base';
import { deviceEncodePrefix } from '../constants';
import { logError } from './logger';

// A non-extractable AES-GCM key kept in IndexedDB, used to encrypt values
// that have to live in localStorage but shouldn't be readable from a raw
// storage dump (e.g. the NIP-46 client transport key). The key material
// never leaves WebCrypto; losing the IndexedDB entry just means re-pairing.

const DB_NAME = 'primal-device-keys';
const STORE_NAME = 'keys';
const DEVICE_KEY_ID = 'device-key-v1';
const IV_LENGTH = 12;

let devicePkPromise: Promise<CryptoKey> | undefined;

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);

  req.onupgradeneeded = () => {
    req.result.createObjectStore(STORE_NAME);
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const idbGet = (db: IDBDatabase, id: string) => new Promise<CryptoKey | undefined>((resolve, reject) => {
  const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(id);

  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const idbPut = (db: IDBDatabase, id: string, key: CryptoKey) => new Promise<void>((resolve, reject) => {
  const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(key, id);

  req.onsuccess = () => resolve();
  req.onerror = () => reject(req.error);
});

const getDeviceKey = () => {
  if (!devicePkPromise) {
    devicePkPromise = (async () => {
      const db = await openDb();

      try {
        let key = await idbGet(db, DEVICE_KEY_ID);

        if (!key) {
          key = await crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt'],
          );
          await idbPut(db, DEVICE_KEY_ID, key);
        }

        return key;
      } finally {
        db.close();
      }
    })();

    devicePkPromise.catch(() => { devicePkPromise = undefined; });
  }

  return devicePkPromise;
};

export const isDeviceEncrypted = (value: string) => value.startsWith(deviceEncodePrefix);

export const deviceEncrypt = async (text: string) => {
  try {
    const key = await getDeviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(text),
    );

    const payload = new Uint8Array(iv.length + ciphertext.byteLength);
    payload.set(iv, 0);
    payload.set(new Uint8Array(ciphertext), iv.length);

    return `${deviceEncodePrefix}${base64.encode(payload)}`;
  } catch(e) {
    logError('Failed to encrypt with device key: ', e);
    return undefined;
  }
};

export const deviceDecrypt = async (cipher: string) => {
  try {
    if (!isDeviceEncrypted(cipher)) return undefined;

    const key = await getDeviceKey();
    const payload = base64.decode(cipher.slice(deviceEncodePrefix.length));

    const iv = payload.slice(0, IV_LENGTH);
    const ciphertext = payload.slice(IV_LENGTH);

    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

    return new TextDecoder('utf-8').decode(plaintext);
  } catch(e) {
    logError('Failed to decrypt with device key: ', e);
    return undefined;
  }
};
