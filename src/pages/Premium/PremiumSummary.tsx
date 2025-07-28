import { useIntl } from '@cookbook/solid-intl';
import { Component, Show } from 'solid-js';
import { shortDate } from '../../lib/dates';

import { premium as t } from '../../translations';
import { formatStorage } from '../../utils';
import { PremiumStore } from './Premium';

import styles from './Premium.module.scss';
import { useAccountContext } from '../../contexts/AccountContext';
import ButtonLink from '../../components/Buttons/ButtonLink';


const PremiumSummary: Component<{
  data: PremiumStore,
  rename?: boolean,
  expanded?: boolean,
  hideApply?: boolean,
  updateUserMetadata: (option?: 'nip05' | 'lud16', force?: boolean) => void,
}> = (props) => {
  const account = useAccountContext();

  const name = () => props.rename ? props.data.rename : props.data.name;

  const status = () => props.data.membershipStatus;

  const isNip05Primal = () => {
    return props.data.recipient?.nip05 === `${name()}@primal.net`;
  }
  const isLud16Primal = () => {
    return props.data.recipient?.lud16 === `${name()}@primal.net`;
  }

  const applyNip05 = () => {
    props.updateUserMetadata('nip05', true)
  }

  const applyLud16 = () => {
    props.updateUserMetadata('lud16', true)
  }


  const totalStorage = () => {
    if (props.data.membershipStatus.tier === 'premium-legend') {
      return '100GB';
    }

    if (props.data.membershipStatus.tier === 'premium') {
      return '10GB';
    }

    return 0;
  }

  return (
    <div class={styles.premiumSummary}>
      <div class={styles.summaryItem}>
        <div class={styles.summaryName}>
          <div class={styles.verifIcon}></div>
          <div>Verified nostr address</div>
        </div>
        <div class={styles.summaryValueHolder}>
          <Show
            when={isNip05Primal() || props.hideApply}
            fallback={
              <>
                <div class={styles.summaryValue}>
                  {props.data.recipient?.nip05}
                </div>
                <div class={styles.summaryAlternateValue}>
                  <div>{name()}@primal.net</div>
                  <ButtonLink onClick={applyNip05}>apply</ButtonLink>
                </div>
              </>
            }
          >
            <div class={styles.summaryValue}>
              {name()}@primal.net
            </div>
          </Show>
        </div>
      </div>

      <div class={styles.summaryItem}>
        <div class={styles.summaryName}>
          <div class={styles.zapIcon}></div>
          <div>Bitcoin lightning address</div>
        </div>
        <div class={styles.summaryValueHolder}>
          <Show
            when={isLud16Primal() || props.hideApply}
            fallback={
              <>
                <div class={styles.summaryValue}>
                  {props.data.recipient?.lud16}
                </div>
                <div class={styles.summaryAlternateValue}>
                  <div>{name()}@primal.net</div>
                  <ButtonLink onClick={applyLud16}>apply</ButtonLink>
                </div>
              </>
            }
          >
            <div class={styles.summaryValue}>
              {name()}@primal.net
            </div>
          </Show>
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
              {formatStorage(status().used_storage || 0)} of {totalStorage()}
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
              {status().expires_on ? shortDate(status().expires_on || 0) : 'Never'}
            </span>
          </div>
        </div>
      </Show>
    </div>
  );
}

export default PremiumSummary;
