import {
  finalizeEvent,
  generateSecretKey as generatePrivateKey,
  getPublicKey,
  verifyEvent
} from 'nostr-tools';

import { AbstractRelay as Relay } from 'nostr-tools/abstract-relay';
import { Relay as RelayFactory } from 'nostr-tools';

import {
  nip04,
  nip05,
  nip19,
  nip57,
  utils,
} from "nostr-tools";

const relayInit = (url: string) => {
  const relay = new RelayFactory(url);
  return relay;
}

export {
  nip04,
  nip05,
  nip19,
  nip57,
  utils,
  generatePrivateKey,
  Relay,
  RelayFactory,
  relayInit,
  getPublicKey,
  verifyEvent,
  finalizeEvent,
}
