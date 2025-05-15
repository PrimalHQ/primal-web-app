import {
  finalizeEvent,
  generateSecretKey as generatePrivateKey,
  getPublicKey,
  verifyEvent
} from 'nostr-tools';

// @ts-ignore
import { AbstractRelay as Relay } from 'nostr-tools/abstract-relay';
import { Relay as RelayFactory } from 'nostr-tools';

import {
  nip04,
  nip05,
  nip19,
  nip44,
  nip47,
  nip57,
  utils,
} from "nostr-tools";

const relayInit = (url: string) => {
  const relay = new RelayFactory(url);
  return relay;
}

const generateNsec = () => nip19.nsecEncode(generatePrivateKey())

export {
  nip04,
  nip05,
  nip19,
  nip44,
  nip47,
  nip57,
  utils,
  generatePrivateKey,
  generateNsec,
  Relay,
  RelayFactory,
  relayInit,
  getPublicKey,
  verifyEvent,
  finalizeEvent,
}
