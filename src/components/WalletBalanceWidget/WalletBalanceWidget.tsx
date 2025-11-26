import { Component, Show, createMemo } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useSparkWallet } from '../../contexts/SparkWalletContext';
import { useCurrencyConversion } from '../../hooks/useCurrencyConversion';
import { formatFiatAmount } from '../../lib/currency';
import styles from './WalletBalanceWidget.module.scss';

const WalletBalanceWidget: Component = () => {
  const navigate = useNavigate();
  const sparkWallet = useSparkWallet();

  // Convert to fiat if needed
  const { fiatValue, isLoading } = useCurrencyConversion(
    () => sparkWallet.store.balance || 0,
    () => sparkWallet.store.displayCurrency
  );

  // Determine if we're showing fiat or sats
  const isFiatMode = createMemo(() => sparkWallet.store.displayCurrency !== 'SATS');

  // Format the primary display amount
  const primaryAmount = createMemo(() => {
    if (sparkWallet.store.isBalanceHidden) {
      return '••••';
    }

    if (isFiatMode()) {
      if (isLoading()) return '...';
      return formatFiatAmount(fiatValue() || 0, sparkWallet.store.displayCurrency);
    } else {
      return sparkWallet.store.balance.toLocaleString();
    }
  });

  // Format the secondary display amount (shown only in fiat mode)
  const secondaryAmount = createMemo(() => {
    if (sparkWallet.store.isBalanceHidden) {
      return null;
    }

    if (isFiatMode()) {
      return `${sparkWallet.store.balance.toLocaleString()} sats`;
    }

    return null;
  });

  const handleClick = () => {
    navigate('/wallet');
  };

  const toggleVisibility = (e: MouseEvent) => {
    e.stopPropagation();
    sparkWallet.actions.toggleBalanceVisibility();
  };

  // Only show if wallet is connected and enabled
  return (
    <Show when={sparkWallet.store.isConnected && sparkWallet.store.isEnabled}>
      <div class={styles.widget} onClick={handleClick}>
        <div class={styles.header}>
          <div class={styles.label}>
            <div class={styles.walletIcon}></div>
            <span>Balance</span>
          </div>
          <button
            type="button"
            class={styles.eyeButton}
            onClick={toggleVisibility}
            aria-label={sparkWallet.store.isBalanceHidden ? 'Show balance' : 'Hide balance'}
          >
            <div class={sparkWallet.store.isBalanceHidden ? styles.eyeSlashIcon : styles.eyeIcon}></div>
          </button>
        </div>

        <div class={styles.balanceContainer}>
          <div class={styles.balanceRow}>
            <div class={styles.primaryAmount}>
              {primaryAmount()}
              <Show when={!isFiatMode() && !sparkWallet.store.isBalanceHidden}>
                <span class={styles.unit}> sats</span>
              </Show>
            </div>

            <Show when={sparkWallet.store.pendingPayment?.direction === 'outgoing' && !sparkWallet.store.isBalanceHidden}>
              <div class={styles.pendingAmount}>
                ↑ {sparkWallet.store.pendingPayment.amount.toLocaleString()}
              </div>
            </Show>
          </div>

          <Show when={secondaryAmount()}>
            <div class={styles.secondaryAmount}>
              {secondaryAmount()}
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};

export default WalletBalanceWidget;
