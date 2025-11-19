import { encrypt44, decrypt44, signEvent, getPublicKey } from '../nostrAPI';
import { logError, logInfo, logWarning } from '../logger';
import { Relay } from '../nTools';
import { NostrRelaySignedEvent } from '../../types/primal';
import { loadEncryptedSeed, saveEncryptedSeed, loadSparkConfig, saveSparkConfig, SparkWalletConfig } from './sparkStorage';
import { subsTo } from '../../sockets';
import { APP_ID } from '../../App';

/**
 * Spark Wallet Backup System
 *
 * Implements NIP-78 (Application-specific data) for multi-device wallet sync.
 * Uses kind 30078 parameterized replaceable events to store encrypted wallet backups
 * on Nostr relays.
 *
 * Encryption: NIP-44 (modern Nostr encryption standard)
 * Event Kind: 30078 (Application-specific data)
 * d-tag: "spark-wallet-backup" (unique identifier)
 */

const BACKUP_EVENT_KIND = 30078;
const BACKUP_D_TAG = 'spark-wallet-backup';
const BACKUP_VERSION = 'v1';

export type BackupData = {
  version: string;
  mnemonic: string; // BIP39 seed phrase
  config: SparkWalletConfig;
  createdAt: number;
  lastModified: number;
};

export type BackupEvent = {
  kind: typeof BACKUP_EVENT_KIND;
  tags: string[][];
  content: string; // NIP-44 encrypted BackupData JSON
  created_at: number;
};

/**
 * Create a backup event with encrypted wallet data
 * @param pubkey - User's Nostr public key
 * @param mnemonic - BIP39 mnemonic to backup
 * @param config - Wallet configuration
 * @returns Promise of unsigned backup event
 */
async function createBackupEvent(
  pubkey: string,
  mnemonic: string,
  config: SparkWalletConfig
): Promise<BackupEvent> {
  const backupData: BackupData = {
    version: BACKUP_VERSION,
    mnemonic,
    config,
    createdAt: config.createdAt,
    lastModified: Date.now(),
  };

  // Encrypt with NIP-44 (to self)
  const encryptedContent = await encrypt44(pubkey, JSON.stringify(backupData));

  const event: BackupEvent = {
    kind: BACKUP_EVENT_KIND,
    tags: [
      ['d', BACKUP_D_TAG], // Parameterized replaceable event identifier
      ['title', 'Spark Wallet Backup'],
      ['version', BACKUP_VERSION],
      ['client', 'primal-web-spark'],
    ],
    content: encryptedContent,
    created_at: Math.floor(Date.now() / 1000),
  };

  return event;
}

/**
 * Decrypt and parse backup event content
 * @param pubkey - User's Nostr public key
 * @param encryptedContent - NIP-44 encrypted content from backup event
 * @returns Decrypted backup data or null
 */
async function decryptBackupEvent(
  pubkey: string,
  encryptedContent: string
): Promise<BackupData | null> {
  try {
    const decrypted = await decrypt44(pubkey, encryptedContent);
    const backupData: BackupData = JSON.parse(decrypted);

    // Validate backup data structure
    if (!backupData.version || !backupData.mnemonic || !backupData.config) {
      logWarning('[SparkBackup] Invalid backup data structure');
      return null;
    }

    return backupData;
  } catch (error) {
    logError('[SparkBackup] Failed to decrypt backup event:', error);
    return null;
  }
}

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
    logInfo('[SparkBackup] Publishing wallet backup to relays...');

    // Get pubkey if not provided
    const userPubkey = pubkey || await getPublicKey();
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

    // Sign the event
    const signedEvent = await signEvent(backupEvent as any);
    if (!signedEvent) {
      throw new Error('Failed to sign backup event');
    }

    // Publish to all relays
    let successCount = 0;
    let failCount = 0;

    const publishPromises = relays.map(async (relay) => {
      try {
        await relay.connect();
        relay.publish(signedEvent);
        successCount++;
        logInfo(`[SparkBackup] Published to ${relay.url}`);
      } catch (error) {
        failCount++;
        logWarning(`[SparkBackup] Failed to publish to ${relay.url}:`, error);
      }
    });

    await Promise.all(publishPromises);

    if (successCount === 0) {
      throw new Error('Failed to publish backup to any relay');
    }

    // Update config to track backup
    config.encryptionVersion = BACKUP_VERSION;
    saveSparkConfig(userPubkey, config);

    logInfo(`[SparkBackup] Backup published successfully to ${successCount}/${relays.length} relays`);
  } catch (error) {
    logError('[SparkBackup] Failed to publish backup:', error);
    throw new Error(`Failed to publish wallet backup: ${error}`);
  }
}

/**
 * Fetch wallet backup from Nostr relays
 * @param relays - Relays to fetch from
 * @param pubkey - User's Nostr public key (optional, will fetch if not provided)
 * @returns Promise that resolves to backup data or null if not found
 */
