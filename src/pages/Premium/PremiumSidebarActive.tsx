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
    if (props.data.membershipStatus.cohort_1 === 'Primal Legend') return false;

    const expiration = props.data.membershipStatus.expires_on || 0;
    const now = (new Date()).getTime() / 1_000;

    return now > expiration;
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
              Premium Relay
            </ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('mediaManagment')}>
              Media Managment
            </ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('contactBackup')}>
              Contact List Backup
            </ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('contentBackup')}>
              Content Backup
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
              Order history
            </ButtonLink>
          </li>
          <Show when={props.data.membershipStatus.cohort_1 !== 'Primal Legend'}>
            <li>
              <ButtonLink onClick={() => props.onSidebarAction('extendSubscription')}>
                <Show
                  when={isExpired()}
                  fallback="Extend your subscripton"
                >
                  Renew your subscripton
                </Show>
              </ButtonLink>
            </li>
          </Show>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('changeName')}>
              Change your Primal name
            </ButtonLink>
          </li>
          <li>
            <ButtonLink onClick={() => props.onSidebarAction('customLegend')}>
              Legendary Profile Customization
            </ButtonLink>
          </li>
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
