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
        <Avatar user={props.profile} size="xl" />
        <div class={styles.userName}>
          {displayName()}
          <VerificationCheck
            user={props.profile}
            large={true}
          />
        </div>
      </div>

      <div class={styles.premiumActive}>
        <div class={styles.activePremium}>
          <div class={styles.caption}>{'Primal Legend'}</div>
          <div class={styles.date}>
            <div>{`Class of ${(new Date()).getFullYear()}`}</div>
          </div>
        </div>
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
