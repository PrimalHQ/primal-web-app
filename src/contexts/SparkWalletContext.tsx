import { createContext, useContext, createSignal, createEffect, onCleanup, ParentComponent } from 'solid-js';
import { createStore } from 'solid-js/store';
import { breezWallet, BreezWalletState, BreezPaymentInfo } from '../lib/breezWalletService';
import { loadEncryptedSeed, saveEncryptedSeed, loadSparkConfig, saveSparkConfig, isSparkWalletConfigured, SparkWalletConfig } from '../lib/spark/sparkStorage';
import { publishBackup, fetchBackup, syncToRelays, syncFromRelays, hasBackup } from '../lib/spark/sparkBackup';
import { publishZapReceiptForPayment, handleIncomingZap } from '../lib/spark/sparkZapReceipt';
import { useAccountContext } from './AccountContext';
import { useZapNotification } from './ZapNotificationContext';
import { logError, logInfo, logWarning } from '../lib/logger';
import type { LightningAddressInfo } from '@breeztech/breez-sdk-spark/web';

/**
 * Spark Wallet Context
 *
 * Provides centralized state management for the Breez Spark wallet integration.
 * Replaces singleton pattern with reactive Solid.js context.
 *
 * Features:
 * - Auto-connect on mount if wallet is configured
 * - Automatic backup to Nostr relays (NIP-78)
 * - Balance syncing and event handling
 * - Payment history management
 */

export type SparkWalletStore = {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  isConfigured: boolean;
  isEnabled: boolean;
  connectionProgress?: string; // Progress message during connection

  // Wallet data
  balance: number; // sats
  tokenBalances: Map<string, any>;
  lastSynced?: Date;

  // Lightning address
  lightningAddress?: string;
  lightningAddressInfo?: LightningAddressInfo;

  // Configuration
  config: SparkWalletConfig | null;
  network: 'mainnet' | 'regtest';

  // Backup state
  hasBackup: boolean;
  lastBackupSync?: Date;

  // Payment history
  payments: BreezPaymentInfo[];
  paymentsLoading: boolean;
  hasMorePayments: boolean;
  paymentsOffset: number;

  // Last received payment (for notifications)
  lastReceivedPayment?: {
    invoice: string;
    amount: number;
    timestamp: number;
    notificationShown?: boolean; // Track if notification was already shown
  };

  // Display preferences
  displayCurrency: string; // SATS, USD, EUR, etc.
  isBalanceHidden: boolean;
};

export type SparkWalletActions = {
  // Connection management
  connect: (mnemonic: string, enableBackup?: boolean) => Promise<void>;
  disconnect: () => Promise<void>;

  // Wallet enable/disable
  enableWallet: () => void;
  disableWallet: () => void;

  // Balance operations
  refreshBalance: () => Promise<void>;
  syncWallet: () => Promise<void>;

  // Payment operations
  sendPayment: (invoice: string, recipientPubkey?: string) => Promise<BreezPaymentInfo>;
  createInvoice: (amountSats: number, description?: string) => Promise<string>;
  loadPaymentHistory: (limit?: number, offset?: number) => Promise<void>;
  loadMorePayments: () => Promise<void>;

  // Lightning address operations
  loadLightningAddress: () => Promise<void>;
  registerLightningAddress: (username: string, description?: string) => Promise<LightningAddressInfo>;
  checkLightningAddressAvailable: (username: string) => Promise<boolean>;
  deleteLightningAddress: () => Promise<void>;

  // Backup operations
  enableBackup: () => Promise<void>;
  disableBackup: () => Promise<void>;
  syncBackupToRelays: () => Promise<void>;
  syncBackupFromRelays: (overwrite?: boolean) => Promise<boolean>;
  checkBackupStatus: () => Promise<boolean>;
  setHasBackup: (value: boolean) => void;

  // Configuration
  updateConfig: (config: Partial<SparkWalletConfig>) => void;

  // Display preferences
  setDisplayCurrency: (currency: string) => void;
  toggleBalanceVisibility: () => void;

  // Notification management
  markPaymentNotificationShown: () => void;
};

