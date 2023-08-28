// @ts-ignore Bad types in nostr-tools
import { relayInit, Relay } from "nostr-tools";
import { relayConnectingTimeout } from "../constants";
import { sendMessage } from "../sockets";
import { NostrRelays } from "../types/primal";

const attemptLimit = 6;

let reconnAttempts: Record<string, number> = {};

const attemptDelay = (attempt: number) => {
  return 100 + attempt * 500;
}

const logError = (relay: Relay, e: any, timedOut?: boolean) => {
  const message = timedOut ?
  'timed-out connecting to relay: ' :
  'error connecting to relay: ';

  console.log(message, relay.url, e);
};

export const closeRelays = async (relays: Relay[], success = () => {}, fail = () => {}) => {
  try {
    for (let i=0; i< relays.length; i++) {
      await relays[i].close()
    }
    return success();
  } catch (e) {
    return fail();
  }
};

type ConnectToRelay = (
  relay: Relay,
  timeout: number,
  onConnect: (relay: Relay) => void,
  onFail: (relay: Relay, reasons: any) => void,
) => void;

export const connectToRelay: ConnectToRelay =
  (relay, timeout, onConnect, onFail) => {
    const tOut = setTimeout(() => {
      relay.close();
      onFail(relay, 'timeout');
    }, timeout);

    relay.on('connect', () => {
      console.log('CONNECTED ', relay.url);
      clearTimeout(tOut);
      if (!reconnAttempts[relay.url]) {
        reconnAttempts[relay.url] = 0
      }
      onConnect(relay);
    })

    relay.on('disconnect', () => {
      console.log('DISCONNECTED ', relay.url);
      clearTimeout(tOut);
      relay.close();
      onFail(relay, 'disconnect');
    })

    relay.on('error', () => {
      console.log('ERROR CONNECTING ', relay.url);
      clearTimeout(tOut);
      relay.close();
      onFail(relay, 'failed connection');
    })

    try {
      relay.connect();
    } catch (e) {
      console.log('CAUGHT ERROR ', e)
    }
  };

export const connectRelays = async (
  relaySettings: NostrRelays,
  onConnect: (relay: Relay) => void,
  onFail: (relay: Relay, reasons: any) => void,
) => {

  const urls = Object.keys(relaySettings);
  const relays: Relay[] = urls.map(relayInit);

  for (let i=0; i < relays.length; i++) {
    const relay = relays[i];

    if (relay.status === WebSocket.CLOSED) {
      console.log('CONNECTING TO: ', relay.url);
      connectToRelay(relay, relayConnectingTimeout, onConnect, onFail)
    }
  }
};

export const getPreConfiguredRelays = () => {
  const rels: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

  return rels.reduce(
    (acc: NostrRelays, r: string) =>
      ({ ...acc, [r]: { read: true, write: true } }),
    {},
  );
};

export const getDefaultRelays = (subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_default_relays"]},
  ]))
};
