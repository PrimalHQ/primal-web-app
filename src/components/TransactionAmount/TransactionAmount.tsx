import { Component, createSignal } from 'solid-js';

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
}

const TransactionAmount: Component<{
  amountUSD?: number,
  amountSats?: number,
}> = (props) => {

  const [reverseCurrencies, setReverseCurrencies] = createSignal(false);

  const primary = () => {
    return reverseCurrencies() ?
      {
        amount: props.amountSats || 0,
        currency: satoshi,
      } :
      {
        amount: props.amountUSD || 0,
        currency: USD,
      }
  };

  const secondary = () => {
    return reverseCurrencies() ?
      {
        amount: props.amountUSD || 0,
        currency: USD,
      } :
      {
        amount: props.amountSats || 0,
        currency: satoshi,
      }
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
