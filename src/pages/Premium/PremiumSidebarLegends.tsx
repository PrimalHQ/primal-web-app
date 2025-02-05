import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { shortDate } from '../../lib/dates';

import { premium as t } from '../../translations';
import { formatStorage } from '../../utils';
import { PremiumStore } from './Premium';

import styles from './Premium.module.scss';


const PremiumSidebarLegends: Component<{
  onOpenFAQ?: () => void,
}> = (props) => {

  return (

    <div class={styles.premiumSidebar}>
    <div class={styles.premiumSidebarTitle}>
      About Primal Legends
    </div>

    <div class={styles.legendsSidebarDescription}>
      <p>
        The Legend tier was created to recognize users who made a significant contribution to Nostr and/or Primal.
      </p>

      <p>
        You can join the Legend tier by contributing $1000 or more to Primal. As a Primal Legend, you will get:
      </p>

      <ul>
        <li>
          <b>Forever Premium</b>. Primal Premium subscription never expires for Legends.
        </li>
        <li>
          <b>Way More Storage</b>. Get 100GB of Primal Premium media storage.
        </li>
        <li>
          <b>Legendary Custom Profile</b>. Options to pick the color of your verified badge, set an avatar glow, and appear on our public list of Legends.
        </li>
      </ul>

      <p>
        Have a question?&nbsp;
        <ButtonLink onClick={props.onOpenFAQ}>Check out our FAQ.</ButtonLink>
      </p>
    </div>
  </div>
  );
}

export default PremiumSidebarLegends;
