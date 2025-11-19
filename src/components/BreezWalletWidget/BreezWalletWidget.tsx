import { Component, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { useAccountContext } from '../../contexts/AccountContext';
import { hookForDev } from '../../lib/devTools';

import styles from './BreezWalletWidget.module.scss';

const BreezWalletWidget: Component<{ id?: string }> = (props) => {
  const account = useAccountContext();

  const isConnected = () => account?.breezWallet.isConnected;
  const isActive = () => account?.activeWalletType === 'breez';
  const balance = () => account?.breezWallet.balance || 0;

  return (
    <div id={props.id}>
      <Show when={account?.hasPublicKey()}>
        <A
          href="/wallet"
          class={`${styles.walletWidget} ${isConnected() ? styles.connected : ''} ${isActive() ? styles.active : ''}`}
        >
          <div class={styles.walletIcon}>
            <div class={styles.lightningIcon}></div>
          </div>
          <div class={styles.walletInfo}>
            <div class={styles.walletLabel}>
              <Show when={isConnected()} fallback={<>Lightning Wallet</>}>
                Breez Spark
              </Show>
            </div>
            <Show when={isConnected()}>
              <div class={styles.walletBalance}>
                {balance().toLocaleString()} sats
              </div>
            </Show>
            <Show when={!isConnected()}>
              <div class={styles.walletStatus}>
                Not connected
              </div>
            </Show>
          </div>
          <Show when={isActive()}>
            <div class={styles.activeIndicator}>
              <div class={styles.checkCircleIcon}></div>
            </div>
          </Show>
        </A>
      </Show>
    </div>
  );
};

export default hookForDev(BreezWalletWidget);
