import {
  finalizeEvent,
  generateSecretKey as generatePrivateKey,
  getPublicKey,
  verifyEvent,
  SimplePool,
  Event,
} from 'nostr-tools';

import * as nip46 from 'nostr-tools/nip46'

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
  nip46,
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
  SimplePool,
};

export type NostrEvent = Event;
