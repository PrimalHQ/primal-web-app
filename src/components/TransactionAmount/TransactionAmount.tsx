import { Component, createEffect, createSignal } from 'solid-js';

import styles from './TransactionAmount.module.scss';
import { floatingPoints } from '../../constants';
import { formatAmount } from '../../utils';

export type Currency = {
  symbol: string,
  name: string,
  shorthand: string,
};

export type Amount = {
  amount: number,
  currency: Currency,
};

export const USD: Currency = {
  symbol: '$',
  name: 'United States Dollar',
  shorthand: 'USD',
};

export const satoshi: Currency = {
  symbol: '',
  name: 'Satoshi',
  shorthand: 'sats',
};


export const BTC: Currency = {
  symbol: '',
  name: 'Bitcoin',
  shorthand: 'BTC',
}

const TransactionAmount: Component<{
  amountUSD?: number,
  amountSats?: number,
  amountBTC?: number,
  reverse?: boolean,
}> = (props) => {

  const [reverseCurrencies, setReverseCurrencies] = createSignal(false);

  createEffect(() => {
    setReverseCurrencies(() => props.reverse || false);
  })

  const btcValue = () => {
    if (props.amountBTC) return {
      amount: props.amountBTC || 0,
      currency: BTC,
    }

    return {
      amount: Math.round(props.amountSats || 0),
      currency: satoshi,
    };
  }

  const primary = () => {
    return reverseCurrencies() ?
      btcValue() :
      {
        amount: props.amountUSD || 0,
        currency: USD,
      };
  };

  const secondary = () => {
    return reverseCurrencies() ?
      {
        amount: props.amountUSD || 0,
        currency: USD,
      } :
      btcValue();
  };

  return (
    <div class={styles.transactionAmount}>
      <button
        class={styles.clickableContainer}
        onClick={() => setReverseCurrencies((t) => !t)}
      >
        <div class={styles.primaryAmount}>
          <div class={styles.amountPrefix}>
            {primary()?.currency.symbol}
          </div>
          <div class={styles.amount}>
            {(primary()?.amount || 0).toLocaleString()}
          </div>
          <div class={styles.amountPostfix}>
            {primary()?.currency.shorthand}
          </div>
        </div>

        <div class={styles.secondaryAmount}>
          <div class={styles.amountPrefix}>
            {secondary()?.currency.symbol}
          </div>
          <div class={styles.amount}>
            {(secondary()?.amount || 0).toLocaleString()}
          </div>
          <div class={styles.amountPostfix}>
            {secondary()?.currency.shorthand}
          </div>
        </div>
      </button>

    </div>
  );
}

export default TransactionAmount;
