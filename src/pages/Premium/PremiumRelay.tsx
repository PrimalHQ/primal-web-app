import { Component, onMount, Show } from 'solid-js';

import styles from './Premium.module.scss';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import { PremiumStore } from './Premium';

import { useAccountContext } from '../../contexts/AccountContext';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import { createStore } from 'solid-js/store';

const premiumRelay = 'wss://premium.primal.net/';

const PremiumRelay: Component<{
  data: PremiumStore,
}> = (props) => {
  const account = useAccountContext();

  const isConnected = () => account?.relays.find(r => r.url === premiumRelay);

  const [relayInfo, setRelayInfo] = createStore<any>({});

  const fetchRelayVersion = async () => {
    const response = await fetch('https://premium.primal.net', {
      headers: {
        'Accept': 'application/nostr+json',
      }
    });

    const ri = await response.json() as { version: string };

    setRelayInfo(() => ({ ...ri }));
  };

  onMount(() => {
    fetchRelayVersion();
  });

  return (
    <div class={styles.legendLayout}>
      <div class={styles.premiumRelayLayout}>
        <div class={styles.primalLogo}></div>
        <div class={styles.title}>Premium Relay</div>
        <Show when={relayInfo.version}>
          <div class={styles.subtitle}>Running strfry.git version {relayInfo.version}</div>
        </Show>
        <div class={styles.separator}></div>
        <div class={styles.relayDescription}>
          The Primal Premium relay is a high-
          performance Nostr relay that only accepts content from Primal Premium users. Posting to this relay improves your visibility on the Nostr network because it guarantees high signal and lack of spam to any Nostr user that reads from it.
        </div>
        <div class={styles.premiumRelayAddress}>
          <Show
            when={isConnected()}
            fallback={<div class={styles.disconnected}></div>}
          >
            <div class={styles.connected}></div>
          </Show>
          <div>{premiumRelay}</div>
        </div>

        <Show
          when={isConnected()}
          fallback={
            <ButtonPremium
              onClick={() => account?.actions.addRelay(premiumRelay)}
            >
              Connect to Premium Relay
            </ButtonPremium>
          }
        >
          <ButtonSecondary
            onClick={() => {}}
          >
            Connected to Premium Relay
          </ButtonSecondary>
        </Show>
      </div>
    </div>
  );
}

export default PremiumRelay;