export type SparkWalletContextType = {
  store: SparkWalletStore;
  actions: SparkWalletActions;
};

const SparkWalletContext = createContext<SparkWalletContextType>();

export const SparkWalletProvider: ParentComponent = (props) => {
  const account = useAccountContext();
  const zapNotification = useZapNotification();

  // Load preferences from localStorage
  const loadDisplayCurrency = () => {
    try {
      return localStorage.getItem('spark_display_currency') || 'SATS';
    } catch {
      return 'SATS';
    }
  };

  const loadBalanceVisibility = () => {
    try {
      const stored = localStorage.getItem('spark_balance_hidden');
      return stored === 'true';
    } catch {
      return false;
    }
  };

  const loadWalletEnabled = () => {
    try {
      const stored = localStorage.getItem('spark_wallet_enabled');
      // Default to true if never set before
      return stored === null ? true : stored === 'true';
    } catch {
      return true; // Default to enabled
    }
  };

  // Load cached balance
  const loadCachedBalance = () => {
    if (!account?.publicKey) return null;
    try {
      const cached = localStorage.getItem(`spark_balance_${account.publicKey}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  // Save balance to cache
  const saveCachedBalance = (balance: number, lastSynced: Date) => {
    if (!account?.publicKey) return;
    try {
      localStorage.setItem(`spark_balance_${account.publicKey}`, JSON.stringify({
        balance,
        lastSynced: lastSynced.getTime()
      }));
    } catch (e) {
      logError('[SparkWallet] Failed to cache balance:', e);
    }
  };

  // Initialize store
  const cachedBalance = loadCachedBalance();
  const [store, setStore] = createStore<SparkWalletStore>({
    isConnected: false,
    isConnecting: false,
    isConfigured: false,
    isEnabled: loadWalletEnabled(),
    balance: cachedBalance?.balance || 0,
    tokenBalances: new Map(),
    config: null,
    network: 'mainnet',
    hasBackup: false,
    payments: [],
    paymentsLoading: false,
    hasMorePayments: true,
    paymentsOffset: 0,
    displayCurrency: loadDisplayCurrency(),
    isBalanceHidden: loadBalanceVisibility(),
  });

  // Event listener ID for cleanup
  let eventListenerId: string | null = null;

  /**
   * Auto-connect on mount if wallet is configured
   */
  createEffect(() => {
    if (account?.publicKey) {
      checkAndAutoConnect();
    }
  });

  /**
   * Check if wallet is configured and auto-connect
   */
  const checkAndAutoConnect = async () => {
    if (!account?.publicKey) return;

    try {
      const isConfigured = isSparkWalletConfigured(account.publicKey);
      setStore('isConfigured', isConfigured);

      // Only auto-connect if wallet is enabled
      if (isConfigured && !store.isConnected && store.isEnabled) {
        logInfo('[SparkWallet] Wallet configured and enabled, auto-connecting...');

        // Load config
        const config = loadSparkConfig(account.publicKey);
        if (config) {
          setStore('config', config);
          setStore('network', config.network);
        }

        // Load encrypted seed and connect
        const seed = await loadEncryptedSeed(account.publicKey);
        if (seed) {
          await actions.connect(seed, false); // Don't backup on auto-connect
        }
      } else if (isConfigured && !store.isEnabled) {
        logInfo('[SparkWallet] Wallet configured but disabled, skipping auto-connect');
      }

      // Check backup status AFTER connection (non-blocking, fire-and-forget)
      if (account.activeRelays) {
        hasBackup(account.activeRelays, account.publicKey)
          .then(backupExists => {
            setStore('hasBackup', backupExists);
            logInfo(`[SparkWallet] Backup status checked: ${backupExists}`);
          })
          .catch(error => {
            logWarning('[SparkWallet] Failed to check backup status:', error);
          });
      }
    } catch (error) {
      logError('[SparkWallet] Auto-connect failed:', error);
    }
  };

  /**
   * Connect to Breez wallet
   */
  const connect = async (mnemonic: string, enableBackup: boolean = true): Promise<void> => {
    if (!account?.publicKey) {
      throw new Error('No account public key available');
    }

    try {
      setStore('isConnecting', true);
      setStore('connectionProgress', 'Loading wallet...');

      // Connect to Breez SDK
      await breezWallet.connect(mnemonic, store.network);

      setStore('connectionProgress', 'Syncing balance...');

      // Save encrypted seed locally
      await saveEncryptedSeed(mnemonic, account.publicKey);

      // Create/update config
      const existingConfig = loadSparkConfig(account.publicKey);
      const config: SparkWalletConfig = existingConfig || {
        isConfigured: true,
        network: store.network,
        createdAt: Date.now(),
        encryptionVersion: 'xchacha20poly1305_v1',
      };

      saveSparkConfig(account.publicKey, config);
      setStore('config', config);
      setStore('isConfigured', true);
      setStore('isConnected', true);

      // Get initial balance
      const balance = await breezWallet.getBalance();
      setStore('balance', balance);
      setStore('lastSynced', new Date());

      // Set up event listener
      await setupEventListener();

      // Backup to Nostr relays if enabled
      if (enableBackup && account.activeRelays) {
        try {
          setStore('connectionProgress', 'Backing up to relays...');
          await actions.enableBackup();
        } catch (error) {
          logWarning('[SparkWallet] Backup failed, continuing without backup:', error);
        }
      }

      setStore('connectionProgress', 'Finalizing...');

      // Update account context
      account.actions.updateBreezWallet({
        isActive: true,
        isConnected: true,
        balance,
      });

      // Set as active wallet
      account.actions.setActiveWalletType('breez');

      // Load Lightning address if one exists
      try {
        await loadLightningAddress();
      } catch (error) {
        logWarning('[SparkWallet] Failed to load Lightning address:', error);
      }

      logInfo('[SparkWallet] Connected successfully');

    } catch (error) {
      logError('[SparkWallet] Connection failed:', error);
      setStore('isConnected', false);
      throw error;
    } finally {
      setStore('isConnecting', false);
      setStore('connectionProgress', undefined);
    }
  };

  /**
   * Disconnect from Breez wallet
   */
  const disconnect = async (): Promise<void> => {
    try {
      // Remove event listener
      if (eventListenerId) {
        await breezWallet.removeEventListener(eventListenerId);
        eventListenerId = null;
      }

      // Disconnect SDK
      await breezWallet.disconnect();

      // Reset store
      setStore('isConnected', false);
      setStore('isConfigured', false);
      setStore('balance', 0);
      setStore('tokenBalances', new Map());
      setStore('lastSynced', undefined);
      setStore('payments', []);
      setStore('lightningAddress', undefined);
      setStore('lightningAddressInfo', undefined);

      // Update account context
      account?.actions.updateBreezWallet({
        isActive: false,
        isConnected: false,
        balance: 0,
      });

      logInfo('[SparkWallet] Disconnected');
    } catch (error) {
      logError('[SparkWallet] Disconnect failed:', error);
      throw error;
    }
  };

  /**
   * Refresh balance from SDK
   */
  const refreshBalance = async (): Promise<void> => {
    try {
      const balance = await breezWallet.getBalance();
      const now = new Date();
      setStore('balance', balance);
      setStore('lastSynced', now);

      // Cache balance for faster next load
      saveCachedBalance(balance, now);

      // Update account context
      account?.actions.updateBreezWallet({
        balance,
        isConnected: true,
      });

      logInfo(`[SparkWallet] Balance refreshed: ${balance} sats`);
    } catch (error) {
      logError('[SparkWallet] Balance refresh failed:', error);
      throw error;
    }
  };

  /**
   * Sync wallet state
   */
  const syncWallet = async (): Promise<void> => {
    try {
      await breezWallet.syncWallet();
      await refreshBalance();
      logInfo('[SparkWallet] Wallet synced');
    } catch (error) {
      logError('[SparkWallet] Wallet sync failed:', error);
      throw error;
    }
  };

  /**
   * Send Lightning payment
   */
  const sendPayment = async (invoice: string, recipientPubkey?: string): Promise<BreezPaymentInfo> => {
    try {
      const payment = await breezWallet.sendPayment(invoice);

      // Refresh balance and history
      await refreshBalance();
      await loadPaymentHistory();

      // Publish zap receipt if this was a zap payment
      if (recipientPubkey && account?.activeRelays && account.publicKey) {
        try {
          await publishZapReceiptForPayment(
            payment,
            recipientPubkey,
            account.activeRelays,
            account.publicKey
          );
          logInfo('[SparkWallet] Zap receipt published for outgoing payment');
        } catch (error) {
          logWarning('[SparkWallet] Failed to publish zap receipt:', error);
          // Don't fail the payment if receipt publishing fails
        }
      }

      logInfo('[SparkWallet] Payment sent successfully');
      return payment;
    } catch (error) {
      logError('[SparkWallet] Payment failed:', error);
      throw error;
    }
  };

  /**
   * Create invoice
   */
  const createInvoice = async (amountSats: number, description?: string): Promise<string> => {
    try {
      const invoice = await breezWallet.createInvoice(amountSats, description);
      logInfo('[SparkWallet] Invoice created');
      return invoice;
    } catch (error) {
      logError('[SparkWallet] Invoice creation failed:', error);
      throw error;
    }
  };

  /**
   * Load payment history (initial load - replaces existing)
   */
  const loadPaymentHistory = async (limit: number = 50, offset: number = 0): Promise<void> => {
    try {
      setStore('paymentsLoading', true);
      const payments = await breezWallet.getPaymentHistory(limit, offset);
      setStore('payments', payments);
      setStore('paymentsOffset', payments.length);
      setStore('hasMorePayments', payments.length === limit);
      logInfo(`[SparkWallet] Loaded ${payments.length} payments`);
    } catch (error) {
      logError('[SparkWallet] Failed to load payment history:', error);
      throw error;
    } finally {
      setStore('paymentsLoading', false);
    }
  };

  /**
   * Load more payments (appends to existing)
   */
  const loadMorePayments = async (): Promise<void> => {
    if (!store.hasMorePayments || store.paymentsLoading) {
      return;
    }

    try {
      setStore('paymentsLoading', true);
      const limit = 50;
      const newPayments = await breezWallet.getPaymentHistory(limit, store.paymentsOffset);

      setStore('payments', [...store.payments, ...newPayments]);
      setStore('paymentsOffset', store.paymentsOffset + newPayments.length);
      setStore('hasMorePayments', newPayments.length === limit);

      logInfo(`[SparkWallet] Loaded ${newPayments.length} more payments (total: ${store.payments.length})`);
    } catch (error) {
      logError('[SparkWallet] Failed to load more payments:', error);
      throw error;
    } finally {
      setStore('paymentsLoading', false);
    }
  };

  /**
   * Load Lightning address for this wallet
   */
  const loadLightningAddress = async (): Promise<void> => {
    try {
      const addressInfo = await breezWallet.getLightningAddress();
      if (addressInfo) {
        setStore('lightningAddress', addressInfo.lightningAddress);
        setStore('lightningAddressInfo', addressInfo);
        logInfo(`[SparkWallet] Lightning address loaded: ${addressInfo.lightningAddress}`);
      } else {
        setStore('lightningAddress', undefined);
        setStore('lightningAddressInfo', undefined);
        logInfo('[SparkWallet] No Lightning address registered');
      }
    } catch (error) {
      logError('[SparkWallet] Failed to load Lightning address:', error);
      throw error;
    }
  };

  /**
   * Register a Lightning address for this wallet
   */
  const registerLightningAddress = async (username: string, description?: string): Promise<LightningAddressInfo> => {
    try {
      const addressInfo = await breezWallet.registerLightningAddress(username, description);
      setStore('lightningAddress', addressInfo.lightningAddress);
      setStore('lightningAddressInfo', addressInfo);
      logInfo(`[SparkWallet] Lightning address registered: ${addressInfo.lightningAddress}`);
      return addressInfo;
    } catch (error) {
      logError('[SparkWallet] Failed to register Lightning address:', error);
      throw error;
    }
  };

  /**
   * Check if a Lightning address username is available
   */
  const checkLightningAddressAvailable = async (username: string): Promise<boolean> => {
    try {
      return await breezWallet.checkLightningAddressAvailable(username);
    } catch (error) {
      logError('[SparkWallet] Failed to check Lightning address availability:', error);
      throw error;
    }
  };

  /**
   * Delete the Lightning address for this wallet
   */
  const deleteLightningAddress = async (): Promise<void> => {
    try {
      await breezWallet.deleteLightningAddress();
      setStore('lightningAddress', undefined);
      setStore('lightningAddressInfo', undefined);
      logInfo('[SparkWallet] Lightning address deleted');
    } catch (error) {
      logError('[SparkWallet] Failed to delete Lightning address:', error);
      throw error;
    }
  };

  /**
   * Enable backup to Nostr relays
   */
  const enableBackup = async (): Promise<void> => {
    if (!account?.publicKey || !account.activeRelays) {
      throw new Error('No account or relays available for backup');
    }

    try {
      logInfo('[SparkWallet] Enabling backup to Nostr relays...');

      const seed = await loadEncryptedSeed(account.publicKey);
      if (!seed) {
        throw new Error('No wallet seed found');
      }

      await publishBackup(seed, account.activeRelays, account.publicKey);

      setStore('hasBackup', true);
      setStore('lastBackupSync', new Date());

      logInfo('[SparkWallet] Backup enabled');
    } catch (error) {
      logError('[SparkWallet] Failed to enable backup:', error);
      throw error;
    }
  };

  /**
   * Disable backup (publish empty event)
   */
  const disableBackup = async (): Promise<void> => {
    // For now, we'll just update local state
    // In the future, we might want to delete the backup from relays
    setStore('hasBackup', false);
    setStore('lastBackupSync', undefined);
    logInfo('[SparkWallet] Backup disabled');
  };

  /**
   * Sync backup to relays
   */
  const syncBackupToRelays = async (): Promise<void> => {
    if (!account?.publicKey || !account.activeRelays) {
      throw new Error('No account or relays available');
    }

    try {
      await syncToRelays(account.activeRelays, account.publicKey);
      setStore('hasBackup', true);
      setStore('lastBackupSync', new Date());
      logInfo('[SparkWallet] Backup synced to relays');
    } catch (error) {
      logError('[SparkWallet] Failed to sync backup to relays:', error);
      throw error;
    }
  };

  /**
   * Sync backup from relays
   */
  const syncBackupFromRelays = async (overwrite: boolean = false): Promise<boolean> => {
    if (!account?.publicKey || !account.activeRelays) {
      throw new Error('No account or relays available');
    }

    try {
      logInfo('[SparkWallet] Starting sync from relays...', {
        pubkey: account.publicKey.slice(0, 8),
        relayCount: account.activeRelays.length,
        overwrite
      });

      const success = await syncFromRelays(account.activeRelays, account.publicKey, overwrite);

      logInfo('[SparkWallet] Sync from relays result:', success);

      if (success) {
        setStore('hasBackup', true);
        setStore('lastBackupSync', new Date());
        logInfo('[SparkWallet] Backup synced from relays');
      } else {
        logWarning('[SparkWallet] No backup found on relays');
      }

      return success;
    } catch (error) {
      logError('[SparkWallet] Failed to sync backup from relays:', error);
      return false;
    }
  };

  /**
   * Check backup status on relays
   */
  const checkBackupStatus = async (): Promise<boolean> => {
    if (!account?.publicKey || !account.activeRelays) {
      return false;
    }

    try {
      const backupExists = await hasBackup(account.activeRelays, account.publicKey);
      setStore('hasBackup', backupExists);
      return backupExists;
    } catch (error) {
      logError('[SparkWallet] Failed to check backup status:', error);
      return false;
    }
  };

  /**
   * Update configuration
   */
  const updateConfig = (configUpdate: Partial<SparkWalletConfig>): void => {
    if (!account?.publicKey) return;

    const currentConfig = store.config || {
      isConfigured: true,
      network: store.network,
      createdAt: Date.now(),
    };

    const updatedConfig: SparkWalletConfig = {
      ...currentConfig,
      ...configUpdate,
    };

    saveSparkConfig(account.publicKey, updatedConfig);
    setStore('config', updatedConfig);
  };

  /**
   * Set up event listener for SDK events
   */
  const setupEventListener = async (): Promise<void> => {
    try {
      eventListenerId = await breezWallet.addEventListener((event) => {
        switch (event.type) {
          case 'synced':
          case 'dataSynced':
            // Refresh balance on sync events
            refreshBalance().catch(error => {
              logError('[SparkWallet] Failed to refresh balance on event:', error);
            });

            // Reload payment history
            loadPaymentHistory().catch(error => {
              logError('[SparkWallet] Failed to reload payment history:', error);
            });
            break;

          case 'paymentSucceeded':
            logInfo('[SparkWallet] paymentSucceeded event received');

            // Refresh balance and history
            refreshBalance().catch(error => {
              logError('[SparkWallet] Failed to refresh balance on event:', error);
            });

            loadPaymentHistory().catch(error => {
              logError('[SparkWallet] Failed to reload payment history:', error);
            });

            // Check if this was an incoming payment and publish zap receipt
            if (event.payment && account?.activeRelays && account.publicKey) {
              const payment = event.payment;
              logInfo(`[SparkWallet] Payment type: ${payment.paymentType}, amount: ${payment.amount}`);

              if (payment.paymentType === 'receive') {
                // Store the last received payment for UI notifications
                const invoice = payment.details?.type === 'lightning' ? payment.details.invoice : undefined;

                // Get amount in sats (SDK Payment type uses 'amount' field)
                const amountSats = Number(payment.amount) || 0;

                if (invoice) {
                  setStore('lastReceivedPayment', {
                    invoice,
                    amount: amountSats,
                    timestamp: payment.timestamp,
                  });
                  logInfo(`[SparkWallet] Received payment for invoice: ${amountSats} sats`);

                  // Trigger zap animation for incoming payment
                  zapNotification?.actions.triggerZapAnimation({
                    amount: amountSats,
                    direction: 'incoming',
                    timestamp: payment.timestamp,
                  });
                }

                handleIncomingZap(
                  {
                    id: payment.id,
                    amount: amountSats,
                    fees: Number(payment.fees) || 0,
                    paymentType: 'receive',
                    status: payment.status,
                    timestamp: payment.timestamp,
                    description: payment.details?.type === 'lightning' ? payment.details.description : undefined,
                    invoice: payment.details?.type === 'lightning' ? payment.details.invoice : undefined,
                    preimage: payment.details?.type === 'lightning' ? payment.details.preimage : undefined,
                    paymentHash: payment.details?.type === 'lightning' ? payment.details.paymentHash : undefined,
                  },
                  account.activeRelays,
                  account.publicKey
                ).catch(error => {
                  logWarning('[SparkWallet] Failed to handle incoming zap:', error);
                });
              } else if (payment.paymentType === 'send') {
                // Outgoing payment confirmed
                const amountSats = Number(payment.amount) || 0;
                logInfo(`[SparkWallet] Sent payment confirmed: ${amountSats} sats`);

                // Note: Animation is triggered immediately on button click in NoteFooter,
                // not here when payment is confirmed
              }
            }
            break;

          case 'paymentFailed':
          case 'claimedDeposits':
            // Refresh balance on these events
            refreshBalance().catch(error => {
              logError('[SparkWallet] Failed to refresh balance on event:', error);
            });

            // Reload payment history
            loadPaymentHistory().catch(error => {
              logError('[SparkWallet] Failed to reload payment history:', error);
            });
            break;
        }
      });

      logInfo('[SparkWallet] Event listener set up');
    } catch (error) {
      logError('[SparkWallet] Failed to set up event listener:', error);
    }
  };

  /**
   * Cleanup on unmount
   */
  onCleanup(async () => {
    if (eventListenerId) {
      try {
        await breezWallet.removeEventListener(eventListenerId);
      } catch (error) {
        logError('[SparkWallet] Failed to remove event listener:', error);
      }
    }
  });

  /**
   * Set display currency preference
   */
  const setDisplayCurrency = (currency: string) => {
    setStore('displayCurrency', currency);
    try {
      localStorage.setItem('spark_display_currency', currency);
    } catch (error) {
      logError('[SparkWallet] Failed to save currency preference:', error);
    }
  };

  /**
   * Toggle balance visibility
   */
  const toggleBalanceVisibility = () => {
    const newVisibility = !store.isBalanceHidden;
    setStore('isBalanceHidden', newVisibility);
    try {
      localStorage.setItem('spark_balance_hidden', String(newVisibility));
    } catch (error) {
      logError('[SparkWallet] Failed to save balance visibility preference:', error);
    }
  };

  /**
   * Mark the current payment notification as shown to prevent re-display
   */
  const markPaymentNotificationShown = () => {
    if (store.lastReceivedPayment) {
      setStore('lastReceivedPayment', {
        ...store.lastReceivedPayment,
        notificationShown: true,
      });
    }
  };

  /**
   * Enable Spark wallet for zaps
   */
  const enableWallet = () => {
    setStore('isEnabled', true);

    // If wallet is already connected, set it as active
    if (store.isConnected && account?.actions.setActiveWalletType) {
      account.actions.setActiveWalletType('breez');
      logInfo('[SparkWallet] Set Breez as active wallet');
    }

    try {
      localStorage.setItem('spark_wallet_enabled', 'true');
      logInfo('[SparkWallet] Wallet enabled');
    } catch (error) {
      logError('[SparkWallet] Failed to save enabled state:', error);
    }
  };

  /**
   * Disable Spark wallet for zaps
   */
  const disableWallet = () => {
    setStore('isEnabled', false);

    // Clear active wallet type so NWC can be used
    if (account?.actions.setActiveWalletType) {
      account.actions.setActiveWalletType(null);
      logInfo('[SparkWallet] Cleared active wallet type to allow NWC');
    }

    try {
      localStorage.setItem('spark_wallet_enabled', 'false');
      logInfo('[SparkWallet] Wallet disabled');
    } catch (error) {
      logError('[SparkWallet] Failed to save disabled state:', error);
    }
  };

  // Actions object
  const actions: SparkWalletActions = {
    connect,
    disconnect,
    enableWallet,
    disableWallet,
    refreshBalance,
    syncWallet,
    sendPayment,
    createInvoice,
    loadPaymentHistory,
    loadMorePayments,
    loadLightningAddress,
    registerLightningAddress,
    checkLightningAddressAvailable,
    deleteLightningAddress,
    enableBackup,
    disableBackup,
    syncBackupToRelays,
    syncBackupFromRelays,
    checkBackupStatus,
    setHasBackup: (value: boolean) => setStore('hasBackup', value),
    updateConfig,
    setDisplayCurrency,
    toggleBalanceVisibility,
    markPaymentNotificationShown,
  };

  return (
    <SparkWalletContext.Provider value={{ store, actions }}>
      {props.children}
    </SparkWalletContext.Provider>
  );
};

export const useSparkWallet = () => {
  const context = useContext(SparkWalletContext);
  if (!context) {
    throw new Error('useSparkWallet must be used within SparkWalletProvider');
  }
  return context;
};
