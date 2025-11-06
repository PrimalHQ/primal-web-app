import { Kind } from './src/constants';
import { SimplePool } from './src/lib/nTools';
import { NWCConfig } from './src/lib/wallet';
import { NostrRelaySignedEvent } from './src/types/primal';

type WorkerMessageType = {
  type: string,
  eventData?: { event: NostrRelaySignedEvent, relays: string[] },
  relays?: string[],
  nwcData?: { event: NostrRelaySignedEvent, nwcConfig: NWCConfig },
}

// @ts-ignore
let relayPool: SimplePool | undefined;

// TODO: MAKE THIS A GLOBAL WORKER THAT HANDLES RELAY POOLS
self.addEventListener('message', (e: MessageEvent<WorkerMessageType>) => {
  const { type, eventData, relays, nwcData } = e.data;

  if (type === 'INIT' || !relayPool) {
    // @ts-ignore
    relayPool = new SimplePool({ enablePing: true, enableReconnect: true });
  }

  if (type === 'OPEN_RELAYS' && relays) {
    for (let i=0; i < relays.length; i++) {
      const url = relays[i];

      relayPool.ensureRelay(url).then(r => self.postMessage({ type: 'RELAY_OPENED', relay: r.url }));
    }
  }

  if (type === 'CLOSE_RELAYS' && relays) {
    relayPool.close(relays);
    self.postMessage('RELAYS_CLOSED');
  }

  if (type === 'SEND_NWC' && nwcData) {
    const { event, nwcConfig: { relays, pubkey, secret } } = nwcData;

    const subInfo = relayPool.subscribe(
      relays,
      {
        kinds: [Kind.WalletInfo, Kind.WalletResponse],
        authors: [pubkey, event.id],
      },
      {
        onevent: (eInfo) => {
          if (!relayPool) {
            subInfo.close();
            return;
          }

          if (eInfo.kind === Kind.WalletInfo && eInfo.content.split(' ').includes('pay_invoice')) {
            relayPool.publish(relays, event);
            return;
          }

          if (eInfo.kind === Kind.WalletResponse) {
            if (!eInfo.tags.find(t => t[0] === 'e' && t[1] === event.id)) return;

            subInfo.close();
            self.postMessage({
              event: eInfo,
              secret,
              pubkey,
            })
          }
        }
      }
    )

  }

  if (type === 'NWC_INFO' && nwcData) {
    const {  nwcConfig: { relays, pubkey, } } = nwcData;

    const sub = relayPool.subscribe(
      relays,
      {
        kinds: [Kind.WalletInfo],
        authors: [pubkey],
      },
      {
        onevent: (e) => {
          self.postMessage({ event: e });
        },
        oneose: () => {
          sub.close();
        }
      }
    )
  }

  if (type === 'SEND_EVENT' && eventData) {
    const { event, relays } = eventData;

    const unsub = relayPool.subscribe(
      relays,
      {
        kinds: [event.kind],
        authors: [event.pubkey],
      },
      {
        onevent: (e) => {
          unsub.close();
        }
      }
    )

    try {
      Promise.any(relayPool.publish(relays, event)).then(() => {
        self.postMessage({ success: true, note: event });
      })
    }
    catch (e) {
      console.log('Failed to publish the event: ', e);
      self.postMessage({ success: false, note: event });
    }
  }

  // if (type === 'PROCESS') {
  //   // Do heavy computation
  //   const result = data.map(x => x * 2);
  //   self.postMessage({ type: 'RESULT', data: result });
  // }
});
