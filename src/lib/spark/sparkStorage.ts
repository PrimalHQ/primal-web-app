import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { sha256 } from '@noble/hashes/sha256';
import { encrypt as nip04Encrypt, decrypt as nip04Decrypt, getPublicKey } from '../nostrAPI';
import { logError, logInfo, logWarning } from '../logger';

// Utility functions for hex/bytes conversion
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

// Random bytes generation using Web Crypto API
function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Spark Wallet Storage
 *
 * Secure storage using XChaCha20-Poly1305 authenticated encryption for local storage.
 * Backward compatible with NIP-04 encrypted seeds for migration.
 */

const SPARK_SEED_KEY_PREFIX = 'spark_seed_';
const SPARK_CONFIG_KEY = 'spark_config';
const SPARK_ENCRYPTION_VERSION = 'xchacha20poly1305_v1';

// XChaCha20-Poly1305 uses 24-byte nonce and 32-byte key
const NONCE_LENGTH = 24;
const KEY_LENGTH = 32;

export type SparkWalletConfig = {
  isConfigured: boolean;
  network: 'mainnet' | 'regtest';
  createdAt: number;
  lud16?: string; // Lightning address if registered
  encryptionVersion?: string; // Track encryption version
};

export type EncryptedData = {
  version: string;
  nonce: string; // hex encoded
  ciphertext: string; // hex encoded
};

/**
 * Derive encryption key from Nostr pubkey using SHA-256
 */
function deriveKey(pubkey: string): Uint8Array {
  const pubkeyBytes = hexToBytes(pubkey);
  return sha256(pubkeyBytes);
}

/**
 * Get storage key for user's Spark seed
 */
function getSeedStorageKey(pubkey: string): string {
  return `${SPARK_SEED_KEY_PREFIX}${pubkey}`;
}

/**
 * Get storage key for user's Spark config
 */
function getConfigStorageKey(pubkey: string): string {
  return `${SPARK_CONFIG_KEY}_${pubkey}`;
}

/**
 * Encrypt data using XChaCha20-Poly1305
 */
