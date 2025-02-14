import { Component, createEffect, createSignal, For } from 'solid-js';

import styles from './Premium.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { premium as t } from '../../translations';


import ButtonPremium from '../../components/Buttons/ButtonPremium';
import { PrimalUser } from '../../types/primal';
import Avatar from '../../components/Avatar/Avatar';
import { userName } from '../../stores/profile';
import { PremiumStore } from './Premium';
import TransactionAmount from '../../components/TransactionAmount/TransactionAmount';
import VerificationCheck from '../../components/VerificationCheck/VerificationCheck';
import ButtonFlip2 from '../../components/Buttons/ButtonFlip2';
import PremiumCohortInfo from './PremiumCohortInfo';

const donations: [string, number][] = [
  ['USD', 1000],
  ['USD', 2500],
  ['USD', 5000],
  ['USD', 7500],
  ['USD', 10000],
  ['BTC', 1],
];

const PremiumBecomeLegend: Component<{
  data: PremiumStore,
  profile?: PrimalUser,
  onBuyLegend?: (amount: number) => void,
  getExchangeRate?: () => void,
  isOG?: boolean,
}> = (props) => {
  const intl = useIntl()

  const rate = () => (props.data.exchangeRateUSD || 1) / 100_000_000;
  const [amount, setAmount] = createSignal(0);

  const displayName = () => {
    if (props.data.name.length > 0) return props.data.name;

    return userName(props.profile);
  }

  createEffect(() => {
    if (props.data.isSocketOpen) {
      props.getExchangeRate && props.getExchangeRate()
    }
  });

  createEffect(() => {
    setAmount(() => 1_000 / rate());
  });


  const subscription = () => {
    const a = amount();

    return {
      amounts: {
        usd: Math.ceil(a * rate()),
        sats: Math.ceil(a),
      }
    }
  }

  const selectDonation = (donation: [string, number]) => {
    let [c, a] = donation;

    if (c === 'USD') {
      setAmount(() => Math.floor(a / rate()));
      return;
    }

    setAmount(Math.floor(a * 100_000_000));
  }

  return (
    <div class={styles.premiumBecomeLegend}>

      <div class={styles.userInfo}>
        <Avatar
          user={props.profile}
          size="xl"
          legendConfig={{
            style: 'GOLD',
            custom_badge: true,
            avatar_glow: true,
          }}
        />
        <div class={styles.userName}>
          {displayName()}
          <VerificationCheck
            user={props.profile}
            large={true}
            mock={true}
            legendConfig={{
              style: 'GOLD',
              custom_badge: true,
              avatar_glow: true,
            }}
          />
        </div>
      </div>

      <div class={styles.premiumActive}>
        <PremiumCohortInfo
          userTier={'premium-legend'}
          cohortInfo={{
            cohort_1: 'Legend',
            cohort_2: `${(new Date()).getFullYear()}`,
            tier: 'premium-legend',
            expires_on: (new Date()).getTime() + 1_000,
          }}
          legendConfig={{
            style: 'GOLD',
            custom_badge: true,
            avatar_glow: true,
          }}
        />
      </div>

      <TransactionAmount
        reverse={true}
        amountUSD={subscription().amounts.usd}
        amountBTC={subscription().amounts.sats / 100_000_000}
      />

      <div class={styles.donation}>
        <div class={styles.donationCaption}>
          Select donation amount
        </div>
        <div class={styles.donationPicker}>
          <For each={donations}>
            {donation => (
              <ButtonFlip2
                onClick={() => selectDonation(donation)}
                when={donation[0] === 'USD' ? subscription().amounts.usd === donation[1] : subscription().amounts.sats === donation[1] * 100_000_000}
              >
                {donation[0] === 'USD' ? '$' : ''}{donation[1].toLocaleString()}{donation[0] === 'BTC' ? ' BTC' : ''}
              </ButtonFlip2>
            )}
          </For>
        </div>
      </div>

      <div class={styles.legendaryPay}>
        <ButtonPremium
          onClick={() => props.onBuyLegend && props.onBuyLegend(subscription().amounts.usd)}
        >
          {intl.formatMessage(t.actions.payNow)}
        </ButtonPremium>
      </div>

    </div>
  );
}

export default PremiumBecomeLegend;
