import { Component, createEffect, createSignal, Show, For } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { useAccountContext } from '../contexts/AccountContext';
import { useSettingsContext } from '../contexts/SettingsContext';
import { useSparkWallet } from '../contexts/SparkWalletContext';
import { useToastContext } from '../components/Toaster/Toaster';
import ButtonPrimary from '../components/Buttons/ButtonPrimary';
import ButtonSecondary from '../components/Buttons/ButtonSecondary';
import { TextField } from '@kobalte/core/text-field';
import AdvancedSearchDialog from '../components/AdvancedSearch/AdvancedSearchDialog';
import SparkPaymentsList from '../components/SparkPaymentsList/SparkPaymentsList';
import CurrencyDropdown from '../components/CurrencyDropdown/CurrencyDropdown';
import Loader from '../components/Loader/Loader';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { useCurrencyConversion } from '../hooks/useCurrencyConversion';
import { formatFiatAmount } from '../lib/currency';

import styles from './Wallet.module.scss';

const WalletContent: Component = () => {
  const intl = useIntl();
  const account = useAccountContext();
  const settings = useSettingsContext();
  const toast = useToastContext();
  const sparkWallet = useSparkWallet();

  // Currency conversion
  const { fiatValue, isLoading: isLoadingConversion } = useCurrencyConversion(
    () => sparkWallet.store.balance,
    () => sparkWallet.store.displayCurrency
  );

  const [mnemonic, setMnemonic] = createSignal('');
  const [showMnemonic, setShowMnemonic] = createSignal(false);
  const [openCreateDialog, setOpenCreateDialog] = createSignal(false);
  const [openRestoreDialog, setOpenRestoreDialog] = createSignal(false);
  const [restoreMethod, setRestoreMethod] = createSignal<'backup' | 'manual' | 'file' | null>(null);
  const [activeTab, setActiveTab] = createSignal<'payments' | 'topup'>('payments');
  const [showSettings, setShowSettings] = createSignal(false);
  const [hasBackedUpSeed, setHasBackedUpSeed] = createSignal(false);
  const [isRestoring, setIsRestoring] = createSignal(false);

  // Send payment state
  const [paymentInput, setPaymentInput] = createSignal('');
  const [paymentAmount, setPaymentAmount] = createSignal('');
  const [isSendingPayment, setIsSendingPayment] = createSignal(false);
  const [isLightningAddress, setIsLightningAddress] = createSignal(false);

  // Calculate max sendable amount (99% of balance to account for fees)
  const maxSendableAmount = () => Math.floor(sparkWallet.store.balance * 0.99);

  // Top up state
  const [topUpAmount, setTopUpAmount] = createSignal(10000);
  const [selectedPreset, setSelectedPreset] = createSignal<number | null>(10000);
  const [generatedInvoice, setGeneratedInvoice] = createSignal('');
  const [isGeneratingInvoice, setIsGeneratingInvoice] = createSignal(false);
  const [isEditingAmount, setIsEditingAmount] = createSignal(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = createSignal('');

  const MAX_WALLET_BALANCE = 500000; // 500K sats total wallet limit
  const HOT_WALLET_WARNING = 100000; // Warn at 100K sats

  // Calculate maximum top-up amount based on current balance
  const maxTopUpAmount = () => Math.max(0, MAX_WALLET_BALANCE - sparkWallet.store.balance);

  // Currency conversion for top-up amount
  const { fiatValue: topUpFiatValue, isLoading: isLoadingTopUpConversion } = useCurrencyConversion(
    () => topUpAmount(),
    () => sparkWallet.store.displayCurrency
  );

  let fileInputRef: HTMLInputElement | undefined;

  // Load payment history when connected
  createEffect(() => {
    if (sparkWallet.store.isConnected) {
      sparkWallet.actions.loadPaymentHistory().catch(error => {
        console.error('Failed to load payment history:', error);
      });
    }
  });

  const handleCreateNewWallet = () => {
    const newMnemonic = generateMnemonic(wordlist, 128); // 128 bits = 12 words
    setMnemonic(newMnemonic);
    setHasBackedUpSeed(false);
    setShowMnemonic(true);
    setOpenCreateDialog(true);
  };

  const handleOpenRestore = () => {
    setMnemonic('');
    setShowMnemonic(false);
    setRestoreMethod(null);
    setOpenRestoreDialog(true);
  };

  const handleCreateWallet = async () => {
    const seed = mnemonic().trim();

    if (!seed) {
      toast?.sendWarning('Please enter a mnemonic');
      return;
    }

    if (!account?.publicKey) {
      toast?.sendWarning('Please log in first');
      return;
    }

    // Require backup confirmation for new wallets
    if (!hasBackedUpSeed()) {
      toast?.sendWarning('Please confirm you have backed up your seed phrase');
      return;
    }

    try {
      await sparkWallet.actions.connect(seed, true); // Enable backup
      setMnemonic('');
      setHasBackedUpSeed(false);
      setOpenCreateDialog(false);
      toast?.sendSuccess('Spark wallet created successfully');
    } catch (error: any) {
      console.error('Create wallet failed:', error);
      toast?.sendWarning(`Failed to create wallet: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleFileUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let mnemonic = '';

      // Format 1: Plain mnemonic (legacy format)
      if (data.mnemonic) {
        mnemonic = data.mnemonic;
      }
      // Format 2: Encrypted mnemonic from Jumble/Sparkihonne
      else if (data.encryptedMnemonic && data.type === 'spark-wallet-backup') {
        if (!account?.publicKey) {
          toast?.sendWarning('Please log in to decrypt wallet file');
          input.value = '';
          return;
        }

        try {
          // Import NIP-04 decrypt function (version 1 uses NIP-04)
          const { decrypt } = await import('../lib/nostrAPI');

          // The pubkey in the file should match the logged-in user
          if (data.pubkey && data.pubkey !== account.publicKey) {
            toast?.sendWarning('This wallet file belongs to a different Nostr account. Please log in with the correct account.');
            input.value = '';
            return;
          }

          // Decrypt the mnemonic using NIP-04 (version 1 format)
          // The encryptedMnemonic is encrypted with the user's own pubkey
          const decrypted = await decrypt(account.publicKey, data.encryptedMnemonic);
          mnemonic = decrypted;

          toast?.sendInfo('Encrypted wallet file loaded and decrypted successfully');
        } catch (decryptError) {
          console.error('Failed to decrypt wallet file:', decryptError);
          toast?.sendWarning('Failed to decrypt wallet file. Make sure you are logged in with the correct Nostr account.');
          input.value = '';
          return;
        }
      }
      // Invalid format
      else {
        toast?.sendWarning('Invalid wallet file format. Expected plain mnemonic or encrypted Spark wallet backup.');
        input.value = '';
        return;
      }

      // Set the mnemonic
      if (mnemonic) {
        setMnemonic(mnemonic);
        if (!data.encryptedMnemonic) {
          toast?.sendInfo('Wallet file loaded successfully');
        }
      } else {
        toast?.sendWarning('No mnemonic found in wallet file');
      }
    } catch (error) {
      console.error('File upload failed:', error);
      toast?.sendWarning('Failed to read wallet file. Make sure it is a valid JSON file.');
    }

    // Reset file input
    input.value = '';
  };

  const handleRestoreFromManual = async () => {
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
      // Connect and restore the wallet
      await sparkWallet.actions.connect(seed, true); // Enable backup

      // Force a balance refresh to ensure UI updates
      await sparkWallet.actions.refreshBalance();

      // Load payment history
      await sparkWallet.actions.loadPaymentHistory();

      setMnemonic('');
      setRestoreMethod(null);
      setOpenRestoreDialog(false);
      toast?.sendSuccess('Wallet restored successfully');
    } catch (error: any) {
      console.error('Manual restore failed:', error);
      toast?.sendWarning(`Failed to restore: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await sparkWallet.actions.disconnect();
      toast?.sendSuccess('Spark wallet disconnected');
    } catch (error: any) {
      console.error('Disconnect failed:', error);
      toast?.sendWarning(`Failed to disconnect: ${error?.message}`);
    }
  };

  // Check if input is Lightning address (user@domain.com format)
  const checkIsLightningAddress = (input: string): boolean => {
    return input.includes('@') && input.includes('.');
  };

  // Handle payment input change
  const handlePaymentInputChange = (value: string) => {
    setPaymentInput(value);
    setIsLightningAddress(checkIsLightningAddress(value.trim()));
  };

  // Send Payment Handler
  const handleSendPayment = async () => {
    const input = paymentInput().trim();
    if (!input) {
      toast?.sendWarning('Please enter a Lightning invoice or address');
      return;
    }

    // If it's a Lightning address, we need an amount
    if (isLightningAddress()) {
      const amount = parseInt(paymentAmount());

      if (!amount || amount < 1) {
        toast?.sendWarning('Please enter an amount for this Lightning address');
        return;
      }

      // Check if amount exceeds balance
      if (amount > sparkWallet.store.balance) {
        toast?.sendWarning(`Amount exceeds wallet balance of ${sparkWallet.store.balance.toLocaleString()} sats`);
        return;
      }

      // Warn if sending close to max (may fail due to fees)
      if (amount > maxSendableAmount()) {
        toast?.sendWarning('Amount too high. Lightning payments require ~1% fee buffer. Try sending less.');
        return;
      }
    }

    setIsSendingPayment(true);
    try {
      // Import breez wallet service
      const { breezWallet } = await import('../lib/breezWalletService');

      // Parse the input to determine what type it is
      const parsed = await breezWallet.parseInput(input);

      if (parsed.type === 'lightningAddress' || parsed.type === 'lnurlPay') {
        // Handle Lightning address or LNURL pay
        const amountSats = parseInt(paymentAmount());
        if (!amountSats || amountSats < 1) {
          toast?.sendWarning('Please enter a valid amount');
          return;
        }

        // Get the pay request details from parsed input
        const payRequest = parsed.type === 'lightningAddress'
          ? {
              callback: parsed.callback,
              minSendable: parsed.minSendable,
              maxSendable: parsed.maxSendable,
              metadataStr: parsed.metadataStr,
              commentAllowed: parsed.commentAllowed || 0,
              domain: parsed.domain,
              allowsNostr: parsed.allowsNostr || false,
              nostrPubkey: parsed.nostrPubkey,
              lnurlpTag: parsed.tag,
            }
          : parsed;

        // Prepare the LNURL pay
        const prepareResponse = await breezWallet.prepareLnurlPay(amountSats, payRequest);

        // Execute the LNURL pay
        await breezWallet.lnurlPay(prepareResponse);

        toast?.sendSuccess('Payment sent successfully!');
      } else if (parsed.type === 'bolt11Invoice' || parsed.type === 'sparkInvoice') {
        // Handle regular invoice
        await sparkWallet.actions.sendPayment(input);
        toast?.sendSuccess('Payment sent successfully!');
      } else {
        toast?.sendWarning('Unsupported payment type. Please use a Lightning invoice or address.');
        return;
      }

      setPaymentInput('');
      setPaymentAmount('');
      setIsLightningAddress(false);

      // Refresh payment history
      await sparkWallet.actions.loadPaymentHistory();
    } catch (error: any) {
      console.error('Payment failed:', error);
      toast?.sendWarning(`Payment failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSendingPayment(false);
    }
  };

  // Top Up Handlers
  const topUpPresets = [
    { amount: 10000, label: '10k' },
    { amount: 25000, label: '25k' },
    { amount: 50000, label: '50k' },
    { amount: 100000, label: '100k' },
    { amount: 250000, label: '250k' },
    { amount: 500000, label: '500k' },
  ];

  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount);
    setTopUpAmount(amount);
  };

  const handleTopUpInputChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setTopUpAmount(numValue);
    // Select preset if it matches, otherwise clear
    const matchingPreset = topUpPresets.find(p => p.amount === numValue);
    setSelectedPreset(matchingPreset ? numValue : null);
  };

  const generateQRCode = async (invoice: string) => {
    try {
      // Dynamically import qr-code-styling
      const QRCodeStyling = (await import('qr-code-styling')).default;

      const qrCode = new QRCodeStyling({
        width: 300,
        height: 300,
        data: invoice.toUpperCase(),
        margin: 10,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: 'M',
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.4,
          margin: 5,
        },
        dotsOptions: {
          color: '#000000',
          type: 'rounded',
        },
        backgroundOptions: {
          color: '#ffffff',
        },
        cornersSquareOptions: {
          color: '#000000',
          type: 'extra-rounded',
        },
        cornersDotOptions: {
          color: '#000000',
          type: 'dot',
        },
      });

      // Get canvas and convert to data URL
      const blob = await qrCode.getRawData('png');
      if (blob) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setQrCodeDataUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const handleGenerateInvoice = async () => {
    const amount = topUpAmount();

    if (amount < 1000) {
      toast?.sendWarning('Minimum top up amount is 1,000 sats');
      return;
    }

    const maxAllowed = maxTopUpAmount();
    if (amount > maxAllowed) {
      toast?.sendWarning(`Maximum top up amount is ${maxAllowed.toLocaleString()} sats (current balance: ${sparkWallet.store.balance.toLocaleString()} / 500K limit)`);
      return;
    }

    setIsGeneratingInvoice(true);
    try {
      const invoice = await sparkWallet.actions.createInvoice(amount, 'Top up Spark Wallet');
      setGeneratedInvoice(invoice);

      // Generate QR code for the invoice
      await generateQRCode(invoice);

      toast?.sendSuccess('Invoice generated! Pay to top up your wallet.');
    } catch (error: any) {
      console.error('Failed to generate invoice:', error);
      toast?.sendWarning(`Failed to generate invoice: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleCopyInvoice = () => {
    navigator.clipboard.writeText(generatedInvoice());
    toast?.sendSuccess('Invoice copied to clipboard');
  };

  const handleRemoveWallet = async () => {
    if (!account?.publicKey) return;

    if (confirm('Are you sure you want to remove your Spark wallet? Make sure you have backed up your seed phrase!')) {
      try {
        await sparkWallet.actions.disconnect();

        // Clear storage
        const { clearAllSparkData } = await import('../lib/spark/sparkStorage');
        clearAllSparkData(account.publicKey);

        toast?.sendSuccess('Spark wallet removed');
      } catch (error: any) {
        toast?.sendWarning(`Failed to remove wallet: ${error?.message}`);
      }
    }
  };

  const handleSetAsActive = () => {
    account?.actions.setActiveWalletType('breez');
    toast?.sendSuccess('Spark wallet set as active payment method');
  };

  const handleRefreshBalance = async () => {
    try {
      await sparkWallet.actions.refreshBalance();
      toast?.sendSuccess('Balance updated');
    } catch (error: any) {
      toast?.sendWarning(`Failed to update balance: ${error?.message}`);
    }
  };

  const handleSyncBackup = async () => {
    try {
      await sparkWallet.actions.syncBackupToRelays();
      toast?.sendSuccess('Backup synced to relays');
    } catch (error: any) {
      toast?.sendWarning(`Failed to sync backup: ${error?.message}`);
    }
  };

  const handleRestoreFromBackup = async () => {
    if (!account?.publicKey) {
      toast?.sendWarning('Please log in first');
      return;
    }

    try {
      setIsRestoring(true);
      const success = await sparkWallet.actions.syncBackupFromRelays(false);
      if (success) {
        toast?.sendSuccess('Backup restored from relays');
        // Reconnect with restored seed
        const { loadEncryptedSeed } = await import('../lib/spark/sparkStorage');
        const seed = await loadEncryptedSeed(account.publicKey);
        if (seed) {
          await sparkWallet.actions.connect(seed, false);
          setRestoreMethod(null);
          setOpenRestoreDialog(false);
        }
      } else {
        toast?.sendWarning('No backup found on relays. Please try manual restore instead.');
      }
    } catch (error: any) {
      console.error('Backup restore failed:', error);
      toast?.sendWarning(`Failed to restore backup: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsRestoring(false);
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
          when={sparkWallet.store.isConnected}
          fallback={
            <Show
              when={sparkWallet.store.isConfigured}
              fallback={
                <div class={styles.walletEmpty}>
                  <div class={styles.emptyIcon}>
                    <div class={styles.lightningIconLarge}></div>
                  </div>
                  <div class={styles.emptyLogos}>
                    <img
                      src="https://breez.technology/logo-breez-header.svg"
                      alt="Breez"
                      class={styles.breezLogo}
                      classList={{ [styles.lightModeLogo]: settings?.theme === 'sunrise' }}
                    />
                    <img
                      src="https://breez.technology/spark.svg"
                      alt="Spark"
                      class={styles.sparkLogo}
                      classList={{ [styles.lightModeLogo]: settings?.theme === 'sunrise' }}
                    />
                  </div>
                  <div class={styles.emptyTitle}>
                    Self-Custodial Lightning Wallet
                  </div>
                  <div class={styles.emptyDescription}>
                    Breez Spark is a self-custodial Lightning wallet that runs directly in your browser.
                    Your funds are secured by a seed phrase that only you control.
                  </div>
                  <div class={styles.emptyActions}>
                    <ButtonPrimary onClick={handleCreateNewWallet}>
                      Create New Wallet
                    </ButtonPrimary>
                    <ButtonSecondary onClick={handleOpenRestore}>
                      Restore Wallet
                    </ButtonSecondary>
                  </div>
                </div>
              }
            >
              <div class={styles.walletEmpty}>
                <div class={styles.emptyIcon}>
                  <Loader />
                </div>
                <div class={styles.emptyTitle}>
                  Connecting to wallet...
                </div>
                <div class={styles.emptyDescription}>
                  Please wait while we connect to your Breez Spark wallet.
                </div>
              </div>
            </Show>
          }
        >
          <div class={styles.walletConnected}>
            {/* Balance Section */}
            <div class={styles.balanceCard}>
              <div class={styles.balanceHeader}>
                <div class={styles.balanceLabel}>Balance</div>
                <div class={styles.balanceControls}>
                  <CurrencyDropdown
                    value={sparkWallet.store.displayCurrency}
                    onChange={(currency) => sparkWallet.actions.setDisplayCurrency(currency)}
                  />
                  <button
                    class={styles.syncButton}
                    onClick={handleRefreshBalance}
                    type="button"
                  >
                    Sync
                  </button>
                </div>
              </div>
              <div class={styles.balanceDisplay}>
                <div class={styles.balanceAmount}>
                  <Show
                    when={!sparkWallet.store.isBalanceHidden}
                    fallback={<span>••••••</span>}
                  >
                    <Show
                      when={sparkWallet.store.displayCurrency === 'SATS'}
                      fallback={
                        <Show
                          when={!isLoadingConversion() && fiatValue() !== null}
                          fallback={<span>Loading...</span>}
                        >
                          <span>
                            {formatFiatAmount(fiatValue()!, sparkWallet.store.displayCurrency)}
                            <span class={styles.balanceUnit}>
                              {sparkWallet.store.balance.toLocaleString()} sats
                            </span>
                          </span>
                        </Show>
                      }
                    >
                      {sparkWallet.store.balance.toLocaleString()}
                      <span class={styles.balanceUnit}>sats</span>
                    </Show>
                  </Show>
                </div>
                <button
                  class={styles.balanceToggle}
                  onClick={() => sparkWallet.actions.toggleBalanceVisibility()}
                  type="button"
                  title={sparkWallet.store.isBalanceHidden ? "Show balance" : "Hide balance"}
                >
                  <Show
                    when={sparkWallet.store.isBalanceHidden}
                    fallback={
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    }
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </Show>
                </button>
              </div>
              <Show when={account?.activeWalletType !== 'breez'}>
                <div class={styles.balanceActions}>
                  <ButtonSecondary onClick={handleSetAsActive}>
                    Set as Active
                  </ButtonSecondary>
                </div>
              </Show>
            </div>

            {/* Tabs */}
            <div class={styles.tabs}>
              <button
                class={`${styles.tab} ${activeTab() === 'payments' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('payments')}
              >
                Payments
              </button>
              <button
                class={`${styles.tab} ${activeTab() === 'topup' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('topup')}
              >
                Top Up
              </button>
            </div>

            {/* Tab Content */}
            <Show when={activeTab() === 'payments'}>
              <div class={styles.tabContent}>
                {/* Send Payment Section */}
                <div class={styles.sendPaymentSection}>
                  <div class={styles.sectionTitle}>Send Payment</div>
                  <div class={styles.sendPaymentForm}>
                    <TextField class={styles.invoiceInput}>
                      <TextField.Input
                        placeholder="Paste invoice or Lightning address"
                        value={paymentInput()}
                        onInput={(e) => {
                          const value = e.currentTarget.value;
                          setPaymentInput(value);
                          setIsLightningAddress(checkIsLightningAddress(value.trim()));
                        }}
                        disabled={isSendingPayment()}
                      />
                    </TextField>

                    {/* Amount Input for Lightning Addresses */}
                    <Show when={isLightningAddress()}>
                      <div class={styles.amountInputRow}>
                        <TextField class={styles.paymentAmountInput}>
                          <TextField.Input
                            type="number"
                            placeholder="Amount in sats"
                            value={paymentAmount()}
                            onInput={(e) => setPaymentAmount(e.currentTarget.value)}
                            min={1}
                            max={maxSendableAmount()}
                            step={1}
                            disabled={isSendingPayment()}
                          />
                        </TextField>
                        <span class={styles.amountUnit}>sats</span>
                      </div>
                      <div class={styles.lightningAddressNote}>
                        Max: {maxSendableAmount().toLocaleString()} sats (includes ~1% fee buffer)
                      </div>
                    </Show>

                    <ButtonPrimary
                      onClick={handleSendPayment}
                      disabled={isSendingPayment() || !paymentInput() || (isLightningAddress() && !paymentAmount())}
                    >
                      {isSendingPayment() ? <Loader /> : 'Send Payment'}
                    </ButtonPrimary>
                  </div>
                </div>

                {/* Payment History */}
                <div class={styles.transactions}>
                  <div class={styles.sectionHeader}>
                    <div class={styles.sectionTitle}>Recent Payments</div>
                    <button class={styles.refreshButton} onClick={() => sparkWallet.actions.loadPaymentHistory()}>
                      Refresh
                    </button>
                  </div>
                  <SparkPaymentsList
                    payments={sparkWallet.store.payments}
                    loading={sparkWallet.store.paymentsLoading}
                    isBalanceHidden={sparkWallet.store.isBalanceHidden}
                  />
                </div>

                {/* Wallet Settings - Collapsible Section */}
                <div class={styles.walletSettingsCollapsible}>
                  <button
                    class={styles.settingsToggle}
                    onClick={() => setShowSettings(!showSettings())}
                  >
                    <div class={styles.settingsToggleIcon}></div>
                    <div class={styles.settingsToggleLabel}>Wallet Settings</div>
                    <div class={`${styles.settingsChevron} ${showSettings() ? styles.settingsChevronOpen : ''}`}>
                      ▼
                    </div>
                  </button>

                  <Show when={showSettings()}>
                    <div class={styles.settingsContent}>
                {/* Backup Section */}
                <div class={styles.backupSection}>
                  <div class={styles.sectionTitle}>Backup & Recovery</div>
                  <div class={styles.backupInfo}>
                    <Show
                      when={sparkWallet.store.hasBackup}
                      fallback={
                        <p class={styles.backupStatus}>
                          ⚠️ No backup found on relays. Create a backup to enable multi-device sync.
                        </p>
                      }
                    >
                      <p class={styles.backupStatus}>
                        ✅ Wallet backed up to Nostr relays
                        <Show when={sparkWallet.store.lastBackupSync}>
                          <span class={styles.backupTime}>
                            {' '}(Last sync: {new Date(sparkWallet.store.lastBackupSync!).toLocaleString()})
                          </span>
                        </Show>
                      </p>
                    </Show>
                    <div class={styles.backupActions}>
                      <ButtonSecondary onClick={handleSyncBackup}>
                        Sync Backup to Relays
                      </ButtonSecondary>
                      <ButtonSecondary onClick={handleRestoreFromBackup}>
                        Restore from Relays
                      </ButtonSecondary>
                    </div>
                  </div>
                </div>

                {/* Wallet Settings */}
                <div class={styles.walletSettings}>
                  <div class={styles.sectionTitle}>Wallet Management</div>
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
              </div>
            </Show>

            <Show when={activeTab() === 'topup'}>
              <div class={styles.tabContent}>
                <div class={styles.topUpSection}>
                  <div class={styles.sectionTitle}>Top Up Wallet</div>

                  {/* Edit Mode Toggle */}
                  <Show when={!generatedInvoice()}>
                    <div class={styles.editModeToggle}>
                      <button
                        class={styles.editButton}
                        onClick={() => setIsEditingAmount(!isEditingAmount())}
                      >
                        {isEditingAmount() ? 'Show Presets' : 'Enter Custom Amount'}
                      </button>
                    </div>
                  </Show>

                  {/* Preset Amounts */}
                  <Show when={!isEditingAmount() && !generatedInvoice()}>
                    <div class={styles.presetAmounts}>
                      <For each={topUpPresets}>
                        {(preset) => (
                          <button
                            class={`${styles.presetButton} ${selectedPreset() === preset.amount ? styles.presetButtonActive : ''}`}
                            onClick={() => handlePresetClick(preset.amount)}
                          >
                            <div class={styles.presetAmount}>{preset.label} sats</div>
                            <Show when={sparkWallet.store.displayCurrency !== 'SATS' && !isLoadingTopUpConversion()}>
                              <div class={styles.presetFiat}>
                                {formatFiatAmount(
                                  (preset.amount / topUpAmount()) * (topUpFiatValue() || 0),
                                  sparkWallet.store.displayCurrency
                                )}
                              </div>
                            </Show>
                          </button>
                        )}
                      </For>
                    </div>

                    {/* Hot Wallet Warning */}
                    <Show when={sparkWallet.store.balance >= HOT_WALLET_WARNING}>
                      <div class={styles.hotWalletWarning}>
                        Hot wallets should not contain large balances.<br />Consider keeping less than 100k sats for daily use.
                      </div>
                    </Show>
                  </Show>

                  {/* Custom Amount */}
                  <Show when={isEditingAmount() && !generatedInvoice()}>
                    <div class={styles.customAmount}>
                      <TextField class={styles.amountInput}>
                        <TextField.Input
                          type="number"
                          placeholder="Custom amount"
                          value={topUpAmount().toString()}
                          onInput={(e) => handleTopUpInputChange(e.currentTarget.value)}
                          min={1000}
                          step={1000}
                        />
                      </TextField>
                      <span class={styles.amountUnit}>sats</span>
                    </div>

                    {/* Currency Conversion Display */}
                    <Show when={sparkWallet.store.displayCurrency !== 'SATS' && !isLoadingTopUpConversion() && topUpFiatValue()}>
                      <div class={styles.conversionDisplay}>
                        ≈ {formatFiatAmount(topUpFiatValue()!, sparkWallet.store.displayCurrency)}
                      </div>
                    </Show>

                    {/* Hot Wallet Warning */}
                    <Show when={sparkWallet.store.balance >= HOT_WALLET_WARNING}>
                      <div class={styles.hotWalletWarning}>
                        Hot wallets should not contain large balances.<br />Consider keeping less than 100k sats for daily use.
                      </div>
                    </Show>
                  </Show>

                  <Show when={topUpAmount() < 1000 || topUpAmount() > maxTopUpAmount()}>
                    <div class={styles.topUpInfo}>
                      <Show when={topUpAmount() < 1000}>
                        <p class={styles.warningText}>Minimum top up: 1,000 sats</p>
                      </Show>
                      <Show when={topUpAmount() > maxTopUpAmount()}>
                        <p class={styles.warningText}>
                          Maximum: {maxTopUpAmount().toLocaleString()} sats (balance {sparkWallet.store.balance.toLocaleString()} / 500K limit)
                        </p>
                      </Show>
                    </div>
                  </Show>

                  {/* Generate Invoice Button */}
                  <Show
                    when={!generatedInvoice()}
                    fallback={
                      <div class={styles.invoiceDisplay}>
                        {/* QR Code */}
                        <Show when={qrCodeDataUrl()}>
                          <div class={styles.qrCodeContainer}>
                            <img src={qrCodeDataUrl()} alt="Invoice QR Code" class={styles.qrCodeImage} />
                          </div>
                        </Show>

                        <div class={styles.invoiceLabel}>
                          Lightning Invoice ({topUpAmount().toLocaleString()} sats)
                        </div>

                        {/* Currency Conversion */}
                        <Show when={sparkWallet.store.displayCurrency !== 'SATS' && !isLoadingTopUpConversion() && topUpFiatValue()}>
                          <div class={styles.invoiceFiatAmount}>
                            ≈ {formatFiatAmount(topUpFiatValue()!, sparkWallet.store.displayCurrency)}
                          </div>
                        </Show>

                        <div class={styles.invoiceText}>{generatedInvoice()}</div>
                        <div class={styles.invoiceActions}>
                          <ButtonPrimary onClick={handleCopyInvoice}>
                            Copy Invoice
                          </ButtonPrimary>
                          <ButtonSecondary onClick={() => {
                            setGeneratedInvoice('');
                            setQrCodeDataUrl('');
                            setIsEditingAmount(false);
                          }}>
                            Generate New
                          </ButtonSecondary>
                        </div>
                      </div>
                    }
                  >
                    <ButtonPrimary
                      onClick={handleGenerateInvoice}
                      disabled={isGeneratingInvoice() || topUpAmount() < 1000 || topUpAmount() > maxTopUpAmount()}
                    >
                      {isGeneratingInvoice() ? <Loader /> : `Generate Invoice for ${topUpAmount().toLocaleString()} sats`}
                    </ButtonPrimary>
                  </Show>
                </div>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      {/* Create Wallet Dialog */}
      <AdvancedSearchDialog
        open={openCreateDialog()}
        setOpen={(open: boolean) => {
          setOpenCreateDialog(open);
          if (!open) {
            setMnemonic('');
            setShowMnemonic(false);
            setHasBackedUpSeed(false);
          }
        }}
        triggerClass="hidden"
        title={<div>Create New Wallet</div>}
      >
        <div class={styles.dialogContent}>
          <div class={styles.dialogDescription}>
            Write down these 12 words and store them safely. This is the only way to recover your wallet.
          </div>

          <div class={styles.seedPhraseDisplay}>
            {mnemonic()}
          </div>

          <div class={styles.checkboxContainer}>
            <input
              type="checkbox"
              id="confirmBackupCreate"
              checked={hasBackedUpSeed()}
              onChange={(e) => setHasBackedUpSeed(e.currentTarget.checked)}
            />
            <label for="confirmBackupCreate">I have written down my seed phrase in a safe place</label>
          </div>

          <div class={styles.dialogInfo}>
            Never share your seed phrase with anyone. Your seed will be encrypted and stored securely using your Nostr key.
          </div>
        </div>

        <div class={styles.dialogActions}>
          <ButtonSecondary
            onClick={() => {
              setMnemonic('');
              setShowMnemonic(false);
              setHasBackedUpSeed(false);
              setOpenCreateDialog(false);
            }}
          >
            Cancel
          </ButtonSecondary>
          <ButtonPrimary
            onClick={handleCreateWallet}
            disabled={sparkWallet.store.isConnecting || !mnemonic().trim() || !hasBackedUpSeed()}
          >
            {sparkWallet.store.isConnecting ? 'Creating...' : 'Create Wallet'}
          </ButtonPrimary>
        </div>
      </AdvancedSearchDialog>

      {/* Restore Wallet Dialog */}
      <AdvancedSearchDialog
        open={openRestoreDialog()}
        setOpen={(open: boolean) => {
          setOpenRestoreDialog(open);
          if (!open) {
            setMnemonic('');
            setShowMnemonic(false);
            setRestoreMethod(null);
            setIsRestoring(false);
          }
        }}
        triggerClass="hidden"
        title={<div>Restore Wallet</div>}
      >
        <div class={styles.dialogContent}>
          <Show when={!restoreMethod()}>
            <div class={styles.dialogDescription}>
              Choose how you want to restore your wallet.
            </div>
            <div class={styles.restoreOptions}>
              <div class={styles.restoreOption}>
                <ButtonPrimary onClick={() => setRestoreMethod('backup')}>
                  Relay Backup
                </ButtonPrimary>
                <div class={styles.restoreOptionDescription}>
                  Fetch your encrypted wallet from Nostr relays
                </div>
              </div>
              <div class={styles.restoreOption}>
                <ButtonPrimary onClick={() => setRestoreMethod('manual')}>
                  Seed Phrase
                </ButtonPrimary>
                <div class={styles.restoreOptionDescription}>
                  Enter your 12-24 word recovery phrase
                </div>
              </div>
              <div class={styles.restoreOption}>
                <ButtonPrimary onClick={() => setRestoreMethod('file')}>
                  Wallet File
                </ButtonPrimary>
                <div class={styles.restoreOptionDescription}>
                  Import JSON file from jumble-spark or sparkihonne
                </div>
              </div>
            </div>
          </Show>

          <Show when={restoreMethod() === 'backup'}>
            <div class={styles.dialogDescription}>
              <span>Restore your wallet from the encrypted backup stored on Nostr relays.</span>
            </div>
            <div class={styles.dialogInfo}>
              This will fetch your encrypted wallet backup from Nostr relays and restore it.
              <br /><br />
              You must be logged in with the same Nostr account that created the backup.
            </div>
          </Show>

          <Show when={restoreMethod() === 'file'}>
            <div class={styles.dialogDescription}>
              <span>Upload a wallet file exported from jumble-spark or sparkihonne.</span>
            </div>

            <div class={styles.fileUploadSection}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                class={styles.hiddenFileInput}
                onChange={handleFileUpload}
              />
              <ButtonPrimary onClick={() => fileInputRef?.click()}>
                Choose Wallet File (.json)
              </ButtonPrimary>
            </div>

            <Show when={mnemonic()}>
              <div class={styles.dialogSuccess}>
                Wallet file loaded successfully! Click "Restore Wallet" below to continue.
              </div>
            </Show>

            <div class={styles.dialogInfo}>
              Your wallet file will be encrypted and stored securely using your Nostr key.
            </div>
          </Show>

          <Show when={restoreMethod() === 'manual'}>
            <div class={styles.dialogDescription}>
              <span>Enter your 12-24 word seed phrase to restore your wallet.</span>
            </div>

            <TextField class={styles.mnemonicInput}>
              <TextField.TextArea
                value={mnemonic()}
                onInput={(e) => setMnemonic(e.currentTarget.value)}
                placeholder="Enter your 12-24 word mnemonic..."
                rows={3}
                disabled={sparkWallet.store.isConnecting}
                autoResize
                autofocus
              />
            </TextField>

            <div class={styles.checkboxContainer}>
              <input
                type="checkbox"
                id="showMnemonicRestore"
                checked={showMnemonic()}
                onChange={(e) => setShowMnemonic(e.currentTarget.checked)}
              />
              <label for="showMnemonicRestore">Show seed phrase</label>
            </div>

            <div class={styles.dialogInfo}>
              Never share your seed phrase with anyone. Your seed will be encrypted and stored securely using your Nostr key.
            </div>
          </Show>
        </div>

        <div class={styles.dialogActions}>
          <ButtonSecondary
            onClick={() => {
              if (restoreMethod()) {
                setRestoreMethod(null);
                setMnemonic('');
                setShowMnemonic(false);
              } else {
                setOpenRestoreDialog(false);
              }
            }}
          >
            {restoreMethod() ? 'Back' : 'Cancel'}
          </ButtonSecondary>
          <Show when={restoreMethod() === 'backup'}>
            <ButtonPrimary
              onClick={handleRestoreFromBackup}
              disabled={isRestoring()}
            >
              {isRestoring() ? 'Restoring...' : 'Restore from Backup'}
            </ButtonPrimary>
          </Show>
          <Show when={restoreMethod() === 'file'}>
            <ButtonPrimary
              onClick={handleRestoreFromManual}
              disabled={sparkWallet.store.isConnecting || !mnemonic().trim()}
            >
              {sparkWallet.store.isConnecting ? 'Restoring...' : 'Restore Wallet'}
            </ButtonPrimary>
          </Show>
          <Show when={restoreMethod() === 'manual'}>
            <ButtonPrimary
              onClick={handleRestoreFromManual}
              disabled={sparkWallet.store.isConnecting || !mnemonic().trim()}
            >
              {sparkWallet.store.isConnecting ? 'Restoring...' : 'Restore Wallet'}
            </ButtonPrimary>
          </Show>
        </div>
      </AdvancedSearchDialog>
    </div>
  );
};

const Wallet: Component = () => {
  return <WalletContent />;
};

export default Wallet;