function encryptWithXChaCha(plaintext: string, key: Uint8Array): EncryptedData {
  const nonce = randomBytes(NONCE_LENGTH);
  const plaintextBytes = new TextEncoder().encode(plaintext);

  const cipher = xchacha20poly1305(key, nonce);
  const ciphertext = cipher.encrypt(plaintextBytes);

  return {
    version: SPARK_ENCRYPTION_VERSION,
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
}

/**
 * Decrypt data using XChaCha20-Poly1305
 */
function decryptWithXChaCha(encrypted: EncryptedData, key: Uint8Array): string {
  const nonce = hexToBytes(encrypted.nonce);
  const ciphertext = hexToBytes(encrypted.ciphertext);

  const cipher = xchacha20poly1305(key, nonce);
  const plaintext = cipher.decrypt(ciphertext);

  return new TextDecoder().decode(plaintext);
}

/**
 * Save encrypted seed to localStorage using XChaCha20-Poly1305
 * @param seed - BIP39 mnemonic seed phrase
 * @param pubkey - User's Nostr public key (used for key derivation)
 * @returns Promise that resolves when save is complete
 */
export async function saveEncryptedSeed(
  seed: string,
  pubkey: string
): Promise<void> {
  try {
    logInfo('[SparkStorage] Saving encrypted seed with XChaCha20-Poly1305...');

    // Derive encryption key from pubkey
    const key = deriveKey(pubkey);

    // Encrypt the seed
    const encrypted = encryptWithXChaCha(seed, key);

    // Store in localStorage as JSON
    const storageKey = getSeedStorageKey(pubkey);
    localStorage.setItem(storageKey, JSON.stringify(encrypted));

    // Update config to track encryption version
    const config = loadSparkConfig(pubkey);
    if (config) {
      config.encryptionVersion = SPARK_ENCRYPTION_VERSION;
      saveSparkConfig(pubkey, config);
    }

    logInfo('[SparkStorage] Seed saved successfully');
  } catch (error) {
    logError('[SparkStorage] Failed to save encrypted seed:', error);
    throw new Error(`Failed to save Spark wallet seed: ${error}`);
  }
}

/**
 * Load and decrypt seed from localStorage
 * Supports both XChaCha20 (new) and NIP-04 (legacy) for migration
 * @param pubkey - User's Nostr public key
 * @returns Promise that resolves to the decrypted seed, or null if not found
 */
export async function loadEncryptedSeed(
  pubkey: string
): Promise<string | null> {
  try {
    const storageKey = getSeedStorageKey(pubkey);
    const storedData = localStorage.getItem(storageKey);

    if (!storedData) {
      logInfo('[SparkStorage] No encrypted seed found');
      return null;
    }

    logInfo('[SparkStorage] Loading encrypted seed...');

    // Try to parse as JSON (XChaCha20 format)
    try {
      const encrypted: EncryptedData = JSON.parse(storedData);

      if (encrypted.version === SPARK_ENCRYPTION_VERSION) {
        // Modern XChaCha20-Poly1305 encryption
        const key = deriveKey(pubkey);
        const seed = decryptWithXChaCha(encrypted, key);
        logInfo('[SparkStorage] Seed loaded with XChaCha20-Poly1305');
        return seed;
      } else {
        logWarning(`[SparkStorage] Unknown encryption version: ${encrypted.version}`);
        throw new Error('Unknown encryption version');
      }
    } catch (jsonError) {
      // Not JSON, might be legacy NIP-04 format (plain string)
      logWarning('[SparkStorage] Attempting to decrypt as legacy NIP-04 format...');

      try {
        // Try NIP-04 decryption
        const seed = await nip04Decrypt(pubkey, storedData);
        logInfo('[SparkStorage] Seed loaded with legacy NIP-04');

        // Auto-migrate to XChaCha20
        logInfo('[SparkStorage] Auto-migrating to XChaCha20-Poly1305...');
        await saveEncryptedSeed(seed, pubkey);

        return seed;
      } catch (nip04Error) {
        logError('[SparkStorage] Failed to decrypt with NIP-04:', nip04Error);
        throw new Error('Failed to decrypt seed with any supported method');
      }
    }
  } catch (error) {
    logError('[SparkStorage] Failed to load encrypted seed:', error);
    throw new Error(`Failed to load Spark wallet seed: ${error}`);
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
    logInfo('[SparkStorage] Seed cleared');
  } catch (error) {
    logError('[SparkStorage] Failed to clear seed:', error);
    throw error;
  }
}

/**
 * Check if a Spark wallet is configured for the user
 * @param pubkey - User's Nostr public key
 * @returns True if wallet is configured
 */
export function isSparkWalletConfigured(pubkey: string): boolean {
  const storageKey = getSeedStorageKey(pubkey);
  return localStorage.getItem(storageKey) !== null;
}

/**
 * Save Spark wallet configuration
 * @param pubkey - User's Nostr public key
 * @param config - Wallet configuration
 */
export function saveSparkConfig(
  pubkey: string,
  config: SparkWalletConfig
): void {
  try {
    const storageKey = getConfigStorageKey(pubkey);
    localStorage.setItem(storageKey, JSON.stringify(config));
    logInfo('[SparkStorage] Config saved');
  } catch (error) {
    logError('[SparkStorage] Failed to save config:', error);
    throw error;
  }
}

/**
 * Load Spark wallet configuration
 * @param pubkey - User's Nostr public key
 * @returns Wallet configuration or null if not found
 */
export function loadSparkConfig(
  pubkey: string
): SparkWalletConfig | null {
  try {
    const storageKey = getConfigStorageKey(pubkey);
    const configJson = localStorage.getItem(storageKey);

    if (!configJson) {
      return null;
    }

    return JSON.parse(configJson) as SparkWalletConfig;
  } catch (error) {
    logError('[SparkStorage] Failed to load config:', error);
    return null;
  }
}

/**
 * Clear Spark wallet configuration
 * @param pubkey - User's Nostr public key
 */
export function clearSparkConfig(pubkey: string): void {
  try {
    const storageKey = getConfigStorageKey(pubkey);
    localStorage.removeItem(storageKey);
    logInfo('[SparkStorage] Config cleared');
  } catch (error) {
    logError('[SparkStorage] Failed to clear config:', error);
    throw error;
  }
}

/**
 * Clear all Spark wallet data for a user
 * @param pubkey - User's Nostr public key
 */
export function clearAllSparkData(pubkey: string): void {
  clearSeed(pubkey);
  clearSparkConfig(pubkey);
  logInfo('[SparkStorage] All Spark data cleared');
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
    logWarning(`[SparkStorage] Invalid mnemonic word count: ${words.length}`);
    return false;
  }

  // Check that all words are lowercase alphanumeric
  for (const word of words) {
    if (!/^[a-z]+$/.test(word)) {
      logWarning(`[SparkStorage] Invalid mnemonic word: ${word}`);
      return false;
    }
  }

  return true;
}

/**
 * Helper to check if user can restore a wallet
 * (checks if they have a Nostr key to encrypt/decrypt with)
 * @returns Promise that resolves to true if user can use Spark wallet
 */
export async function canUseSparkWallet(): Promise<boolean> {
  try {
    const pubkey = await getPublicKey();
    return !!pubkey;
  } catch (error) {
    logWarning('[SparkStorage] User cannot use Spark wallet (no Nostr key)');
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
 * @param encryptedData - Encrypted seed string (JSON format)
 */
export function importEncryptedBackup(
  pubkey: string,
  encryptedData: string
): void {
  try {
    // Validate it's valid JSON with required fields
    const data = JSON.parse(encryptedData);
    if (!data.version || !data.nonce || !data.ciphertext) {
      throw new Error('Invalid encrypted backup format');
    }

    const storageKey = getSeedStorageKey(pubkey);
    localStorage.setItem(storageKey, encryptedData);
    logInfo('[SparkStorage] Encrypted backup imported');
  } catch (error) {
    logError('[SparkStorage] Failed to import backup:', error);
    throw error;
  }
}

/**
 * Get encryption version for current wallet
 * @param pubkey - User's Nostr public key
 * @returns Encryption version string or null
 */
export function getEncryptionVersion(pubkey: string): string | null {
  const config = loadSparkConfig(pubkey);
  return config?.encryptionVersion || null;
}
