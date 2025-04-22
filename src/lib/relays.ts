import { relayInit, Relay } from "../lib/nTools";
import { relayConnectingTimeout } from "../constants";
import { sendMessage } from "../sockets";
import { NostrRelays } from "../types/primal";
import { logError, logInfo } from "./logger";

let reconnAttempts: Record<string, number> = {};

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
  tryReconnecting: boolean,
) => Promise<boolean>;

export const connectToRelay: ConnectToRelay =
  async (relay, timeout, onConnect, onFail, tryReconnecting) => {
    // const tOut = setTimeout(() => {
    //   relay.close();
    //   onFail(relay, 'timeout');
    // }, timeout);

    // relay.on('connect', () => {
    //   logInfo('Connected to relay ', relay.url);
    //   clearTimeout(tOut);
    //   if (!reconnAttempts[relay.url]) {
    //     reconnAttempts[relay.url] = 0
    //   }
    //   onConnect(relay);
    // })

    // relay.on('disconnect', () => {
    //   logInfo('Disconnected from relay ', relay.url);
    //   clearTimeout(tOut);
    //   relay.close();
    //   onFail(relay, 'disconnect');
    // })

    // relay.on('error', () => {
    //   logError('Error connecting to relay ', relay.url);
    //   clearTimeout(tOut);
    //   relay.close();
    //   onFail(relay, 'failed connection');
    // })

    relay.onclose = () => {
      logInfo('Relay connection closed: ', relay);
      onFail(relay, tryReconnecting ? 'disconnect' : 'close');
    }

    try {
      logInfo('Connecting relay: ', relay);
      await relay.connect();
      logInfo('Connected to relay: ', relay);
      onConnect(relay);
      return true;
    } catch (e) {
      logError('Failed to initiate connection to relay ', e)
      onFail(relay, 'failed connection');
      return false;
    }
  };

export const connectRelays = async (
  relaySettings: NostrRelays,
  onConnect: (relay: Relay) => void,
  onFail: (relay: Relay, reasons: any) => void,
  tryReconnecting = true,
) => {

  const urls = Object.keys(relaySettings);
  const relays: Relay[] = urls.map(relayInit);

  for (let i=0; i < relays.length; i++) {
    const relay = relays[i];

    if (!relay.ws || relay.ws.readyState === WebSocket.CLOSED) {
      logInfo('Connecting to relay: ', relay.url);
      await connectToRelay(relay, relayConnectingTimeout, onConnect, onFail, tryReconnecting)
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

export const getDefaultBlossomServers = (subid: string) => {
  sendMessage(JSON.stringify([
    "REQ",
    subid,
    {cache: ["get_recommended_blossom_servers"]},
  ]))
};
