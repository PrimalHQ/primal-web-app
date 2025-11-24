import { encrypt, decrypt, encrypt44, decrypt44, signEvent, getPublicKey } from '../nostrAPI';
import { logError, logInfo, logWarning } from '../logger';
import { Relay, RelayFactory } from '../nTools';
import { NostrRelaySignedEvent } from '../../types/primal';
import { loadEncryptedSeed, saveEncryptedSeed, loadSparkConfig, saveSparkConfig, SparkWalletConfig } from './sparkStorage';
import { subsTo, sendMessage } from '../../sockets';
import { APP_ID } from '../../App';

/**
 * Spark Wallet Backup System
 *
 * Implements NIP-78 (Application-specific data) for multi-device wallet sync.
 * Uses kind 30078 parameterized replaceable events to store encrypted wallet backups
 * on Nostr relays.
 *
 * Encryption: NIP-04 (for compatibility with Sparkihonne and other clients)
 * Event Kind: 30078 (Application-specific data)
 * d-tag: "spark-wallet-backup" (unique identifier)
 */

const BACKUP_EVENT_KIND = 30078;
const BACKUP_D_TAG = 'spark-wallet-backup';
const BACKUP_VERSION = 2;

export type BackupData = {
  version: number;
  type: string;
  encryption: 'nip44' | 'nip04';
  pubkey: string;
  encryptedMnemonic: string;
  createdAt: number;
  createdBy: string;
};

// Legacy v1 format for backward compatibility
export type LegacyBackupData = {
  version: string;
  mnemonic: string;
  config: SparkWalletConfig;
  createdAt: number;
  lastModified: number;
};

export type BackupEvent = {
  kind: typeof BACKUP_EVENT_KIND;
  tags: string[][];
  content: string; // Encrypted mnemonic (v2) or encrypted BackupData JSON (v1/legacy)
  created_at: number;
};

/**
 * Create a backup event with encrypted wallet data (v2 format)
 * @param pubkey - User's Nostr public key
 * @param mnemonic - BIP39 mnemonic to backup
 * @param config - Wallet configuration (not used in v2, kept for compatibility)
 * @returns Promise of unsigned backup event
 */
async function createBackupEvent(
  pubkey: string,
  mnemonic: string,
  config: SparkWalletConfig
): Promise<BackupEvent> {
  // v2 format: Just encrypt the mnemonic directly (like Jumble-Spark)
  let encryptedMnemonic: string;
  let encryptionVersion: 'nip44' | 'nip04' = 'nip44';

  logInfo('[SparkBackup] Encrypting mnemonic (v2 format)...');
  try {
    logInfo('[SparkBackup] Attempting NIP-44 encryption...');
    // Add timeout to prevent indefinite hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('NIP-44 encryption timeout')), 5000)
    );
    encryptedMnemonic = await Promise.race([
      encrypt44(pubkey, mnemonic),
      timeoutPromise
    ]);
    logInfo('[SparkBackup] ✓ NIP-44 encryption successful');
  } catch (nip44Error) {
    logWarning('[SparkBackup] NIP-44 not available, falling back to NIP-04:', nip44Error);
    encryptedMnemonic = await encrypt(pubkey, mnemonic);
    encryptionVersion = 'nip04';
    logInfo('[SparkBackup] ✓ NIP-04 encryption successful (fallback)');
  }

  const event: BackupEvent = {
    kind: BACKUP_EVENT_KIND,
    tags: [
      ['d', BACKUP_D_TAG], // Parameterized replaceable event identifier
      ['title', 'Spark Wallet Backup'],
      ['version', String(BACKUP_VERSION)], // v2
      ['client', 'primal-web-spark'],
      ['encryption', encryptionVersion], // Track which encryption was used
    ],
    content: encryptedMnemonic, // Just the encrypted mnemonic, not JSON
    created_at: Math.floor(Date.now() / 1000),
  };

  return event;
}

/**
 * Decrypt and parse backup event content
 * Supports v2 (plain mnemonic), v1 (JSON with config), and Jumble/Sparkihonne formats
 * @param pubkey - User's Nostr public key
 * @param event - Backup event with encrypted content and encryption tag
 * @returns Mnemonic string or null
 */
