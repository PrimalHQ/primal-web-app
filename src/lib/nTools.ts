// @ts-nocheck
import {
  nip04,
  nip05,
  nip19,
  nip57,
  utils,
  generatePrivateKey,
  Relay as ntRelay,
  relayInit,
  getPublicKey,
  getSignature,
  getEventHash,
  validateEvent,
  verifySignature,
  Event as NtEvent,
} from "nostr-tools";

type Event = NtEvent;
type Relay = ntRelay;

export {
  nip04,
  nip05,
  nip19,
  nip57,
  utils,
  generatePrivateKey,
  Relay,
  relayInit,
  getPublicKey,
  getSignature,
  getEventHash,
  validateEvent,
  verifySignature,
  Event,
}
