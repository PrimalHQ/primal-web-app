import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import ButtonLink from '../../components/Buttons/ButtonLink';
import { shortDate } from '../../lib/dates';

import { premium as t } from '../../translations';
import { formatStorage } from '../../utils';
import { PremiumStore } from './Premium';

import styles from './Premium.module.scss';


const PremiumSidebarActive: Component<{
  data: PremiumStore,
  onSidebarAction: (action: string) => void,
  onOpenFAQ?: () => void,
}> = (props) => {

  const isExpired = () => {
    if (props.data.membershipStatus.tier === 'premium-legend') return false;

    const expiration = props.data.membershipStatus.expires_on || 0;
    const now = (new Date()).getTime() / 1_000;

    return now > expiration;
  }

  const isLegend = () => {
    return props.data.membershipStatus.tier === 'premium-legend';
  }

  return (

    <div class={styles.premiumSidebar}>

      <div class={styles.premiumSidebarTitle}>
        Nostr Tools
      </div>

      <div class={styles.premiumSidebarDescription}>
        <ul>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('premiumRelay')}>
              <div>Premium Relay</div> <div class={styles.chevronRight}></div>
            </ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('mediaManagment')}>
              <div>Media Management</div> <div class={styles.chevronRight}></div>
            </ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('contactBackup')}>
              <div>Contact List Backup</div> <div class={styles.chevronRight}></div>
            </ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('contentBackup')}>
              <div>Content Backup</div> <div class={styles.chevronRight}></div>
            </ButtonLink>
          </li>
        </ul>
      </div>

      <div class={styles.premiumSidebarTitle}>
        Primal Account
      </div>

      <div class={styles.premiumSidebarDescription}>
        <ul>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('orderHistory')}>
              <div>Order history</div> <div class={styles.chevronRight}></div>
            </ButtonLink>
          </li>
          <Show when={!isLegend()}>
            <li>
              <ButtonLink onClick={() => props.onSidebarAction('extendSubscription')}>
                <Show
                  when={isExpired()}
                  fallback={<><div>Extend your subscripton</div> <div class={styles.chevronRight}></div></>}
                >
                  <div>Renew your subscripton</div> <div class={styles.chevronRight}></div>
                </Show>
              </ButtonLink>
            </li>
          </Show>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('changeName')}>
              <div>Change your Primal name</div> <div class={styles.chevronRight}></div>
            </ButtonLink>
          </li>
          <Show when={isLegend()}>
            <li>
              <ButtonLink onClick={() => props.onSidebarAction('customLegend')}>
                <div>Legendary Profile Customization</div> <div class={styles.chevronRight}></div>
              </ButtonLink>
            </li>
          </Show>
            <Show when={!isExpired() && !isLegend()}>
              <li>
                <ButtonLink onClick={() => props.onSidebarAction('becomeLegend')}>
                  <div>Become a Legend</div> <div class={styles.chevronRight}></div>
                </ButtonLink>
              </li>
            </Show>
        </ul>
      </div>

      <div class={styles.premiumSidebarDescription}>
        Have a question?&nbsp;
        <ButtonLink onClick={props.onOpenFAQ}>Check out our FAQ.</ButtonLink>
      </div>
    </div>
  );
}

export default PremiumSidebarActive;
