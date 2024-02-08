import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import { shortDate } from '../../lib/dates';

import { premium as t } from '../../translations';
import { formatStorage } from '../../utils';
import { PremiumStore } from './Premium';

import styles from './Premium.module.scss';


const PremiumSummary: Component<{
  data: PremiumStore,
  rename?: boolean,
  expanded?: boolean,
}> = (props) => {

  const name = () => props.rename ? props.data.rename : props.data.name;

  const status = () => props.data.membershipStatus;

  return (
    <div class={styles.premiumSummary}>
      <div class={styles.summaryItem}>
        <div class={styles.summaryName}>
          <div class={styles.verifIcon}></div>
          <div>Verified nostr address</div>
        </div>
        <div>
          <span class={styles.summaryValue}>
            {name()}@primal.net
          </span>
        </div>
      </div>

      <div class={styles.summaryItem}>
        <div class={styles.summaryName}>
          <div class={styles.zapIcon}></div>
          <div>Bitcoin lightning address</div>
        </div>
        <div>
          <span class={styles.summaryValue}>
            {name()}@primal.net
          </span>
        </div>
      </div>

      <div class={styles.summaryItem}>
        <div class={styles.summaryName}>
          <div class={styles.linkIcon}></div>
          <div>VIP profile on primal.net</div>
        </div>
        <div>
          <span class={styles.summaryValue}>
            primal.net/{name()}
          </span>
        </div>
      </div>

      <Show when={props.expanded}>
        <div class={styles.summaryItem}>
          <div class={styles.summaryName}>
            <div class={styles.uploadIcon}></div>
            <div>Media storage used</div>
          </div>
          <div>
            <span class={styles.summaryValue}>
              {formatStorage(status().used_storage || 0)} of 100GB
            </span>
          </div>
        </div>

        <div class={styles.summaryItem}>
          <div class={styles.summaryName}>
            <div class={styles.calendarIcon}></div>
            <div>Subscription expires on</div>
          </div>
          <div>
            <span class={styles.summaryValue}>
              {shortDate(status().expires_on || 0)}
            </span>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default PremiumSummary;
