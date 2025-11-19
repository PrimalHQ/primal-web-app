import { Component, createEffect, createSignal, Show } from 'solid-js';
import { useIntl } from '@cookbook/solid-intl';
import PageCaption from '../components/PageCaption/PageCaption';
import PageTitle from '../components/PageTitle/PageTitle';
import { useAccountContext } from '../contexts/AccountContext';
import { SparkWalletProvider, useSparkWallet } from '../contexts/SparkWalletContext';
import { useToastContext } from '../components/Toaster/Toaster';
import ButtonPrimary from '../components/Buttons/ButtonPrimary';
import ButtonSecondary from '../components/Buttons/ButtonSecondary';
import { TextField } from '@kobalte/core/text-field';
import AdvancedSearchDialog from '../components/AdvancedSearch/AdvancedSearchDialog';
import SparkPaymentsList from '../components/SparkPaymentsList/SparkPaymentsList';
import { generateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

import styles from './Wallet.module.scss';

const WalletContent: Component = () => {
  const intl = useIntl();
  const account = useAccountContext();
  const toast = useToastContext();
  const sparkWallet = useSparkWallet();

  const [mnemonic, setMnemonic] = createSignal('');
  const [showMnemonic, setShowMnemonic] = createSignal(false);
  const [openCreateDialog, setOpenCreateDialog] = createSignal(false);
  const [openRestoreDialog, setOpenRestoreDialog] = createSignal(false);
  const [restoreMethod, setRestoreMethod] = createSignal<'backup' | 'manual' | 'file' | null>(null);
  const [activeTab, setActiveTab] = createSignal<'payments' | 'settings'>('payments');
  const [hasBackedUpSeed, setHasBackedUpSeed] = createSignal(false);
  const [isRestoring, setIsRestoring] = createSignal(false);

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
    toast?.sendInfo('Please write down your seed phrase and store it safely!');
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
                    <img src="https://breez.technology/logo-breez-header.svg" alt="Breez" class={styles.breezLogo} />
                    <img src="https://breez.technology/spark.svg" alt="Spark" class={styles.sparkLogo} />
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
                  <div class={styles.lightningIconLarge}></div>
                </div>
                <div class={styles.emptyTitle}>
                  Connecting to Wallet...
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
                <div class={styles.balanceLabel}>Total Balance</div>
                <Show when={account?.activeWalletType === 'breez'}>
                  <div class={styles.activeBadge}>
                    <div class={styles.checkCircleIcon}></div>
                    <span>Active Wallet</span>
                  </div>
                </Show>
              </div>
              <div class={styles.balanceAmount}>
                {sparkWallet.store.balance?.toLocaleString() || 0}
                <span class={styles.balanceUnit}>sats</span>
              </div>
              <div class={styles.balanceActions}>
                <ButtonPrimary onClick={handleRefreshBalance}>
                  Refresh Balance
                </ButtonPrimary>
                <Show when={account?.activeWalletType !== 'breez'}>
                  <ButtonSecondary onClick={handleSetAsActive}>
                    Set as Active
                  </ButtonSecondary>
                </Show>
              </div>
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
                class={`${styles.tab} ${activeTab() === 'settings' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                Settings
              </button>
            </div>

            {/* Tab Content */}
            <Show when={activeTab() === 'payments'}>
              <div class={styles.tabContent}>
                {/* Payment History */}
                <div class={styles.transactions}>
                  <div class={styles.sectionTitle}>Transaction History</div>
                  <SparkPaymentsList
                    payments={sparkWallet.store.payments}
                    loading={sparkWallet.store.paymentsLoading}
                    isBalanceHidden={false}
                  />
                </div>
              </div>
            </Show>

            <Show when={activeTab() === 'settings'}>
              <div class={styles.tabContent}>
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
                      <ButtonSecondary onClick={handleRestoreBackup}>
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
            <span>⚠️ <strong>Write down these 12 words and store them safely!</strong> This is the ONLY way to recover your wallet.</span>
          </div>

          <TextField class={styles.mnemonicInput}>
            <TextField.TextArea
              value={mnemonic()}
              placeholder="Your 12-word seed phrase..."
              rows={3}
              disabled={sparkWallet.store.isConnecting}
              type={showMnemonic() ? 'text' : 'password'}
              autoResize
              autofocus
              readOnly
            />
          </TextField>

          <div class={styles.checkboxContainer}>
            <input
              type="checkbox"
              id="showMnemonicCreate"
              checked={showMnemonic()}
              onChange={(e) => setShowMnemonic(e.currentTarget.checked)}
            />
            <label for="showMnemonicCreate">Show seed phrase</label>
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

          <div class={styles.dialogWarning}>
            ⚠️ Never share your seed phrase with anyone. Your seed will be encrypted and stored securely using your Nostr key.
            <br /><br />
            ✅ Automatic backup to Nostr relays enabled for multi-device sync.
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
            <div class={styles.walletOptions}>
              <ButtonPrimary onClick={() => setRestoreMethod('backup')}>
                From Relay Backup
              </ButtonPrimary>
              <ButtonSecondary onClick={() => setRestoreMethod('manual')}>
                Enter Seed Phrase
              </ButtonSecondary>
              <ButtonSecondary onClick={() => setRestoreMethod('file')}>
                Upload Wallet File
              </ButtonSecondary>
            </div>
            <div class={styles.dialogWarning}>
              💡 <strong>From Relay Backup:</strong> Automatically fetch your encrypted wallet from Nostr relays.
              <br /><br />
              💡 <strong>Enter Seed Phrase:</strong> Manually enter your 12-24 word recovery phrase.
              <br /><br />
              💡 <strong>Upload Wallet File:</strong> Import a JSON wallet file from jumble-spark or sparkihonne.
            </div>
          </Show>

          <Show when={restoreMethod() === 'backup'}>
            <div class={styles.dialogDescription}>
              <span>Restore your wallet from the encrypted backup stored on Nostr relays.</span>
            </div>
            <div class={styles.dialogWarning}>
              🔄 This will fetch your encrypted wallet backup from Nostr relays and restore it.
              <br /><br />
              ⚠️ You must be logged in with the same Nostr account that created the backup.
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
                ✅ Wallet file loaded successfully! Click "Restore Wallet" below to continue.
              </div>
            </Show>

            <div class={styles.dialogWarning}>
              ⚠️ Your wallet file will be encrypted and stored securely using your Nostr key.
              <br /><br />
              ✅ Automatic backup to Nostr relays will be enabled.
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
                type={showMnemonic() ? 'text' : 'password'}
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

            <div class={styles.dialogWarning}>
              ⚠️ Never share your seed phrase with anyone. Your seed will be encrypted and stored securely using your Nostr key.
              <br /><br />
              ✅ Automatic backup to Nostr relays will be enabled.
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
  return (
    <SparkWalletProvider>
      <WalletContent />
    </SparkWalletProvider>
  );
};

export default Wallet;
