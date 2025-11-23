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
import LightningAddressCard from '../components/LightningAddressCard/LightningAddressCard';
import LightningFlash from '../components/LightningFlash/LightningFlash';
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
  const [backupToRelays, setBackupToRelays] = createSignal(false);
  const [showSettings, setShowSettings] = createSignal(false);
  const [hasBackedUpSeed, setHasBackedUpSeed] = createSignal(false);
  const [isRestoring, setIsRestoring] = createSignal(false);
  const [dialogMode, setDialogMode] = createSignal<'create' | 'reveal'>('create');

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
  const [showPaymentFlash, setShowPaymentFlash] = createSignal(false);
  const [lastProcessedPaymentInvoice, setLastProcessedPaymentInvoice] = createSignal<string>('');

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
    if (!account?.publicKey) {
      toast?.sendWarning('Please log in first to create a wallet');
      return;
    }

    const newMnemonic = generateMnemonic(wordlist, 128); // 128 bits = 12 words
    setMnemonic(newMnemonic);
    setHasBackedUpSeed(false);
    setShowMnemonic(true);
    setDialogMode('create');
    setOpenCreateDialog(true);
  };

  const handleOpenRestore = () => {
    if (!account?.publicKey) {
      toast?.sendWarning('Please log in first to restore a wallet');
      return;
    }

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
      await sparkWallet.actions.connect(seed, false);

      // If user opted to backup to relays, sync now
      if (backupToRelays()) {
        try {
          await handleSyncBackup();
        } catch (backupError) {
          console.error('Relay backup failed:', backupError);
          toast?.sendWarning('Wallet created but relay backup failed. You can backup later from settings.');
        }
      }

      setMnemonic('');
      setHasBackedUpSeed(false);
      setBackupToRelays(false);
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
      // Format 2: Encrypted mnemonic from Jumble/Sparkihonne/Primal (Versions 1 and 2)
      else if (data.encryptedMnemonic && data.type === 'spark-wallet-backup') {
        if (!account?.publicKey) {
          toast?.sendWarning('Please log in to decrypt wallet file');
          input.value = '';
          return;
        }

        try {
          // The pubkey in the file should match the logged-in user
          if (data.pubkey && data.pubkey !== account.publicKey) {
            toast?.sendWarning('This wallet file belongs to a different Nostr account. Please log in with the correct account.');
            input.value = '';
            return;
          }

          // Detect version and encryption method
          const version = data.version || 1;
          const encryption = data.encryption || 'nip04'; // Default to nip04 for v1

          console.log(`[WalletRestore] Detected backup version: ${version}, encryption: ${encryption}`);

          // Decrypt based on encryption method
          let decrypted: string;
          if (encryption === 'nip44' || version === 2) {
            // Version 2 or explicit NIP-44
            const { decrypt44 } = await import('../lib/nostrAPI');
            console.log('[WalletRestore] Using NIP-44 decryption...');
            decrypted = await decrypt44(account.publicKey, data.encryptedMnemonic);
          } else {
            // Version 1 or NIP-04
            const { decrypt } = await import('../lib/nostrAPI');
            console.log('[WalletRestore] Using NIP-04 decryption (legacy)...');
            decrypted = await decrypt(account.publicKey, data.encryptedMnemonic);
          }

          mnemonic = decrypted;
          toast?.sendInfo(`Encrypted wallet file (v${version}) loaded and decrypted successfully`);
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
      await sparkWallet.actions.connect(seed, false);

      // If user opted to backup to relays, sync now
      if (backupToRelays()) {
        try {
          await handleSyncBackup();
        } catch (backupError) {
          console.error('Relay backup failed:', backupError);
          toast?.sendWarning('Wallet restored but relay backup failed. You can backup later from settings.');
        }
      }

      // Force a balance refresh to ensure UI updates
      await sparkWallet.actions.refreshBalance();

      // Load payment history
      await sparkWallet.actions.loadPaymentHistory();

      setMnemonic('');
      setBackupToRelays(false);
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
      console.log('[WalletNew] Full parsed object:', JSON.stringify(parsed, null, 2));

      if (parsed.type === 'lightningAddress' || parsed.type === 'lnurlPay') {
        // Handle Lightning address or LNURL pay
        const amountSats = parseInt(paymentAmount());
        if (!amountSats || amountSats < 1) {
          toast?.sendWarning('Please enter a valid amount');
          return;
        }

        // Get the pay request details from parsed input
        // For Lightning addresses, the data is nested in parsed.payRequest
        const payRequest = parsed.type === 'lightningAddress'
          ? parsed.payRequest
          : parsed;

        // Prepare the LNURL pay
        console.log('[WalletNew] Preparing LNURL pay with:', {
          amountSats,
          payRequest: JSON.stringify(payRequest, null, 2),
        });
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

    if (amount < 1) {
      toast?.sendWarning('Please enter a valid amount');
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

  // Watch for incoming payments
  createEffect(() => {
    const lastReceived = sparkWallet.store.lastReceivedPayment;
    const invoice = generatedInvoice();

    // Only proceed if we have a received payment
    if (!lastReceived || !lastReceived.invoice) {
      return;
    }

    // Check if notification was already shown for this payment
    if (lastReceived.notificationShown) {
      return;
    }

    // Check if we've already processed this payment (local component state)
    if (lastReceived.invoice === lastProcessedPaymentInvoice()) {
      return;
    }

    // Mark this payment as processed locally and in the context
    setLastProcessedPaymentInvoice(lastReceived.invoice);
    sparkWallet.actions.markPaymentNotificationShown();

    // Check if this payment matches our displayed invoice (Top Up flow)
    const isInvoicePayment = invoice && lastReceived.invoice === invoice;

    if (isInvoicePayment) {
      // Invoice payment - show lightning flash and close dialog
      setShowPaymentFlash(true);
      toast?.sendSuccess('Payment received! Balance updated');

      // Close invoice dialog and hide animation after 1500ms
      setTimeout(() => {
        setShowPaymentFlash(false);
        setGeneratedInvoice('');
        setQrCodeDataUrl('');
        setActiveTab('payments');
      }, 1500);
    } else {
      // Lightning address payment - show lightning flash
      setShowPaymentFlash(true);
      toast?.sendSuccess(`Payment received! +${lastReceived.amount.toLocaleString()} sats`);

      // Hide animation after 1500ms
      setTimeout(() => {
        setShowPaymentFlash(false);
      }, 1500);
    }
  });

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
    console.log('[WalletNew] 🔄 Starting backup sync to relays...');
    try {
      await sparkWallet.actions.syncBackupToRelays();
      console.log('[WalletNew] ✅ Backup sync completed successfully');
      toast?.sendSuccess('Backup synced to relays. You can now restore from relays on another device.');
    } catch (error: any) {
      console.error('[WalletNew] ❌ Backup sync error:', error);
      toast?.sendWarning(`Failed to sync backup: ${error?.message || 'Unknown error'}. Try using Export Wallet instead.`);
    }
  };

  const handleExportWallet = async () => {
    if (!account?.publicKey) {
      toast?.sendWarning('Please log in first');
      return;
    }

    try {
      // Load the decrypted seed from storage
      const { loadEncryptedSeed } = await import('../lib/spark/sparkStorage');
      const mnemonic = await loadEncryptedSeed(account.publicKey);

      if (!mnemonic) {
        toast?.sendWarning('No wallet found to export');
        return;
      }

      // Try NIP-44 first, fall back to NIP-04 if not supported (Version 2 format)
      const { encrypt, encrypt44 } = await import('../lib/nostrAPI');
      let encryptedMnemonic: string;
      let encryptionVersion: 'nip44' | 'nip04' = 'nip44';

      try {
        // Try NIP-44 encryption with timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('NIP-44 encryption timeout')), 5000)
        );
        encryptedMnemonic = await Promise.race([
          encrypt44(account.publicKey, mnemonic),
          timeoutPromise
        ]);
        console.log('[WalletExport] ✓ NIP-44 encryption successful');
      } catch (nip44Error) {
        console.warn('[WalletExport] NIP-44 not available, falling back to NIP-04:', nip44Error);
        encryptedMnemonic = await encrypt(account.publicKey, mnemonic);
        encryptionVersion = 'nip04';
        console.log('[WalletExport] ✓ NIP-04 encryption successful (fallback)');
      }

      // Create the backup file in Version 2 format (matching Jumble-Spark)
      const backupData = {
        version: 2,
        type: 'spark-wallet-backup',
        encryption: encryptionVersion,
        pubkey: account.publicKey,
        encryptedMnemonic,
        createdAt: Date.now(),
        createdBy: 'Primal',
      };

      // Download the file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spark-wallet-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast?.sendSuccess('Wallet exported successfully');
    } catch (error: any) {
      console.error('Export failed:', error);
      toast?.sendWarning(`Failed to export wallet: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleRevealSeedPhrase = async () => {
    if (!account?.publicKey) {
      toast?.sendWarning('Please log in first');
      return;
    }

    if (!confirm('⚠️ WARNING: Your seed phrase controls your funds. Never share it with anyone!\n\nAre you sure you want to reveal your seed phrase?')) {
      return;
    }

    try {
      // Load and decrypt the seed
      const { loadEncryptedSeed } = await import('../lib/spark/sparkStorage');
      const seed = await loadEncryptedSeed(account.publicKey);

      if (!seed) {
        toast?.sendWarning('No wallet found');
        return;
      }

      // Show the seed phrase in reveal mode
      setMnemonic(seed);
      setShowMnemonic(true);
      setDialogMode('reveal');
      setOpenCreateDialog(true);
    } catch (error: any) {
      console.error('Failed to reveal seed:', error);
      toast?.sendWarning(`Failed to reveal seed: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleCheckRelayBackups = async () => {
    if (!account?.publicKey) {
      toast?.sendWarning('Please log in first');
      return;
    }

    try {
      const { fetchBackup } = await import('../lib/spark/sparkBackup');
      const relays = account.activeRelays || [];

      console.log('[WalletNew] Checking for backups on relays...');
      toast?.sendInfo('Checking relays for backups...');

      const backup = await fetchBackup(relays, account.publicKey);

      if (backup) {
        toast?.sendSuccess('Backup found on relays! Your wallet is safely backed up.');
        console.log('[WalletNew] Backup found on relays');
      } else {
        toast?.sendWarning('No backup found on relays. Click "Sync Backup to Relays" to create one.');
      }
    } catch (error: any) {
      console.error('[WalletNew] Check relay backups failed:', error);
      toast?.sendWarning(`Failed to check relay backups: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteLightningAddress = async () => {
    if (!sparkWallet.store.lightningAddress) {
      toast?.sendInfo('No Lightning address to delete');
      return;
    }

    const confirmed = confirm(
      'Delete Lightning Address?\n\n' +
      `This will remove your Lightning address (${sparkWallet.store.lightningAddress}).\n\n` +
      'You can register a new one later.\n\n' +
      'Click OK to delete.\n' +
      'Click Cancel to keep it.'
    );

    if (!confirmed) return;

    try {
      await sparkWallet.actions.deleteLightningAddress();
      toast?.sendSuccess('Lightning address deleted successfully');
    } catch (error: any) {
      console.error('[WalletNew] Delete Lightning address failed:', error);
      toast?.sendWarning(`Failed to delete Lightning address: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteRelayBackups = async () => {
    if (!account?.publicKey) {
      toast?.sendWarning('Please log in first');
      return;
    }

    try {
      // Check if relay backup exists
      const { fetchBackup, deleteBackup } = await import('../lib/spark/sparkBackup');
      const relays = account.activeRelays || [];
      const hasBackup = await fetchBackup(relays, account.publicKey);

      const confirmed = confirm(
        '⚠️ DELETE RELAY BACKUP\n\n' +
        '🚨 This will:\n' +
        (hasBackup
          ? '❌ DELETE the backup from your Nostr relays\n'
          : '• No relay backup exists (you never synced to relays)\n') +
        '❌ Make restoration from relays impossible\n\n' +
        '✅ Your local wallet will remain on this device\n' +
        '✅ Your funds remain safe\n\n' +
        '⚠️ ONLY DO THIS IF:\n' +
        '• You have downloaded your backup file, OR\n' +
        '• You have written down your 12-word recovery phrase, OR\n' +
        '• You are intentionally removing relay backups\n\n' +
        'Click OK to delete relay backup.\n' +
        'Click Cancel to go back safely.'
      );

      if (!confirmed) {
        return;
      }

      // Second confirmation for safety (only if relay backup exists)
      if (hasBackup) {
        const doubleCheck = confirm(
          '⚠️ FINAL CONFIRMATION\n\n' +
          'Are you absolutely sure?\n\n' +
          'This will DELETE the relay backup and you will NOT be able to restore from relays.\n\n' +
          'Have you saved your backup file or recovery phrase?\n\n' +
          'Click OK to proceed with deletion.\n' +
          'Click Cancel to go back safely.'
        );

        if (!doubleCheck) {
          return;
        }
      }

      if (hasBackup) {
        await deleteBackup(relays, account.publicKey);

        // Immediately update local state to show no backup
        // (don't check relays again as deletion event may still be there)
        sparkWallet.actions.setHasBackup(false);

        toast?.sendSuccess('Relay backup deleted successfully.');
      } else {
        toast?.sendInfo('No relay backup found to delete.');
      }
    } catch (error: any) {
      console.error('[WalletNew] Delete relay backups failed:', error);
      toast?.sendWarning(`Failed to delete relay backups: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleRestoreFromBackup = async () => {
    console.log('[WalletNew] handleRestoreFromBackup - account:', {
      hasAccount: !!account,
      hasPublicKey: !!account?.publicKey,
      publicKey: account?.publicKey?.slice(0, 8),
      hasRelays: !!account?.activeRelays,
      relayCount: account?.activeRelays?.length
    });

    if (!account?.publicKey) {
      toast?.sendWarning('Please log in first');
      return;
    }

    try {
      setIsRestoring(true);
      console.log('[WalletNew] Attempting to restore from relays...');
      // Pass true to overwrite local wallet when explicitly restoring
      const success = await sparkWallet.actions.syncBackupFromRelays(true);
      console.log('[WalletNew] Restore result:', success);

      if (success) {
        toast?.sendSuccess('Backup restored from relays');
        // Reconnect with restored seed
        const { loadEncryptedSeed } = await import('../lib/spark/sparkStorage');
        const seed = await loadEncryptedSeed(account.publicKey);
        if (seed) {
          console.log('[WalletNew] Seed loaded, connecting wallet...');
          await sparkWallet.actions.connect(seed, false);
          setRestoreMethod(null);
          setOpenRestoreDialog(false);
        }
      } else {
        console.warn('[WalletNew] No backup found on relays');
        toast?.sendWarning('No backup found on relays. Make sure you synced your wallet to relays first, or try manual restore with your seed phrase.');
      }
    } catch (error: any) {
      console.error('[WalletNew] Backup restore failed:', error);
      toast?.sendWarning(`Failed to restore backup: ${error?.message || 'Unknown error'}. Try manual restore with your seed phrase instead.`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div class={styles.walletPage}>
      {/* Lightning flash animation for incoming payments */}
      <Show when={showPaymentFlash()}>
        <LightningFlash duration={1000} active={showPaymentFlash()} />
      </Show>

      <PageTitle title="Lightning Wallet" />

      <PageCaption>
        <div>Breez Spark Wallet</div>
      </PageCaption>

      <div class={styles.walletContent}>
        <Show
          when={sparkWallet.store.isConnected || (sparkWallet.store.isConfigured && sparkWallet.store.balance > 0)}
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
                  Loading wallet...
                </div>
                <div class={styles.emptyDescription}>
                  Connecting to your Breez Spark wallet and syncing your balance. This may take up to a minute. Please be patient.
                </div>
              </div>
            </Show>
          }
        >
          <div class={styles.walletConnected}>
            {/* Syncing indicator when showing cached data */}
            <Show when={!sparkWallet.store.isConnected}>
              <div class={styles.syncingBanner}>
                <div class={styles.syncingDot}></div>
                <span>Syncing wallet...</span>
              </div>
            </Show>

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

            {/* Lightning Address Card */}
            <LightningAddressCard />

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
                onClick={() => {
                  setActiveTab('topup');
                  setIsEditingAmount(false); // Reset to presets when switching to Top Up
                }}
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
                      {isSendingPayment() ? 'Sending...' : 'Send Payment'}
                    </ButtonPrimary>
                  </div>
                </div>

                {/* Payment History */}
                <div class={styles.transactions}>
                  <div class={styles.sectionHeader}>
                    <div class={styles.sectionTitle}>Recent Payments</div>
                    <button type="button" class={styles.refreshButton} onClick={() => sparkWallet.actions.loadPaymentHistory()}>
                      Refresh
                    </button>
                  </div>
                  <SparkPaymentsList
                    payments={sparkWallet.store.payments}
                    loading={sparkWallet.store.paymentsLoading}
                    hasMore={sparkWallet.store.hasMorePayments}
                    onLoadMore={sparkWallet.actions.loadMorePayments}
                    isBalanceHidden={sparkWallet.store.isBalanceHidden}
                  />
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
                            class={`${styles.topUpPresetButton} ${selectedPreset() === preset.amount ? styles.topUpPresetButtonActive : ''}`}
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

                  <Show when={topUpAmount() > maxTopUpAmount()}>
                    <div class={styles.topUpInfo}>
                      <p class={styles.warningText}>
                        Maximum: {maxTopUpAmount().toLocaleString()} sats (balance {sparkWallet.store.balance.toLocaleString()} / 500K limit)
                      </p>
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
                            Cancel
                          </ButtonSecondary>
                        </div>
                      </div>
                    }
                  >
                    <div class={styles.generateInvoiceButton}>
                      <ButtonPrimary
                        onClick={handleGenerateInvoice}
                        disabled={isGeneratingInvoice() || topUpAmount() < 1 || topUpAmount() > maxTopUpAmount()}
                      >
                        {isGeneratingInvoice() ? 'Generating Invoice...' : `Generate Invoice for ${topUpAmount().toLocaleString()} sats`}
                      </ButtonPrimary>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>

            {/* Wallet Settings - Collapsible Section (visible in both tabs) */}
            <div class={styles.walletSettingsCollapsible}>
              <button
                class={styles.settingsToggle}
                onClick={() => setShowSettings(!showSettings())}
              >
                <div class={styles.settingsToggleIcon}></div>
                <div class={styles.settingsToggleLabel}>Wallet Settings</div>
                <div class={`${styles.settingsChevron} ${showSettings() ? styles.settingsChevronOpen : ''}`}></div>
              </button>

              <Show when={showSettings()}>
                <div class={styles.settingsContent}>
                  {/* Backup Section */}
                  <div class={styles.backupSection}>
                    <div class={styles.sectionTitle}>Backup & Recovery</div>
                    <div class={styles.backupInfo}>
                      <div class={styles.backupActions}>
                        <ButtonSecondary onClick={handleExportWallet}>
                          Export Wallet
                        </ButtonSecondary>
                        <ButtonSecondary onClick={handleRevealSeedPhrase}>
                          Reveal Seed Phrase
                        </ButtonSecondary>
                        <ButtonSecondary onClick={handleSyncBackup}>
                          Sync Backup to Relays
                        </ButtonSecondary>
                        <ButtonSecondary onClick={handleCheckRelayBackups}>
                          Check Relay Backups
                        </ButtonSecondary>
                      </div>
                      <Show
                        when={sparkWallet.store.hasBackup}
                        fallback={
                          <div class={styles.backupStatus}>
                            <div class={styles.backupIcon}>⚠️</div>
                            <div class={styles.backupText}>
                              <div class={styles.backupStatusLabel}>No relay backup found</div>
                              <div class={styles.backupStatusDesc}>Click "Sync Backup to Relays" to enable multi-device sync</div>
                            </div>
                          </div>
                        }
                      >
                        <div class={styles.backupStatus}>
                          <div class={styles.backupIconSuccess}>✓</div>
                          <div class={styles.backupText}>
                            <div class={styles.backupStatusLabel}>Wallet backed up to Nostr relays</div>
                            <Show when={sparkWallet.store.lastBackupSync}>
                              <div class={styles.backupStatusDesc}>
                                Last sync: {new Date(sparkWallet.store.lastBackupSync!).toLocaleString()}
                              </div>
                            </Show>
                          </div>
                        </div>
                      </Show>
                    </div>
                  </div>

                  {/* Nostr Wallet Connect */}
                  <div class={styles.walletSettings}>
                    <div class={styles.sectionTitle}>Nostr Wallet Connect</div>
                    <div class={styles.nwcComingSoon}>
                      <div class={styles.nwcIcon}></div>
                      <div class={styles.nwcText}>
                        <div class={styles.nwcTitle}>Coming Soon</div>
                        <div class={styles.nwcDesc}>
                          Connect your wallet to other Nostr apps with NWC
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Wallet Management */}
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
                      <Show when={sparkWallet.store.lightningAddress}>
                        <button class={styles.settingItem} onClick={handleDeleteLightningAddress}>
                          <div class={styles.settingInfo}>
                            <div class={`${styles.settingLabel} ${styles.settingLabelDanger}`}>
                              Delete Lightning Address
                            </div>
                            <div class={styles.settingDesc}>
                              Remove {sparkWallet.store.lightningAddress}
                            </div>
                          </div>
                          <div class={styles.settingArrow}></div>
                        </button>
                      </Show>
                      <button class={styles.settingItem} onClick={handleDeleteRelayBackups}>
                        <div class={styles.settingInfo}>
                          <div class={`${styles.settingLabel} ${styles.settingLabelDanger}`}>
                            Delete Relay Backups
                          </div>
                          <div class={styles.settingDesc}>
                            Remove all backups from Nostr relays
                          </div>
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

            {/* Wallet Disclaimer */}
            <div class={styles.walletDisclaimer}>
              <div>Breez SDK + Spark wallet integration</div>
              <div>Version 0.4.2 with privacy mode enabled by default</div>
              <div>Recovery phrase encrypted with XChaCha20-Poly1305</div>
              <div>Saved locally and optionally backed up to Nostr relays</div>
              <div>Hot wallet - do not use with large amounts!</div>
            </div>
          </div>
        </Show>
      </div>

      {/* Create/Reveal Wallet Dialog */}
      <AdvancedSearchDialog
        open={openCreateDialog()}
        setOpen={(open: boolean) => {
          setOpenCreateDialog(open);
          if (!open) {
            setMnemonic('');
            setShowMnemonic(false);
            setHasBackedUpSeed(false);
            setBackupToRelays(false);
            setDialogMode('create');
          }
        }}
        triggerClass="hidden"
        title={<div>{dialogMode() === 'create' ? 'Create New Wallet' : 'Your Seed Phrase'}</div>}
      >
        <div class={styles.dialogContent}>
          <Show
            when={dialogMode() === 'create'}
            fallback={
              <>
                <div class={styles.dialogDescription}>
                  ⚠️ WARNING: Never share your seed phrase with anyone. Anyone with access to this phrase can steal your funds.
                </div>

                <div class={styles.seedPhraseDisplay}>
                  {mnemonic()}
                </div>

                <div class={styles.dialogInfo}>
                  Write down these 12 words and store them in a secure location. This is the only way to recover your wallet if you lose access.
                </div>
              </>
            }
          >
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

            <div class={styles.checkboxContainer}>
              <input
                type="checkbox"
                id="backupToRelaysCreate"
                checked={backupToRelays()}
                onChange={(e) => setBackupToRelays(e.currentTarget.checked)}
              />
              <label for="backupToRelaysCreate">Backup to Nostr relays (optional)</label>
            </div>

            <div class={styles.dialogInfo}>
              Never share your seed phrase with anyone. Your seed will be encrypted and stored securely using your Nostr key.
            </div>
          </Show>
        </div>

        <div class={styles.dialogActions}>
          <Show
            when={dialogMode() === 'create'}
            fallback={
              <ButtonPrimary
                onClick={() => {
                  setMnemonic('');
                  setShowMnemonic(false);
                  setOpenCreateDialog(false);
                  setDialogMode('create');
                }}
              >
                Close
              </ButtonPrimary>
            }
          >
            <ButtonSecondary
              onClick={() => {
                setMnemonic('');
                setShowMnemonic(false);
                setHasBackedUpSeed(false);
                setBackupToRelays(false);
                setOpenCreateDialog(false);
                setDialogMode('create');
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
          </Show>
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
            setBackupToRelays(false);
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
                <ButtonPrimary onClick={() => setRestoreMethod('file')}>
                  Wallet File
                </ButtonPrimary>
                <div class={styles.restoreOptionDescription}>
                  Import Breez Spark wallet JSON file
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
              <span>Upload a Breez Spark wallet backup file you previously exported.</span>
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

            <div class={styles.checkboxContainer}>
              <input
                type="checkbox"
                id="backupToRelaysFile"
                checked={backupToRelays()}
                onChange={(e) => setBackupToRelays(e.currentTarget.checked)}
              />
              <label for="backupToRelaysFile">Backup to Nostr relays (optional)</label>
            </div>

            <div class={styles.dialogInfo}>
              Your wallet file will be encrypted and stored securely using your Nostr key.
            </div>
          </Show>

          <Show when={restoreMethod() === 'manual'}>
            <div class={styles.dialogDescription}>
              <span>Enter your 12-24 word seed phrase to restore your wallet.</span>
            </div>

            <div class={styles.mnemonicInputWrapper}>
              <TextField class={styles.mnemonicInput}>
                <TextField.TextArea
                  value={mnemonic()}
                  onInput={(e) => setMnemonic(e.currentTarget.value)}
                  placeholder="Enter your 12-24 word mnemonic..."
                  rows={3}
                  disabled={sparkWallet.store.isConnecting}
                  autofocus
                  classList={{ [styles.mnemonicHidden]: !showMnemonic() }}
                />
              </TextField>
            </div>

            <div class={styles.checkboxContainer}>
              <input
                type="checkbox"
                id="showMnemonicRestore"
                checked={showMnemonic()}
                onChange={(e) => setShowMnemonic(e.currentTarget.checked)}
              />
              <label for="showMnemonicRestore">Show seed phrase</label>
            </div>

            <div class={styles.checkboxContainer}>
              <input
                type="checkbox"
                id="backupToRelaysRestore"
                checked={backupToRelays()}
                onChange={(e) => setBackupToRelays(e.currentTarget.checked)}
              />
              <label for="backupToRelaysRestore">Backup to Nostr relays (optional)</label>
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
                setBackupToRelays(false);
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
