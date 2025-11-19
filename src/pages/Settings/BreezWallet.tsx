import { Component, createEffect, createSignal, Show } from 'solid-js';
import styles from './Settings.module.scss';
import { useIntl } from '@cookbook/solid-intl';
import { settings as t } from '../../translations';
import PageCaption from '../../components/PageCaption/PageCaption';
import PageTitle from '../../components/PageTitle/PageTitle';
import ButtonSecondary from '../../components/Buttons/ButtonSecondary';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import { useAccountContext } from '../../contexts/AccountContext';
import { isBreezWalletConfigured, loadEncryptedSeed, clearAllBreezData } from '../../lib/breezStore';
import { TextField } from '@kobalte/core/text-field';
import { useToastContext } from '../../components/Toaster/Toaster';
import { A } from '@solidjs/router';
import NWCItem from '../../components/NWCItem/NWCItem';
import AdvancedSearchDialog from '../../components/AdvancedSearch/AdvancedSearchDialog';

import breezLogo from '../../assets/icons/logo.svg'; // Using Primal logo as placeholder

const BreezWallet: Component = () => {
  const intl = useIntl();
  const account = useAccountContext();
  const toast = useToastContext();

  const [mnemonic, setMnemonic] = createSignal('');
  const [isLoading, setIsLoading] = createSignal(false);
  const [showMnemonic, setShowMnemonic] = createSignal(false);
  const [openConnectDialog, setOpenConnectDialog] = createSignal(false);

  // Check if wallet is already configured and auto-connect
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

  const walletStatus = () => {
    if (account?.breezWallet.isConnected && account?.activeWalletType === 'breez') {
      return 'connected';
    }
    if (account?.breezWallet.isConnected) {
      return 'active';
    }
    return 'none';
  };

  const walletDescription = () => {
    if (account?.breezWallet.isConnected && account?.activeWalletType === 'breez') {
      return `Balance: ${account.breezWallet.balance?.toLocaleString() || 0} sats`;
    }
    if (account?.breezWallet.isConnected) {
      return `Balance: ${account.breezWallet.balance?.toLocaleString() || 0} sats - Not active`;
    }
    return 'Self-custodial Lightning wallet in your browser';
  };

  return (
    <div>
      <PageTitle title={`Breez Spark Wallet ${intl.formatMessage(t.title)}`} />

      <PageCaption>
        <A href='/settings'>{intl.formatMessage(t.index.title)}</A>:&nbsp;
        <div>Breez Spark Wallet</div>
      </PageCaption>

      <div class={styles.settingsContent}>
        <div class={styles.moderationDescription}>
          Breez Spark is a self-custodial Lightning wallet that runs directly in your browser. Your funds are secured by a seed phrase that only you control.
        </div>
      </div>

      <div class={styles.settingsContentFullBorderless}>
        <div class={styles.walletList}>
          <NWCItem
            logo={breezLogo}
            name="Breez Spark"
            desc={walletDescription()}
            status={walletStatus()}
            onConnect={() => {
              if (account?.breezWallet.isConnected) {
                handleSetAsActive();
              } else {
                setOpenConnectDialog(true);
              }
            }}
            onRemove={handleRemoveWallet}
            onDisconnect={handleDisconnect}
          />
        </div>
      </div>

      <Show when={account?.breezWallet.isConnected}>
        <div class={styles.settingsContent}>
          <div class={styles.secondCaption}>
            <ButtonSecondary onClick={handleRefreshBalance} disabled={isLoading()}>
              {isLoading() ? 'Refreshing...' : 'Refresh Balance'}
            </ButtonSecondary>
          </div>
        </div>
      </Show>

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
        title={
          <div>
            Connect Breez Spark Wallet
          </div>
        }
      >
        <div class={styles.nwcInputs}>
          <div class={styles.settingsDescription} style={{ "margin-bottom": "16px" }}>
            Enter your BIP39 mnemonic seed phrase (12-24 words). If you don't have one, you can generate it using a tool like Ian Coleman's BIP39 tool.
          </div>

          <TextField class={styles.nwcTextArea}>
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

          <div class={styles.checkboxContainer} style={{ "margin-top": "12px" }}>
            <input
              type="checkbox"
              id="showMnemonic"
              checked={showMnemonic()}
              onChange={(e) => setShowMnemonic(e.currentTarget.checked)}
            />
            <label for="showMnemonic">Show mnemonic</label>
          </div>

          <div class={styles.settingsDescription} style={{ "margin-top": "16px", "color": "var(--warning-color)" }}>
            ⚠️ Never share your seed phrase with anyone. Your seed will be encrypted and stored securely using your Nostr key.
          </div>
        </div>

        <div class={styles.nwcInputActions}>
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

export default BreezWallet;
