import { Component, createEffect, createSignal, Show } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { useAccountContext } from '../contexts/AccountContext';
import { isBreezWalletConfigured, loadEncryptedSeed, clearAllBreezData } from '../lib/breezStore';
import { useToastContext } from '../components/Toaster/Toaster';
import ButtonPrimary from '../components/Buttons/ButtonPrimary';
import ButtonSecondary from '../components/Buttons/ButtonSecondary';
import { TextField } from '@kobalte/core/text-field';
import AdvancedSearchDialog from '../components/AdvancedSearch/AdvancedSearchDialog';

import styles from './Wallet.module.scss';

const Wallet: Component = () => {
  const intl = useIntl();
  const account = useAccountContext();
  const toast = useToastContext();

  const [mnemonic, setMnemonic] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [showMnemonic, setShowMnemonic] = createSignal(false);
  const [openConnectDialog, setOpenConnectDialog] = createSignal(false);

  // Auto-connect if wallet is configured
  createEffect(() => {
    if (account?.publicKey) {
      const isConfigured = isBreezWalletConfigured(account.publicKey);

      if (isConfigured && !account.breezWallet.isConnected) {
        autoConnect();
      }
    }
  });

  const autoConnect = async () => {
    if (!account?.publicKey) return;

    try {
      setIsLoading(true);
      const seed = await loadEncryptedSeed(account.publicKey);

      if (seed) {
        await account.actions.connectBreezWallet(seed);
      }
    } catch (error: any) {
      console.error('Auto-connect failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    const seed = mnemonic().trim();

    if (!seed) {
      toast?.sendWarning('Please enter a mnemonic');
      return;
    }

    if (!account?.publicKey) {
      toast?.sendWarning('Please log in first');
      return;
    }

    try {
      setIsLoading(true);
      await account.actions.connectBreezWallet(seed);
      setMnemonic('');
      setOpenConnectDialog(false);
      toast?.sendSuccess('Breez wallet connected successfully');
    } catch (error: any) {
      console.error('Connection failed:', error);
      toast?.sendWarning(`Failed to connect: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      await account?.actions.disconnectBreezWallet();
      toast?.sendSuccess('Breez wallet disconnected');
    } catch (error: any) {
      console.error('Disconnect failed:', error);
      toast?.sendWarning(`Failed to disconnect: ${error?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveWallet = () => {
    if (!account?.publicKey) return;

    if (confirm('Are you sure you want to remove your Breez wallet? Make sure you have backed up your seed phrase!')) {
      try {
        clearAllBreezData(account.publicKey);
        account.actions.updateBreezWallet({
          isActive: false,
          isConnected: false,
          balance: 0,
        });
        account.actions.setActiveWalletType(null);
        toast?.sendSuccess('Breez wallet removed');
      } catch (error: any) {
        toast?.sendWarning(`Failed to remove wallet: ${error?.message}`);
      }
    }
  };

  const handleSetAsActive = () => {
    account?.actions.setActiveWalletType('breez');
    toast?.sendSuccess('Breez wallet set as active payment method');
  };

  const handleRefreshBalance = async () => {
    try {
      setIsLoading(true);
      await account?.actions.updateBreezBalance();
      toast?.sendSuccess('Balance updated');
    } catch (error: any) {
      toast?.sendWarning(`Failed to update balance: ${error?.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div class={styles.walletPage}>
      <PageTitle title="Lightning Wallet" />

      <PageCaption>
        <div>Breez Spark Wallet</div>
      </PageCaption>

      <div class={styles.walletContent}>
        <Show
          when={account?.breezWallet.isConnected}
          fallback={
            <div class={styles.walletEmpty}>
              <div class={styles.emptyIcon}>
                <div class={styles.lightningIconLarge}></div>
              </div>
              <div class={styles.emptyTitle}>
                Self-Custodial Lightning Wallet
              </div>
              <div class={styles.emptyDescription}>
                Breez Spark is a self-custodial Lightning wallet that runs directly in your browser.
                Your funds are secured by a seed phrase that only you control.
              </div>
              <div class={styles.emptyActions}>
                <ButtonPrimary onClick={() => setOpenConnectDialog(true)}>
                  Connect Wallet
                </ButtonPrimary>
              </div>
            </div>
          }
        >
          <div class={styles.walletConnected}>
            {/* Balance Section */}
            <div class={styles.balanceCard}>
              <div class={styles.balanceHeader}>
                <div class={styles.balanceLabel}>Total Balance</div>
                <Show when={account?.activeWalletType === 'breez'}>
                  <div class={styles.activeBadge}>
                    <div class={styles.checkCircleIcon}></div>
                    <span>Active Wallet</span>
                  </div>
                </Show>
              </div>
              <div class={styles.balanceAmount}>
                {account?.breezWallet.balance?.toLocaleString() || 0}
                <span class={styles.balanceUnit}>sats</span>
              </div>
              <div class={styles.balanceActions}>
                <ButtonPrimary onClick={handleRefreshBalance} disabled={isLoading()}>
                  {isLoading() ? 'Refreshing...' : 'Refresh Balance'}
                </ButtonPrimary>
                <Show when={account?.activeWalletType !== 'breez'}>
                  <ButtonSecondary onClick={handleSetAsActive}>
                    Set as Active
                  </ButtonSecondary>
                </Show>
              </div>
            </div>

            {/* Quick Actions */}
            <div class={styles.quickActions}>
              <div class={styles.sectionTitle}>Quick Actions</div>
              <div class={styles.actionGrid}>
                <button class={styles.actionButton} disabled>
                  <div class={styles.actionIcon}>
                    <div class={styles.receiveIcon}></div>
                  </div>
                  <span>Receive</span>
                </button>
                <button class={styles.actionButton} disabled>
                  <div class={styles.actionIcon}>
                    <div class={styles.sendIcon}></div>
                  </div>
                  <span>Send</span>
                </button>
              </div>
              <div class={styles.actionNote}>
                Coming soon: Send and receive payments directly from the wallet page
              </div>
            </div>

            {/* Transaction History */}
            <div class={styles.transactions}>
              <div class={styles.sectionTitle}>Transaction History</div>
              <div class={styles.transactionsList}>
                <div class={styles.emptyTransactions}>
                  <div class={styles.emptyTransactionsIcon}></div>
                  <div class={styles.emptyTransactionsText}>
                    No transactions yet. Transaction history will appear here.
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Settings */}
            <div class={styles.walletSettings}>
              <div class={styles.sectionTitle}>Wallet Settings</div>
              <div class={styles.settingsList}>
                <button class={styles.settingItem} onClick={handleDisconnect}>
                  <div class={styles.settingInfo}>
                    <div class={styles.settingLabel}>Disconnect Wallet</div>
                    <div class={styles.settingDesc}>Disconnect from Breez SDK</div>
                  </div>
                  <div class={styles.settingArrow}></div>
                </button>
                <button class={styles.settingItem} onClick={handleRemoveWallet}>
                  <div class={styles.settingInfo}>
                    <div class={`${styles.settingLabel} ${styles.settingLabelDanger}`}>
                      Remove Wallet
                    </div>
                    <div class={styles.settingDesc}>
                      Permanently remove wallet (backup your seed first!)
                    </div>
                  </div>
                  <div class={styles.settingArrow}></div>
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Connect Dialog */}
      <AdvancedSearchDialog
        open={openConnectDialog()}
        setOpen={(open: boolean) => {
          setOpenConnectDialog(open);
          if (!open) {
            setMnemonic('');
            setShowMnemonic(false);
          }
        }}
        triggerClass="hidden"
        title={<div>Connect Breez Spark Wallet</div>}
      >
        <div class={styles.dialogContent}>
          <div class={styles.dialogDescription}>
            Enter your BIP39 mnemonic seed phrase (12-24 words). If you don't have one, you can generate it using a tool like Ian Coleman's BIP39 tool.
          </div>

          <TextField class={styles.mnemonicInput}>
            <TextField.TextArea
              value={mnemonic()}
              onInput={(e) => setMnemonic(e.currentTarget.value)}
              placeholder="Enter your 12-24 word mnemonic..."
              rows={3}
              disabled={isLoading()}
              type={showMnemonic() ? 'text' : 'password'}
              autoResize
              autofocus
            />
          </TextField>

          <div class={styles.checkboxContainer}>
            <input
              type="checkbox"
              id="showMnemonicDialog"
              checked={showMnemonic()}
              onChange={(e) => setShowMnemonic(e.currentTarget.checked)}
            />
            <label for="showMnemonicDialog">Show mnemonic</label>
          </div>

          <div class={styles.dialogWarning}>
            ⚠️ Never share your seed phrase with anyone. Your seed will be encrypted and stored securely using your Nostr key.
          </div>
        </div>

        <div class={styles.dialogActions}>
          <ButtonSecondary
            onClick={() => {
              setMnemonic('');
              setShowMnemonic(false);
              setOpenConnectDialog(false);
            }}
          >
            Cancel
          </ButtonSecondary>
          <ButtonPrimary
            onClick={handleConnect}
            disabled={isLoading() || !mnemonic().trim()}
          >
            {isLoading() ? 'Connecting...' : 'Connect Wallet'}
          </ButtonPrimary>
        </div>
      </AdvancedSearchDialog>
    </div>
  );
};

export default Wallet;