export async function fetchBackup(
  relays: Relay[],
  pubkey?: string
): Promise<BackupData | null> {
  return new Promise(async (resolve) => {
    try {
      logInfo('[SparkBackup] Fetching wallet backup from relays...');

      // Get pubkey if not provided
      const userPubkey = pubkey || await getPublicKey();
      if (!userPubkey) {
        logWarning('[SparkBackup] Cannot fetch backup: No pubkey available');
        resolve(null);
        return;
      }

      const subId = `spark_backup_${APP_ID}`;
      let latestBackup: BackupData | null = null;
      let latestTimestamp = 0;

      // Subscribe to backup events
      const unsub = subsTo(subId, {
        onEvent: async (_, event: NostrRelaySignedEvent) => {
          if (event.kind !== BACKUP_EVENT_KIND) return;
          if (event.pubkey !== userPubkey) return;

          // Check for correct d-tag
          const dTag = event.tags.find(t => t[0] === 'd' && t[1] === BACKUP_D_TAG);
          if (!dTag) return;

          logInfo('[SparkBackup] Found backup event from relay');

          try {
            // Decrypt backup
            const backupData = await decryptBackupEvent(userPubkey, event.content);

            if (backupData && event.created_at > latestTimestamp) {
              latestBackup = backupData;
              latestTimestamp = event.created_at;
              logInfo(`[SparkBackup] Updated latest backup (timestamp: ${event.created_at})`);
            }
          } catch (error) {
            logWarning('[SparkBackup] Failed to decrypt backup event:', error);
          }
        },
        onEose: () => {
          unsub();

          if (latestBackup) {
            logInfo('[SparkBackup] Backup fetched successfully');
          } else {
            logInfo('[SparkBackup] No backup found on relays');
          }

          resolve(latestBackup);
        },
        onNotice: (notice) => {
          logWarning('[SparkBackup] Relay notice:', notice);
        }
      });

      // Request backup events from all relays
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

          logInfo(`[SparkBackup] Subscribed to ${relay.url}`);
        } catch (error) {
          logWarning(`[SparkBackup] Failed to subscribe to ${relay.url}:`, error);
        }
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        unsub();
        logWarning('[SparkBackup] Backup fetch timed out');
        resolve(latestBackup);
      }, 10000);

    } catch (error) {
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

    // Fetch backup from relays
    const backupData = await fetchBackup(relays, userPubkey);

    if (!backupData) {
      logWarning('[SparkBackup] No backup found to restore');
      return false;
    }

    // Validate backup version
    if (backupData.version !== BACKUP_VERSION) {
      logWarning(`[SparkBackup] Unsupported backup version: ${backupData.version}`);
      return false;
    }

    // Save to local storage
    await saveEncryptedSeed(backupData.mnemonic, userPubkey);
    saveSparkConfig(userPubkey, backupData.config);

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
    logInfo('[SparkBackup] Syncing wallet from relays...');

    const userPubkey = pubkey || await getPublicKey();
    if (!userPubkey) {
      throw new Error('Cannot sync: No pubkey available');
    }

    // Check if local wallet exists
    const localSeed = await loadEncryptedSeed(userPubkey);
    if (localSeed && !overwriteLocal) {
      logWarning('[SparkBackup] Local wallet already exists, use overwriteLocal=true to replace');
      return false;
    }

    // Restore from backup
    const success = await restoreFromBackup(relays, userPubkey);

    if (success) {
      logInfo('[SparkBackup] Sync from relays completed');
    }

    return success;
  } catch (error) {
    logError('[SparkBackup] Failed to sync from relays:', error);
    return false;
  }
}

/**
 * Delete backup from relays
 * Publishes an empty event to replace the backup
 * @param relays - Relays to delete from
 * @param pubkey - User's Nostr public key (optional, will fetch if not provided)
 */
export async function deleteBackup(
  relays: Relay[],
  pubkey?: string
): Promise<void> {
  try {
    logInfo('[SparkBackup] Deleting wallet backup from relays...');

    const userPubkey = pubkey || await getPublicKey();
    if (!userPubkey) {
      throw new Error('Cannot delete backup: No pubkey available');
    }

    // Create empty backup event to replace existing one
    const emptyEvent = {
      kind: BACKUP_EVENT_KIND,
      tags: [
        ['d', BACKUP_D_TAG],
        ['title', 'Deleted'],
        ['version', BACKUP_VERSION],
      ],
      content: '',
      created_at: Math.floor(Date.now() / 1000),
    };

    // Sign and publish
    const signedEvent = await signEvent(emptyEvent as any);
    if (!signedEvent) {
      throw new Error('Failed to sign delete event');
    }

    // Publish to all relays
    const publishPromises = relays.map(async (relay) => {
      try {
        await relay.connect();
        relay.publish(signedEvent);
        logInfo(`[SparkBackup] Deleted from ${relay.url}`);
      } catch (error) {
        logWarning(`[SparkBackup] Failed to delete from ${relay.url}:`, error);
      }
    });

    await Promise.all(publishPromises);

    logInfo('[SparkBackup] Backup deletion completed');
  } catch (error) {
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
