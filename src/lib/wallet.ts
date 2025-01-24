import { APP_ID } from "../App";
import { Kind } from "../constants";
import { logInfo } from "./logger";
import { Relay, relayInit } from "./nTools";
import { decrypt, signEvent } from "./nostrAPI";
import { sendMessage, subTo } from "./sockets";


const ACTIVE_WALLET_STATUS = '2';

export const checkPrimalWalletActive = async (pubkey: string, socket: WebSocket) => {
  return new Promise<boolean>(async (resolve) => {
    const subId = `check_availability_${APP_ID}`;

    let timer = setTimeout(() => {
      resolve(false);
    }, 5_000);

    let isActive = false;

    const unsub = subTo(socket, subId, (type, _, content) => {
      if (type === 'EOSE') {
        unsub();
        socket.close();
        clearTimeout(timer);
        resolve(isActive)
      }

      if (type === 'EVENT') {
        isActive = content?.content === ACTIVE_WALLET_STATUS;
      }

      if (type === 'NOTICE') {
        unsub();
        clearTimeout(timer);
        socket.close();
        resolve(false);
      }
    });

    const content = JSON.stringify(
      ["is_user", { pubkey }],
    );

    const event = {
      content,
      kind: Kind.WALLET_NWC_ACTIVE,
      created_at: Math.ceil((new Date()).getTime() / 1000),
      tags: [],
    };

    try {
      const signedEvent = await signEvent(event);

      sendMessage(socket, JSON.stringify([
        "REQ",
        subId,
        { cache: ["wallet", { operation_event: signedEvent }] },
      ]));
    } catch (e) {
      resolve(false);
    }
  });
};

export const connectPrimalWalletActive = async (appname: string, socket: WebSocket) => {
  return new Promise<string>(async (resolve) => {
    const subId = `connect_primal_wallet_${APP_ID}`;

    let timer = setTimeout(() => {
      resolve('');
    }, 5_000);

    let url = '';

    const unsub = subTo(socket, subId, (type, _, content) => {
      if (type === 'EOSE') {
        unsub();
        socket.close();
        clearTimeout(timer);
        resolve(url)
      }

      if (type === 'EVENT') {
        const cont = JSON.parse(content?.content || '{}');
        url = cont.uri || '';
      }

      if (type === 'NOTICE') {
        unsub();
        clearTimeout(timer);
        socket.close();
        resolve('');
      }
    });

    const content = JSON.stringify(
      ["nwc_connect", { appname }],
    );

    const event = {
      content,
      kind: Kind.WALLET_NWC_CONNECTION,
      created_at: Math.ceil((new Date()).getTime() / 1000),
      tags: [],
    };

    try {
      const signedEvent = await signEvent(event);

      sendMessage(socket, JSON.stringify([
        "REQ",
        subId,
        { cache: ["wallet", { operation_event: signedEvent }] },
      ]));
    } catch (e) {
      resolve('');
    }
  });
};

export type NWCConfig = {
  pubkey: string,
  relays: string[],
  secret: string,
  lud16?: string,
};

export const decodeNWCUri = (uri: string) => {
  // Uri format:
  // nostr+walletconnect://[pubkey]?relay=[relay]&secret=[secret]&lud16=[lud16]

  const url = decodeURIComponent(uri);
  const pIndex = url.indexOf('://');

  const protocol = url.slice(0, pIndex);
  const address = url.slice(pIndex+3)

  let res: NWCConfig = {
    pubkey: '',
    relays: [],
    secret: '',
  };

  if (protocol !== 'nostr+walletconnect') return res;

  const [pubkey, query] = address.split('?');

  res.pubkey = pubkey;

  const searchParams = new URLSearchParams(query);

  for (const param of searchParams.entries()) {
    if (param[0] === 'relay') {
      res.relays.push(param[1]);
      continue;
    }

    if (param[0] === 'secret') {
      res.secret = param[1];
      continue;
    }

    if (param[0] === 'lud16') {
      res.lud16 = param[1];
      continue;
    }
  }

  return res;
};

export const sendNWCInfoEvent = async (nwcConfig: NWCConfig) => {
  let relays: Relay[] = [];
  let relayConnections = []

  for (let i = 0; i < nwcConfig.relays.length; i++) {
    const relayUri = nwcConfig.relays[i];

    const relay = relayInit(relayUri);

    relay.connect().then(() => {
      const sub = relay.subscribe([{ kinds: [13194], authors: [nwcConfig.pubkey]}], {
        onevent(event) {
          logInfo('GOT EVENT: ', event);
        },
        oneose() {
          sub.close();
          relay.close();
        }
      })
    });
  }
};

export const sendNWCPayInvoice = async (nwcConfig: NWCConfig, invoice: string) => {
  let relays: Relay[] = [];
  let relayConnections = []

  for (let i = 0; i < nwcConfig.relays.length; i++) {
    const relayUri = nwcConfig.relays[i];

    const relay = relayInit(relayUri);

    relay.connect().then(() => {
      const sub = relay.subscribe([{ kinds: [13194], authors: [nwcConfig.pubkey]}], {
        onevent(event) {
          logInfo('GOT EVENT: ', event);
        },
        oneose() {
          sub.close();
          relay.close();
        }
      })
    });
  }
};
