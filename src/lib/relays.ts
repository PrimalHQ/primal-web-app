import { relayInit, Relay } from "nostr-tools";
import { relayConnectingTimeout } from "../constants";
import { NostrRelays } from "../types/primal";

const logError = (relay: Relay, e: any, timedOut?: boolean) => {
  const message = timedOut ?
  'timed-out connecting to relay: ' :
  'error connecting to relay: ';

  console.log(message, relay.url, e);
};

export const closeRelays = async (relays: Relay[]) => {
  try {
    for (let i=0; i< relays.length; i++) {
      await relays[i].close()
    }
    return true;
  } catch (e) {
    return false;
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
      .then((x) => {
        clearTimeout(timeout);
        resolve(x);
      })
      .catch((e) => {
        logError(relay, e);
        reject();
      });
  },
);

export const connectRelays = async (
  relaySettings: NostrRelays,
  onConnect: (relay: Relay) => void,
) => {

  const urls = Object.keys(relaySettings);
  const relays = urls.map(u => relayInit(u));

  for (let i=0; i < relays.length; i++) {
    const relay = relays[i];

    if (relay.status === WebSocket.CLOSED) {
      connectToRelay(relay).
        then(() => onConnect(relay)).
        catch((e) => {
          logError(relay, e);
        });
    }
  }
};
