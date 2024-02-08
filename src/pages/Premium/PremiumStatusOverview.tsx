import { useIntl } from '@cookbook/solid-intl';
import { useNavigate } from '@solidjs/router';
import { Component, Show } from 'solid-js';
import { unwrap } from 'solid-js/store';
import Avatar from '../../components/Avatar/Avatar';
import ButtonLink from '../../components/Buttons/ButtonLink';
import ButtonPremium from '../../components/Buttons/ButtonPremium';
import { useAccountContext } from '../../contexts/AccountContext';
import { shortDate } from '../../lib/dates';
import { userName } from '../../stores/profile';

import { premium as t } from '../../translations';
import { PrimalUser } from '../../types/primal';
import { formatStorage } from '../../utils';
import { PremiumStore } from './Premium';

import styles from './Premium.module.scss';
import PremiumSummary from './PremiumSummary';


const PremiumStatusOverview: Component<{
  data: PremiumStore,
  profile?: PrimalUser,
  onExtendPremium?: () => void,
}> = (props) => {
  const intl = useIntl();
  const navigate = useNavigate();

  const isExpired = () => {
    const expiration = props.data.membershipStatus.expires_on || 0;
    const now = (new Date()).getTime() / 1_000;

    return now > expiration;
  }

  return (
    <div class={styles.premiumStatusOverview}>

      <div class={styles.userInfo}>
        <Avatar user={props.profile} size="xl" />
        <div class={styles.userName}>
          {userName(props.profile)}
          <div class={styles.orangeCheck}></div>
        </div>
      </div>

      <div class={styles.premiumActive}>
        <Show
          when={isExpired()}
          fallback={
            <div class={styles.activePremium}>
              <div class={styles.caption}>ACTIVE Premium</div>
              <div class={styles.date}><div>{shortDate(props.data.membershipStatus.expires_on || 0)}</div></div>
            </div>
          }
        >
          <div class={styles.expiredPremium}>
            <div class={styles.caption}>Expired</div>
            <div class={styles.date}><div>{shortDate(props.data.membershipStatus.expires_on || 0)}</div></div>
          </div>
        </Show>
      </div>

      <PremiumSummary
        data={props.data}
        expanded={true}
      />

      <Show
        when={isExpired()}
        fallback={
          <div class={styles.extendPlan}>
            <ButtonPremium onClick={props.onExtendPremium}>
              {intl.formatMessage(t.actions.extendPlan)}
            </ButtonPremium>
          </div>
        }
      >
        <div class={styles.extendPlan}>
          <ButtonPremium onClick={props.onExtendPremium}>
            {intl.formatMessage(t.actions.renewPlan)}
          </ButtonPremium>
        </div>
      </Show>
    </div>
  );
}

export default PremiumStatusOverview;