async function decryptBackupEvent(
  pubkey: string,
  event: NostrRelaySignedEvent
): Promise<string | null> {
  try {
    // Check if this is a deleted backup event
    const deletedTag = event.tags.find(t => t[0] === 'deleted');
    if (deletedTag && deletedTag[1] === 'true') {
      logInfo('[SparkBackup] Event is marked as deleted, skipping...');
      return null;
    }

    // Check if content is empty (deletion marker)
    if (!event.content || event.content.trim() === '') {
      logInfo('[SparkBackup] Event has empty content (deleted), skipping...');
      return null;
    }

    // Detect version and encryption from tags
    const versionTag = event.tags.find(t => t[0] === 'version');
    const version = versionTag?.[1] || '1'; // Default to v1 for old backups
    const encryptionTag = event.tags.find(t => t[0] === 'encryption');
    const encryptionVersion = encryptionTag?.[1] || 'nip04';

    logInfo(`[SparkBackup] Detected version: ${version}, encryption: ${encryptionVersion}`);

    // Decrypt using appropriate method
    let decrypted: string;
    if (encryptionVersion === 'nip44') {
      decrypted = await decrypt44(pubkey, event.content);
    } else {
      logInfo('[SparkBackup] Using NIP-04 decryption...');
      decrypted = await decrypt(pubkey, event.content);
    }

    // v2 format: Plain mnemonic string (Primal v2, Jumble, Sparkihonne)
    const words = decrypted.trim().split(/\s+/);
    if (words.length >= 12 && words.length <= 24 && words.every(w => /^[a-z]+$/.test(w))) {
      logInfo(`[SparkBackup] Found v2 format backup (plain mnemonic, ${words.length} words)`);
      return decrypted.trim();
    }

    // v1 format: JSON with config (legacy Primal)
    try {
      const legacyData: LegacyBackupData = JSON.parse(decrypted);
      if (legacyData.version && legacyData.mnemonic && legacyData.config) {
        logInfo('[SparkBackup] Found legacy v1 format backup (JSON with config)');
        return legacyData.mnemonic;
      }
    } catch (jsonError) {
      // Not valid JSON
    }

    logWarning('[SparkBackup] Invalid backup data - not v1, v2, or valid mnemonic format');
    return null;
  } catch (error) {
    logError('[SparkBackup] Failed to decrypt backup event:', error);
    return null;
  }
}

// Big relays that accept all event kinds (NIP-78)
const BIG_RELAY_URLS = [
  'wss://relay.damus.io/',
  'wss://relay.nostr.band/',
  'wss://relay.primal.net/',
  'wss://nos.lol/'
];

/**
 * Publish wallet backup to Nostr relays
 * @param mnemonic - BIP39 mnemonic to backup
 * @param relays - Relays to publish to
 * @param pubkey - User's Nostr public key (optional, will fetch if not provided)
 * @returns Promise that resolves when backup is published
 */
