import { useIntl } from '@cookbook/solid-intl';
import { A, useNavigate } from '@solidjs/router';
import { Component, Match, Show, Switch } from 'solid-js';
import ButtonPremium from '../../components/Buttons/ButtonPremium';

import { premium as t } from '../../translations';
import { PrimalUser } from '../../types/primal';
import { PremiumStore } from './Premium';

import styles from './Premium.module.scss';
import PremiumSummary from './PremiumSummary';
import PremiumUserInfo from './PremiumUserInfo';
import { useAppContext } from '../../contexts/AppContext';
import { isIOS } from '../../utils';
import { isAndroid } from '@kobalte/utils';


const PremiumStatusOverview: Component<{
  data: PremiumStore,
  profile?: PrimalUser,
  updateUserMetadata: (option?: 'nip05' | 'lud16') => void,
  onExtendPremium?: () => void,
  onManagePremium?: () => void,
}> = (props) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const app = useAppContext();

  const isLegend = () => props.data.membershipStatus.tier === 'premium-legend';

  const isExpired = () => {
    if (isLegend()) return false;

    const expiration = props.data.membershipStatus.expires_on || 0;
    const now = (new Date()).getTime() / 1_000;

    return now > expiration;
  }

  return (
    <div class={styles.premiumStatusOverview}>

      <PremiumUserInfo
        data={props.data}
        profile={props.profile}
        // @ts-ignore
        legendConfig={app?.legendCustomization[props.profile?.pubkey]}
      />

      <Show when={props.data.membershipStatus.cohort_1 === 'Primal OG' && props.data.membershipStatus.cohort_2 === 'Free'}>
        <div class={styles.freeCaption}>
          Hey there! You are an early Primal user who interacted with our team, so we gave you 6 months of Primal Premium for free. ♥️🫂
        </div>
      </Show>

      <PremiumSummary
        data={props.data}
        expanded={true}
        updateUserMetadata={props.updateUserMetadata}
      />

      <Show when={!isExpired() && !isLegend()}>
        <div class={styles.support}>
          <div>{intl.formatMessage(t.labels.supportFirstLine)}</div>
          <div>
            {intl.formatMessage(t.labels.supportSecondLine)}
            <A href={'/premium/support'}>{intl.formatMessage(t.actions.support)}</A>
          </div>
        </div>
      </Show>

      <div class={styles.extendPlan}>
        <Switch>
          <Match when={isIOS() || isAndroid()}>
            <ButtonPremium onClick={props.onManagePremium}>
              {intl.formatMessage(t.actions.managePremium)}
            </ButtonPremium>
          </Match>

          <Match when={isExpired()}>
            <ButtonPremium onClick={props.onExtendPremium}>
              {intl.formatMessage(t.actions.renewPlan)}
            </ButtonPremium>
          </Match>

          <Match when={props.data.membershipStatus.tier === 'premium'}>
            <ButtonPremium onClick={props.onExtendPremium}>
              {intl.formatMessage(t.actions.extendPlan)}
            </ButtonPremium>
          </Match>
        </Switch>
      </div>
    </div>
  );
}

export default PremiumStatusOverview;
