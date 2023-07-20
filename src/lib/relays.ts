// @ts-ignore Bad types in nostr-tools
import { relayInit, Relay } from "nostr-tools";
import { relayConnectingTimeout } from "../constants";
import { NostrRelays } from "../types/primal";

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

const connectToRelay: (relay: Relay) => Promise<Relay> = (relay: Relay) => new Promise(
  (resolve, reject) => {
    const timeout = setTimeout(() => {
      relay.close();
      logError(relay, null, true);
      reject(relay);
    }, relayConnectingTimeout);

    relay.on('connect', () => {
      console.log('CONNECTED: ', relay);
    })

    relay.on('disconnect', () => {
      console.log('DISCONNECTED', relay);
      relay.connect();
    })

    relay.connect()
      .then(() => {
        clearTimeout(timeout);
        resolve(relay);
      })
      .catch((e: any) => {
        logError(relay, e);
        reject(relay);
      });
  },
);

export const connectRelays = async (
  relaySettings: NostrRelays,
  onConnect: (relays: Relay[]) => void,
) => {

  const urls = Object.keys(relaySettings);
  const relays = urls.map(u => relayInit(u));
  let promisses: Promise<Relay>[] = [];

  for (let i=0; i < relays.length; i++) {
    const relay = relays[i];

    if (relay.status === WebSocket.CLOSED) {
      try {
        promisses.push(connectToRelay(relay));
      } catch(e){
        logError(relay, e);
      };
    }
  }

  const result: PromiseSettledResult<Relay>[] = await Promise.allSettled(promisses);

  const connected: Relay[] = result.reduce((acc, r) =>
    r.status === 'fulfilled' ?
      [...acc, r.value] :
      [...acc],
    [] as Relay[],
  );

  onConnect(connected);
};

export const getPreConfiguredRelays = () => {
  const rels: string[] = import.meta.env.PRIMAL_PRIORITY_RELAYS?.split(',') || [];

  return rels.reduce(
    (acc: NostrRelays, r: string) =>
      ({ ...acc, [r]: { read: true, write: true } }),
    {},
  );
};
