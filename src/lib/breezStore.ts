import { encrypt, decrypt, getPublicKey } from './nostrAPI';
import { logError, logInfo, logWarning } from './logger';

/**
 * Breez Wallet Storage
 *
 * Secure storage for Breez wallet credentials using NIP-04 encryption.
 * The mnemonic seed is encrypted with the user's Nostr private key before storage.
 */

const BREEZ_SEED_KEY_PREFIX = 'breez_seed_';
const BREEZ_CONFIG_KEY = 'breez_config';

export type BreezWalletConfig = {
  isConfigured: boolean;
  network: 'mainnet' | 'regtest';
  createdAt: number;
  lud16?: string; // Lightning address if registered
};

/**
 * Get storage key for user's Breez seed
 */
function getSeedStorageKey(pubkey: string): string {
  return `${BREEZ_SEED_KEY_PREFIX}${pubkey}`;
}

/**
 * Get storage key for user's Breez config
 */
function getConfigStorageKey(pubkey: string): string {
  return `${BREEZ_CONFIG_KEY}_${pubkey}`;
}

/**
 * Save encrypted seed to localStorage
 * @param seed - BIP39 mnemonic seed phrase
 * @param pubkey - User's Nostr public key (used as encryption key identifier)
 * @returns Promise that resolves when save is complete
 */
export async function saveEncryptedSeed(
  seed: string,
  pubkey: string
): Promise<void> {
  try {
    logInfo('[BreezStore] Saving encrypted seed...');

    // Encrypt the seed using NIP-04 with the user's own public key
    // This means only the user's private key can decrypt it
    const encryptedSeed = await encrypt(pubkey, seed);

    // Store in localStorage
    const storageKey = getSeedStorageKey(pubkey);
    localStorage.setItem(storageKey, encryptedSeed);

    logInfo('[BreezStore] Seed saved successfully');
  } catch (error) {
    logError('[BreezStore] Failed to save encrypted seed:', error);
    throw new Error(`Failed to save Breez wallet seed: ${error}`);
  }
}

/**
 * Load and decrypt seed from localStorage
 * @param pubkey - User's Nostr public key
 * @returns Promise that resolves to the decrypted seed, or null if not found
 */
export async function loadEncryptedSeed(
  pubkey: string
): Promise<string | null> {
  try {
    const storageKey = getSeedStorageKey(pubkey);
    const encryptedSeed = localStorage.getItem(storageKey);

    if (!encryptedSeed) {
      logInfo('[BreezStore] No encrypted seed found');
      return null;
    }

    logInfo('[BreezStore] Loading encrypted seed...');

    // Decrypt the seed using NIP-04 with the user's private key
    const seed = await decrypt(pubkey, encryptedSeed);

    logInfo('[BreezStore] Seed loaded successfully');
    return seed;
  } catch (error) {
    logError('[BreezStore] Failed to load encrypted seed:', error);
    throw new Error(`Failed to load Breez wallet seed: ${error}`);
  }
}

/**
 * Clear stored seed from localStorage
 * @param pubkey - User's Nostr public key
 */
export function clearSeed(pubkey: string): void {
  try {
    const storageKey = getSeedStorageKey(pubkey);
    localStorage.removeItem(storageKey);
    logInfo('[BreezStore] Seed cleared');
  } catch (error) {
    logError('[BreezStore] Failed to clear seed:', error);
    throw error;
  }
}

/**
 * Check if a Breez wallet is configured for the user
 * @param pubkey - User's Nostr public key
 * @returns True if wallet is configured
 */
export function isBreezWalletConfigured(pubkey: string): boolean {
  const storageKey = getSeedStorageKey(pubkey);
  return localStorage.getItem(storageKey) !== null;
}

/**
 * Save Breez wallet configuration
 * @param pubkey - User's Nostr public key
 * @param config - Wallet configuration
 */
export function saveBreezConfig(
  pubkey: string,
  config: BreezWalletConfig
): void {
  try {
    const storageKey = getConfigStorageKey(pubkey);
    localStorage.setItem(storageKey, JSON.stringify(config));
    logInfo('[BreezStore] Config saved');
  } catch (error) {
    logError('[BreezStore] Failed to save config:', error);
    throw error;
  }
}

/**
 * Load Breez wallet configuration
 * @param pubkey - User's Nostr public key
 * @returns Wallet configuration or null if not found
 */
export function loadBreezConfig(
  pubkey: string
): BreezWalletConfig | null {
  try {
    const storageKey = getConfigStorageKey(pubkey);
    const configJson = localStorage.getItem(storageKey);

    if (!configJson) {
      return null;
    }

    return JSON.parse(configJson) as BreezWalletConfig;
  } catch (error) {
    logError('[BreezStore] Failed to load config:', error);
    return null;
  }
}

/**
 * Clear Breez wallet configuration
 * @param pubkey - User's Nostr public key
 */
export function clearBreezConfig(pubkey: string): void {
  try {
    const storageKey = getConfigStorageKey(pubkey);
    localStorage.removeItem(storageKey);
    logInfo('[BreezStore] Config cleared');
  } catch (error) {
    logError('[BreezStore] Failed to clear config:', error);
    throw error;
  }
}

/**
 * Clear all Breez wallet data for a user
 * @param pubkey - User's Nostr public key
 */
export function clearAllBreezData(pubkey: string): void {
  clearSeed(pubkey);
  clearBreezConfig(pubkey);
  logInfo('[BreezStore] All Breez data cleared');
}

/**
 * Validate mnemonic format (basic validation)
 * @param mnemonic - Mnemonic to validate
 * @returns True if format appears valid
 */
export function validateMnemonic(mnemonic: string): boolean {
  // Basic validation: check word count (should be 12, 15, 18, 21, or 24 words)
  const words = mnemonic.trim().split(/\s+/);
  const validWordCounts = [12, 15, 18, 21, 24];

  if (!validWordCounts.includes(words.length)) {
    logWarning(`[BreezStore] Invalid mnemonic word count: ${words.length}`);
    return false;
  }

  // Check that all words are lowercase alphanumeric
  for (const word of words) {
    if (!/^[a-z]+$/.test(word)) {
      logWarning(`[BreezStore] Invalid mnemonic word: ${word}`);
      return false;
    }
  }

  return true;
}

/**
 * Helper to check if user can restore a wallet
 * (checks if they have a Nostr key to encrypt/decrypt with)
 * @returns Promise that resolves to true if user can use Breez wallet
 */
export async function canUseBreezWallet(): Promise<boolean> {
  try {
    const pubkey = await getPublicKey();
    return !!pubkey;
  } catch (error) {
    logWarning('[BreezStore] User cannot use Breez wallet (no Nostr key)');
    return false;
  }
}

/**
 * Export wallet backup data (encrypted seed)
 * Useful for users who want to export their encrypted seed
 * @param pubkey - User's Nostr public key
 * @returns Encrypted seed string or null if not found
 */
export function exportEncryptedBackup(pubkey: string): string | null {
  const storageKey = getSeedStorageKey(pubkey);
  return localStorage.getItem(storageKey);
}

/**
 * Import wallet backup data (encrypted seed)
 * @param pubkey - User's Nostr public key
 * @param encryptedSeed - Encrypted seed string
 */
export function importEncryptedBackup(
  pubkey: string,
  encryptedSeed: string
): void {
  try {
    const storageKey = getSeedStorageKey(pubkey);
    localStorage.setItem(storageKey, encryptedSeed);
    logInfo('[BreezStore] Encrypted backup imported');
  } catch (error) {
    logError('[BreezStore] Failed to import backup:', error);
    throw error;
  }
}
