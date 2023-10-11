// @ts-ignore Bad types in nostr-tools
import { generatePrivateKey, getPublicKey, nip04, getSignature, getEventHash, validateEvent, verifySignature } from 'nostr-tools';
import { NostrExtension, NostrRelayEvent, NostrRelays, NostrRelaySignedEvent } from '../types/primal';
import { readSecFromStorage, storeSec } from './localStore';

export const generateKeys = (forceNewKey?: boolean) => {
  const sec = forceNewKey ?
    generatePrivateKey() :
    readSecFromStorage() || generatePrivateKey();
  const pubkey = getPublicKey(sec);

  return { sec, pubkey };
};

export const PrimalNostr: (pk?: string) => NostrExtension = (pk?: string) => {
  let sec: string = pk || readSecFromStorage() || generatePrivateKey();

  let pubkey: string = getPublicKey(sec);

  storeSec(sec);

  const gPk: () => Promise<string> = () => new Promise<string>(r => r(getPublicKey(sec)));
  const gRl: () => Promise<NostrRelays> = () => new Promise<NostrRelays>((resolve) => {resolve({})});

  const encrypt: (pubkey: string, message: string) => Promise<string> =
    (pubkey, message) => new Promise((rs, rj) => {
      try {
        rs(nip04.encrypt(sec, pubkey, message));
      } catch(e) {
        console.log('Failed to encript (PrimalNostr): ', e);
        rj();
      }
    });

  const decrypt: (pubkey: string, message: string) => Promise<string> =
    (pubkey, message) => new Promise((rs, rj) => {
      try {
        rs(nip04.decrypt(sec, pubkey, message));
      } catch(e) {
        console.log('Failed to decrypt (PrimalNostr): ', e);
        rj();
      }
    });

  return {
    sec,
    pubkey,
    getPublicKey: gPk,
    getRelays: gRl,
    nip04: {
      encrypt,
      decrypt,
    },
    signEvent: (event: NostrRelayEvent) =>  {
      return new Promise<NostrRelaySignedEvent>((resolve, reject) => {
        try {
          const id = getEventHash(event);
          const sig = getSignature(event, sec);

          const signed: NostrRelaySignedEvent = { ...event, id, sig, pubkey };

          const isValid = validateEvent(signed);
          const isVerified = verifySignature(signed);

          if (!isValid) throw('event-not-valid');
          if (!isVerified) throw('event-sig-not-verified');

          resolve(signed);
        } catch(e) {
          reject(e);
        }
      });
    },
  };
};
