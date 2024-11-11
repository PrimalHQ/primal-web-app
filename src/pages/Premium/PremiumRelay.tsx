import { Component, Match, Show, Switch } from 'solid-js';

import styles from './Premium.module.scss';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import StickySidebar from '../../components/StickySidebar/StickySidebar';
import Wormhole from '../../components/Wormhole/Wormhole';
import Search from '../Search';
import PremiumSidebarActive from './PremiumSidebarActive';
import PremiumSidebarInactve from './PremiumSidebarInactive';
import { useIntl } from '@cookbook/solid-intl';
import { premium as t } from '../../translations';

import foreverPremium from '../../assets/images/premium_forever_small.png';
import privateBetaBuilds from '../../assets/images/private_beta_builds.png';
import customProfile from '../../assets/images/preston_small.png';
import heart from '../../assets/images/heart.png';

import { appStoreLink, playstoreLink } from '../../constants';
import { A, useNavigate } from '@solidjs/router';
import ButtonLink from '../../components/Buttons/ButtonLink';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import { PremiumStore } from './Premium';

import primalLogo from '../../assets/icons/logo_fire.svg';
import { useAccountContext } from '../../contexts/AccountContext';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';

const premiumRelay = 'wss://premium.primal.net/';

const PremiumRelay: Component<{
  data: PremiumStore,
}> = (props) => {
  const account = useAccountContext();
  const intl = useIntl()
  const navigate = useNavigate();

  const isConnected = () => account?.relays.find(r => r.url === premiumRelay);

  return (
    <div class={styles.legendLayout}>
      <div class={styles.premiumRelayLayout}>
        <div class={styles.primalLogo}></div>
        <div class={styles.title}>Premium Relay</div>
        <div class={styles.subtitle}>Running strfry.git version1.0.2</div>
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