export async function publishBackup(
  mnemonic: string,
  relays: Relay[],
  pubkey?: string
): Promise<void> {
  try {
    logInfo('[SparkBackup] 🚀 PUBLISHING WALLET BACKUP TO RELAYS...');
    logInfo('[SparkBackup] Publishing wallet backup to relays...');

    // Get pubkey if not provided
    const userPubkey = pubkey || await getPublicKey();
    logInfo('[SparkBackup] Got pubkey:', userPubkey?.slice(0, 8));
    if (!userPubkey) {
      throw new Error('Cannot publish backup: No pubkey available');
    }

    // Load current config
    const config = loadSparkConfig(userPubkey);
    if (!config) {
      throw new Error('Cannot publish backup: No wallet config found');
    }

    // Create backup event
    const backupEvent = await createBackupEvent(userPubkey, mnemonic, config);
    logInfo('[SparkBackup] Created backup event:', {
      kind: backupEvent.kind,
      tags: backupEvent.tags,
      contentLength: backupEvent.content.length,
      created_at: backupEvent.created_at
    });

    // Sign the event
    const signedEvent = await signEvent(backupEvent as any);
    if (!signedEvent) {
      throw new Error('Failed to sign backup event');
    }
    logInfo('[SparkBackup] Signed event:', {
      id: signedEvent.id,
      pubkey: signedEvent.pubkey?.slice(0, 8),
      kind: signedEvent.kind,
      tags: signedEvent.tags,
      sig: signedEvent.sig?.slice(0, 16)
    });
    logInfo('[SparkBackup] Full event for debugging:', JSON.stringify(signedEvent, null, 2));

    // Add big relays as fallbacks (they accept all event kinds)
    const allRelayUrls = new Set([
      ...relays.map(r => r.url),
      ...BIG_RELAY_URLS
    ]);

    logInfo(`[SparkBackup] Publishing to ${allRelayUrls.size} relays (including fallback relays)`);

    // Publish to all relays
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    const publishPromises = Array.from(allRelayUrls).map(async (url) => {
      try {
        logInfo(`[SparkBackup] 📡 Attempting to publish to ${url}...`);
        // Create new relay instance using RelayFactory
        const relay = new RelayFactory(url);
        relay.publishTimeout = 10000; // 10 second timeout (like Jumble-Spark)

        // Connect to relay
        logInfo(`[SparkBackup] Connecting to ${url}...`);
        await relay.connect();
        logInfo(`[SparkBackup] Connected to ${url}`);

        // Publish event and wait for OK message from relay
        logInfo(`[SparkBackup] Publishing event to ${url}...`);
        await relay.publish(signedEvent);
        logInfo(`[SparkBackup] Event published to ${url}`);

        // Success!
        successCount++;
        logInfo(`[SparkBackup] ✓ SUCCESS: Published to ${url}`);
        logInfo(`[SparkBackup] ✓ Published to ${url}`);
      } catch (error: any) {
        failCount++;
        const errorMsg = error?.message || String(error);
        errors.push(`${url}: ${errorMsg}`);
        logError(`[SparkBackup] ✗ FAILED to publish to ${url}:`, errorMsg);
        logWarning(`[SparkBackup] ✗ Failed to publish to ${url}:`, errorMsg);
      }
    });

    await Promise.all(publishPromises);

    if (successCount === 0) {
      logError('[SparkBackup] Failed to publish to any relay. Errors:', errors);
      throw new Error(`Failed to publish backup to any relay. Errors: ${errors.slice(0, 3).join('; ')}`);
    }

    // Update config to track backup
    config.encryptionVersion = BACKUP_VERSION;
    saveSparkConfig(userPubkey, config);

    logInfo(`[SparkBackup] Backup published successfully to ${successCount}/${allRelayUrls.size} relays`);
  } catch (error) {
    logError('[SparkBackup] Failed to publish backup:', error);
    throw new Error(`Failed to publish wallet backup: ${error}`);
  }
}

/**
 * Fetch wallet backup from Nostr relays
 * @param relays - Relays to fetch from
 * @param pubkey - User's Nostr public key (optional, will fetch if not provided)
 * @returns Promise that resolves to mnemonic string or null if not found
 */
