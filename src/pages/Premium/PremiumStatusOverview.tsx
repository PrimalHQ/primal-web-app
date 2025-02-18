import { useIntl } from '@cookbook/solid-intl';
import { A, useNavigate } from '@solidjs/router';
import { Component, Match, Show, Switch, createEffect, createSignal } from 'solid-js';
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
import ButtonLink from '../../components/Buttons/ButtonLink';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';
import TextInput from '../../components/TextInput/TextInput';
import PremiumLegendMoreDonation from './PremiumLegendMoreDonation';
import { SetStoreFunction } from 'solid-js/store';
import { getExchangeRate } from '../../lib/membership';


const PremiumStatusOverview: Component<{
  data: PremiumStore,
  setData: SetStoreFunction<PremiumStore>,
  profile?: PrimalUser,
  updateUserMetadata: (option?: 'nip05' | 'lud16') => void,
  onExtendPremium?: () => void,
  onManagePremium?: () => void,
  getExchangeRate?: () => void,
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
  };

  const [moreDonations, setMoreDonation] = createSignal(false);

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

      <Show when={isLegend()}>
        <div class={styles.legendContribution}>
          <div class={styles.current}>
            <div class={styles.label}>
              Your contribution to Primal:
            </div>
            <div class={styles.value}>
              {(parseFloat(props.data.membershipStatus.donated_btc || '0') * 100_000_000).toLocaleString()} sats
            </div>
          </div>

          <Show
            when={parseFloat(props.data.membershipStatus.donated_btc || '0') > 0}
          >
            <div class={styles.legendsDonateMore}>
              Thank you for you support! 💜🫂
            </div>
          </Show>

          <ButtonLink
            onClick={() => setMoreDonation(true)}
          >
            <Show
              when={parseFloat(props.data.membershipStatus.donated_btc || '0')}
              fallback={<span>Want to make a donation?</span>}
            >
              <span>Want to contribute more?</span>
            </Show>
          </ButtonLink>

        </div>
      </Show>

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

      <PremiumLegendMoreDonation
        data={props.data}
        open={moreDonations()}
        setOpen={setMoreDonation}
        onOpen={() => {
          props.getExchangeRate && props.getExchangeRate();
        }}
        onDonate={(amount: number, paymentType: 'lightning' | 'onchain') => {
          props.setData('openDonation', () => [amount, paymentType]);
        }}
      />

    </div>
  );
}

export default PremiumStatusOverview;
