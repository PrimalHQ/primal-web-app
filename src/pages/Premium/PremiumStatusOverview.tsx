import { useIntl } from '@cookbook/solid-intl';
import { A, useNavigate } from '@solidjs/router';
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
import VerificationCheck from '../../components/VerificationCheck/VerificationCheck';
import PremiumUserInfo from './PremiumUserInfo';


const PremiumStatusOverview: Component<{
  data: PremiumStore,
  profile?: PrimalUser,
  onExtendPremium?: () => void,
}> = (props) => {
  const intl = useIntl();
  const navigate = useNavigate();

  const isExpired = () => {
    if (props.data.membershipStatus.cohort_1 === 'Primal Legend') return false;

    const expiration = props.data.membershipStatus.expires_on || 0;
    const now = (new Date()).getTime() / 1_000;

    return now > expiration;
  }

  return (
    <div class={styles.premiumStatusOverview}>

      <PremiumUserInfo
        data={props.data}
        profile={props.profile}
      />

      <Show when={props.data.membershipStatus.cohort_1 === 'Primal OG' || props.data.membershipStatus.cohort_2 === 'Free'}>
          <div class={styles.freeCaption}>
            Hey there! You are an early Primal user who interacted with our team, so we gave you 6 months of Primal Premium for free. ♥️🫂
          </div>
      </Show>

      <PremiumSummary
        data={props.data}
        expanded={true}
      />

      <Show when={!isExpired()}>
        <div class={styles.support}>
          <div>{intl.formatMessage(t.labels.supportFirstLine)}</div>
          <div>
            {intl.formatMessage(t.labels.supportSecondLine)}
            <A href={'/premium/support'}>{intl.formatMessage(t.actions.support)}</A>
          </div>
        </div>
      </Show>

      <Show when={props.data.membershipStatus.cohort_1 !== 'Primal Legend'}>
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
      </Show>

    </div>
  );
}

export default PremiumStatusOverview;