export async function fetchBackup(
  relays: Relay[],
  pubkey?: string
): Promise<string | null> {
  return new Promise(async (resolve) => {
    try {
      logInfo('[SparkBackup] 🔍 Fetching wallet backup from relays...');
      logInfo('[SparkBackup] Fetching wallet backup from relays...');

      // Get pubkey if not provided
      const userPubkey = pubkey || await getPublicKey();
      if (!userPubkey) {
        logWarning('[SparkBackup] Cannot fetch backup: No pubkey available');
        resolve(null);
        return;
      }

      // Add big relays as fallbacks
      const allRelayUrls = new Set([
        ...relays.map(r => r.url),
        ...BIG_RELAY_URLS
      ]);

      logInfo(`[SparkBackup] Fetching from ${allRelayUrls.size} relays (including fallback relays)`);
      logInfo(`[SparkBackup] Fetching from ${allRelayUrls.size} relays (including fallback relays)`);

      let latestMnemonic: string | null = null;
      let latestTimestamp = 0;
      let eoseCount = 0;
      const totalRelays = allRelayUrls.size;

      const filter = {
        kinds: [BACKUP_EVENT_KIND],
        authors: [userPubkey],
        '#d': [BACKUP_D_TAG],
      };

      logInfo('[SparkBackup] Filter:', {
        kinds: filter.kinds,
        authors: [userPubkey.slice(0, 8)],
        '#d': filter['#d'],
      });

      // Request backup events from all relays using direct relay connections
      const relayPromises = Array.from(allRelayUrls).map(async (url) => {
        try {
          const relay = new RelayFactory(url);
          logInfo(`[SparkBackup] 📡 Connecting to ${url}...`);
          await relay.connect();
          logInfo(`[SparkBackup] ✓ Connected to ${url}`);

          return new Promise<void>((resolveRelay) => {
            const sub = relay.subscribe([filter], {
              onevent: async (event: any) => {
                logInfo(`[SparkBackup] 📥 Received event from ${url}:`, {
                  kind: event.kind,
                  pubkey: event.pubkey?.slice(0, 8),
                  id: event.id,
                  tags: event.tags
                });

                try {
                  // Decrypt backup - now returns just the mnemonic
                  const mnemonic = await decryptBackupEvent(userPubkey, event);

                  if (mnemonic && event.created_at > latestTimestamp) {
                    latestMnemonic = mnemonic;
                    latestTimestamp = event.created_at;
                    logInfo(`[SparkBackup] ✅ Updated latest backup from ${url} (timestamp: ${event.created_at})`);
                    logInfo(`[SparkBackup] Updated latest backup (timestamp: ${event.created_at})`);
                  }
                } catch (error) {
                  logError(`[SparkBackup] Failed to decrypt event from ${url}:`, error);
                  logWarning('[SparkBackup] Failed to decrypt backup event:', error);
                }
              },
              oneose: () => {
                logInfo(`[SparkBackup] 🏁 EOSE from ${url}`);
                sub.close();
                eoseCount++;

                // Resolve when all relays have sent EOSE or we found a backup
                if (eoseCount >= totalRelays || latestMnemonic) {
                  resolveRelay();
                }
              }
            });

            // Timeout for this relay after 5 seconds
            setTimeout(() => {
              sub.close();
              logInfo(`[SparkBackup] ⏱️ Timeout for ${url}`);
              resolveRelay();
            }, 5000);
          });
        } catch (error) {
          logError(`[SparkBackup] ✗ Failed to query ${url}:`, error);
          logWarning(`[SparkBackup] Failed to subscribe to ${url}:`, error);
        }
      });

      // Wait for all relays to respond or timeout
      await Promise.all(relayPromises);

      if (latestMnemonic) {
        logInfo('[SparkBackup] ✅ Backup fetched successfully!');
        logInfo('[SparkBackup] Backup fetched successfully');
      } else {
        logInfo('[SparkBackup] ❌ No backup found on any relay');
        logInfo('[SparkBackup] No backup found on relays');
      }

      resolve(latestMnemonic);

    } catch (error) {
      logError('[SparkBackup] ❌ Failed to fetch backup:', error);
      logError('[SparkBackup] Failed to fetch backup:', error);
      resolve(null);
    }
  });
}

/**
 * Restore wallet from backup
 * Fetches backup from relays and saves to local storage
 * @param relays - Relays to fetch from
 * @param pubkey - User's Nostr public key (optional, will fetch if not provided)
 * @returns Promise that resolves to true if restore succeeded
 */
export async function restoreFromBackup(
  relays: Relay[],
  pubkey?: string
): Promise<boolean> {
  try {
    logInfo('[SparkBackup] Starting wallet restore...');

    const userPubkey = pubkey || await getPublicKey();
    if (!userPubkey) {
      throw new Error('Cannot restore: No pubkey available');
    }

    // Fetch backup from relays - now returns mnemonic string
    const mnemonic = await fetchBackup(relays, userPubkey);

    if (!mnemonic) {
      logWarning('[SparkBackup] No backup found to restore');
      return false;
    }

    // Save to local storage
    await saveEncryptedSeed(mnemonic, userPubkey);

    // Create minimal config for v2 backups
    const config: SparkWalletConfig = {
      createdAt: Date.now(),
      encryptionVersion: String(BACKUP_VERSION),
    };
    saveSparkConfig(userPubkey, config);

    logInfo('[SparkBackup] Wallet restored successfully from backup');
    return true;

  } catch (error) {
    logError('[SparkBackup] Failed to restore wallet:', error);
    return false;
  }
}

