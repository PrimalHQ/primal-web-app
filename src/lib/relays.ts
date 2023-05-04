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

const connectToRelay = (relay: Relay) => new Promise(
  (resolve, reject) => {
    const timeout = setTimeout(() => {
      relay.close();
      logError(relay, null, true);
      reject();
    }, relayConnectingTimeout);

    relay.connect()
      .then(() => {
        clearTimeout(timeout);
        resolve(true);
      })
      .catch((e) => {
        logError(relay, e);
        reject();
      });
  },
);

export const connectRelays = async (
  relaySettings: NostrRelays,
  onConnect: (relays: Relay[]) => void,
) => {

  const urls = Object.keys(relaySettings);
  const relays = urls.map(u => relayInit(u));
  const connected: Relay[] = [];

  for (let i=0; i < relays.length; i++) {
    const relay = relays[i];

    if (relay.status === WebSocket.CLOSED) {
      try {
        await connectToRelay(relay);
        connected.push(relay);
      } catch(e){
        logError(relay, e);
      };
    }
  }
  onConnect(connected);
};
