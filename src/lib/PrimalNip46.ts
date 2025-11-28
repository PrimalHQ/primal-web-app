import { bytesToHex, hexToBytes } from 'nostr-tools/utils';
import { verifyEvent, nip46, getPublicKey, generatePrivateKey } from '../lib/nTools';
import { NostrExtension, NostrRelayEvent, NostrRelays, NostrRelaySignedEvent } from '../types/primal';
import { uuidv4 } from '../utils';
import { logWarning } from './logger';
import primalLogo from '../assets/icons/logo_fire_roster.png';

export let appSigner: nip46.BunkerSigner | undefined;

export const setAppSigner = (bunker: nip46.BunkerSigner) => {
  appSigner = bunker;
}

export const generateAppKeys = (opts?: { reset?: boolean }) => {
  if (localStorage.getItem('appNsec') && !opts?.reset) return;

  let sk = generatePrivateKey();
  let pk = getPublicKey(sk);

  localStorage.setItem('appNsec', bytesToHex(sk));
  localStorage.setItem('appPubkey', pk);
}

export const getAppPK = () => localStorage.getItem('appPubkey');

export const getAppSK = () => {
  const nsecHex = localStorage.getItem('appNsec');

  if (!nsecHex) return;

  try {
    const sk = hexToBytes(nsecHex);

    return sk;
  } catch (e) {
    logWarning('Failed to decode App nsec: ', e);
    return;
  }
}

export const generateClientConnectionUrl = (): string => {
  const clientPubkey = getAppPK();

  if (!clientPubkey) return '';

  const n = localStorage.getItem('clientConnectionUrl') ||
    nip46.createNostrConnectURI({
      clientPubkey,
      relays: ['wss://relay.primal.net'],
      secret: `sec-${uuidv4()}`,
      name: 'PrimalWeb',
      url: location.origin,
      image: `${location.origin}${primalLogo}`,
    });

  localStorage.setItem('clientConnectionUrl', n);

  return n;
}

export const storeBunker = (bunker: nip46.BunkerSigner) => {
  const remotePubkey = bunker.bp.pubkey;
  const relays = bunker.bp.relays.reduce<string>((acc, r, i) => i === 0 ? `relay=${r}` : `${acc}&relay=${r}`,'');
  const secret = bunker.bp.secret;

  const bunkerUrl = `bunker://${remotePubkey}?${relays}&secret=${secret}`;

  localStorage.setItem('bunkerUrl', bunkerUrl);
  setAppSigner(bunker);

  return bunkerUrl;
}

export const PrimalNip46: (pk?: string) => NostrExtension = (pk?: string) => {
  const gPk: () => Promise<string> = async () => {
      if (!appSigner) throw('no-bunker-found');
    return await appSigner?.getPublicKey();
  };

  const gRl: () => Promise<NostrRelays> = () => new Promise<NostrRelays>((resolve) => {resolve({})});

  const encrypt: (pubkey: string, message: string) => Promise<string> =
    async (pubkey, message) => {
      if (!appSigner) throw('no-bunker-found');
      return appSigner?.nip04Encrypt(pubkey, message);
    };

  const decrypt: (pubkey: string, message: string) => Promise<string> =
    async (pubkey, message) => {
      if (!appSigner) throw('no-bunker-found');
      return appSigner?.nip04Decrypt(pubkey, message);
    };

  const encrypt44: (pubkey: string, message: string) => Promise<string> =
    async (pubkey, message) => {
      if (!appSigner) throw('no-bunker-found');
      return appSigner?.nip44Encrypt(pubkey, message);
    };

  const decrypt44: (pubkey: string, message: string) => Promise<string> =
    async (pubkey, message) => {
      if (!appSigner) throw('no-bunker-found');
      return appSigner.nip44Encrypt(pubkey, message);
    };

  const signEvent = async (event: NostrRelayEvent) => {
    if (!appSigner) throw('no-bunker-found');

    let evt = await appSigner.signEvent(event);

    const isVerified = verifyEvent(evt);

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