/**
 * Sync local wallet to relays (publish current state)
 * Useful when switching devices or recovering from relay sync issues
 * @param relays - Relays to sync to
 * @param pubkey - User's Nostr public key (optional, will fetch if not provided)
 * @returns Promise that resolves when sync is complete
 */
export async function syncToRelays(
  relays: Relay[],
  pubkey?: string
): Promise<void> {
  try {
    logInfo('[SparkBackup] Syncing local wallet to relays...');

    const userPubkey = pubkey || await getPublicKey();
    if (!userPubkey) {
      throw new Error('Cannot sync: No pubkey available');
    }

    // Load local seed and config
    const mnemonic = await loadEncryptedSeed(userPubkey);
    if (!mnemonic) {
      throw new Error('Cannot sync: No local wallet found');
    }

    // Publish to relays
    await publishBackup(mnemonic, relays, userPubkey);

    logInfo('[SparkBackup] Sync to relays completed');
  } catch (error) {
    logError('[SparkBackup] Failed to sync to relays:', error);
    throw error;
  }
}

/**
 * Sync from relays to local storage (download latest backup)
 * Useful when switching devices or recovering wallet
 * @param relays - Relays to sync from
 * @param pubkey - User's Nostr public key (optional, will fetch if not provided)
 * @param overwriteLocal - If true, will overwrite local wallet even if it exists
 * @returns Promise that resolves to true if sync succeeded
 */
export async function syncFromRelays(
  relays: Relay[],
  pubkey?: string,
  overwriteLocal: boolean = false
): Promise<boolean> {
  try {
    logInfo('[SparkBackup] 🔄 syncFromRelays called', { overwriteLocal, relayCount: relays.length });
    logInfo('[SparkBackup] Syncing wallet from relays...');

    const userPubkey = pubkey || await getPublicKey();
    logInfo('[SparkBackup] Got pubkey:', userPubkey?.slice(0, 8));
    if (!userPubkey) {
      throw new Error('Cannot sync: No pubkey available');
    }

    // Check if local wallet exists
    const localSeed = await loadEncryptedSeed(userPubkey);
    logInfo('[SparkBackup] Local seed exists:', !!localSeed, 'overwriteLocal:', overwriteLocal);

    if (localSeed && !overwriteLocal) {
      logWarning('[SparkBackup] ⚠️ Local wallet already exists, use overwriteLocal=true to replace');
      return false;
    }

    logInfo('[SparkBackup] ✓ Proceeding to fetch backup from relays...');

    // Restore from backup
    const success = await restoreFromBackup(relays, userPubkey);

    logInfo('[SparkBackup] Restore from backup result:', success);

    if (success) {
      logInfo('[SparkBackup] ✅ Sync from relays completed');
    } else {
      logWarning('[SparkBackup] ❌ No backup found on relays');
    }

    return success;
  } catch (error) {
    logError('[SparkBackup] ❌ Failed to sync from relays:', error);
    logError('[SparkBackup] Failed to sync from relays:', error);
    return false;
  }
}

/**
 * Delete backup from relays
 * For parameterized replaceable events, we replace with an empty event
 * @param relays - Relays to delete from
 * @param pubkey - User's Nostr public key (optional, will fetch if not provided)
 */
export async function deleteBackup(
  relays: Relay[],
  pubkey?: string
): Promise<void> {
  try {
    logInfo('[SparkBackup] 🗑️ Deleting wallet backup from relays...');
    logInfo('[SparkBackup] Deleting wallet backup from relays...');

    const userPubkey = pubkey || await getPublicKey();
    if (!userPubkey) {
      throw new Error('Cannot delete backup: No pubkey available');
    }

    // Add big relays as fallbacks
    const allRelayUrls = new Set([
      ...relays.map(r => r.url),
      ...BIG_RELAY_URLS
    ]);

    // Create an empty/deleted backup event to replace the existing one
    // This works because kind 30078 is a parameterized replaceable event
    const deletionEvent = {
      kind: BACKUP_EVENT_KIND,
      tags: [
        ['d', BACKUP_D_TAG],
        ['deleted', 'true'], // Mark as deleted
      ],
      content: '', // Empty content signals deletion
      created_at: Math.floor(Date.now() / 1000),
    };

    logInfo('[SparkBackup] Signing deletion event...');
    const signedDeletion = await signEvent(deletionEvent as any);
    if (!signedDeletion) {
      throw new Error('Failed to sign deletion event');
    }

    logInfo('[SparkBackup] Publishing deletion event to relays...');

    // Publish deletion event to all relays
    let successCount = 0;
    const publishPromises = Array.from(allRelayUrls).map(async (url) => {
      try {
        const relay = new RelayFactory(url);
        relay.publishTimeout = 10000;
        await relay.connect();
        await relay.publish(signedDeletion);
        successCount++;
        logInfo(`[SparkBackup] ✓ Deletion published to ${url}`);
        logInfo(`[SparkBackup] Deletion published to ${url}`);
      } catch (error) {
        logError(`[SparkBackup] ✗ Failed to publish deletion to ${url}:`, error);
        logWarning(`[SparkBackup] Failed to publish deletion to ${url}:`, error);
      }
    });

    await Promise.all(publishPromises);

    logInfo(`[SparkBackup] ✅ Deletion event published to ${successCount}/${allRelayUrls.size} relays`);
    logInfo(`[SparkBackup] Backup deletion completed (${successCount}/${allRelayUrls.size} relays)`);
  } catch (error) {
    logError('[SparkBackup] ❌ Failed to delete backup:', error);
    logError('[SparkBackup] Failed to delete backup:', error);
    throw error;
  }
}

/**
 * Check if a backup exists on relays
 * @param relays - Relays to check
 * @param pubkey - User's Nostr public key (optional, will fetch if not provided)
 * @returns Promise that resolves to true if backup exists
 */
export async function hasBackup(
  relays: Relay[],
  pubkey?: string
): Promise<boolean> {
  try {
    const backupData = await fetchBackup(relays, pubkey);
    return backupData !== null;
  } catch (error) {
    logError('[SparkBackup] Failed to check for backup:', error);
    return false;
  }
}

/**
 * Get backup metadata without decrypting full content
 * Useful for showing backup status in UI
 * @param relays - Relays to check
 * @param pubkey - User's Nostr public key (optional, will fetch if not provided)
 * @returns Promise that resolves to backup metadata or null
 */
export async function getBackupMetadata(
  relays: Relay[],
  pubkey?: string
): Promise<{ timestamp: number; version: string } | null> {
  return new Promise(async (resolve) => {
    try {
      const userPubkey = pubkey || await getPublicKey();
      if (!userPubkey) {
        resolve(null);
        return;
      }

      const subId = `spark_backup_meta_${APP_ID}`;
      let latestTimestamp = 0;
      let latestVersion = '';

      const unsub = subsTo(subId, {
        onEvent: (_, event: NostrRelaySignedEvent) => {
          if (event.kind !== BACKUP_EVENT_KIND) return;
          if (event.pubkey !== userPubkey) return;

          const dTag = event.tags.find(t => t[0] === 'd' && t[1] === BACKUP_D_TAG);
          if (!dTag) return;

          if (event.created_at > latestTimestamp) {
            latestTimestamp = event.created_at;
            const versionTag = event.tags.find(t => t[0] === 'version');
            latestVersion = versionTag?.[1] || BACKUP_VERSION;
          }
        },
        onEose: () => {
          unsub();
          resolve(latestTimestamp > 0 ? { timestamp: latestTimestamp, version: latestVersion } : null);
        },
        onNotice: () => {}
      });

      for (const relay of relays) {
        try {
          await relay.connect();
          relay.subscribe(
            {
              kinds: [BACKUP_EVENT_KIND],
              authors: [userPubkey],
              '#d': [BACKUP_D_TAG],
            },
            subId
          );
        } catch (error) {
          // Silent fail for metadata check
        }
      }

      setTimeout(() => {
        unsub();
        resolve(latestTimestamp > 0 ? { timestamp: latestTimestamp, version: latestVersion } : null);
      }, 5000);

    } catch (error) {
      resolve(null);
    }
  });
}
