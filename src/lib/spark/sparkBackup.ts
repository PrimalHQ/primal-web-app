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

  // Try NIP-44 first, fall back to NIP-04 if not supported (like Jumble-Spark)
  let encryptedContent: string;
  let encryptionVersion: 'nip44' | 'nip04' = 'nip44';

  logInfo('[SparkBackup] Encrypting mnemonic...');
  try {
    logInfo('[SparkBackup] Attempting NIP-44 encryption...');
    // Add timeout to prevent indefinite hanging
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('NIP-44 encryption timeout')), 5000)
    );
    encryptedContent = await Promise.race([
      encrypt44(pubkey, JSON.stringify(backupData)),
      timeoutPromise
    ]);
    logInfo('[SparkBackup] ✓ NIP-44 encryption successful');
  } catch (nip44Error) {
    logWarning('[SparkBackup] NIP-44 not available, falling back to NIP-04:', nip44Error);
    encryptedContent = await encrypt(pubkey, JSON.stringify(backupData));
    encryptionVersion = 'nip04';
    logInfo('[SparkBackup] ✓ NIP-04 encryption successful (fallback)');
  }

  const event: BackupEvent = {
    kind: BACKUP_EVENT_KIND,
    tags: [
      ['d', BACKUP_D_TAG], // Parameterized replaceable event identifier
      ['title', 'Spark Wallet Backup'],
      ['version', BACKUP_VERSION],
      ['client', 'primal-web-spark'],
      ['encryption', encryptionVersion], // Track which encryption was used
    ],
    content: encryptedContent,
    created_at: Math.floor(Date.now() / 1000),
  };

  return event;
}

/**
 * Decrypt and parse backup event content
 * @param pubkey - User's Nostr public key
 * @param event - Backup event with encrypted content and encryption tag
 * @returns Decrypted backup data or null
 */
async function decryptBackupEvent(
  pubkey: string,
  event: NostrRelaySignedEvent
): Promise<BackupData | null> {
  try {
    // Detect encryption version from tags (default to nip04 for old backups)
    const encryptionTag = event.tags.find(t => t[0] === 'encryption');
    const encryptionVersion = encryptionTag?.[1] || 'nip04';

    logInfo(`[SparkBackup] Detected encryption version: ${encryptionVersion}`);

    // Decrypt using appropriate method
    let decrypted: string;
    if (encryptionVersion === 'nip44') {
      decrypted = await decrypt44(pubkey, event.content);
    } else {
      // Legacy NIP-04 backup
      logInfo('[SparkBackup] Found legacy NIP-04 backup, decrypting...');
      decrypted = await decrypt(pubkey, event.content);
    }

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
    console.log('[SparkBackup] 🚀 PUBLISHING WALLET BACKUP TO RELAYS...');
    logInfo('[SparkBackup] Publishing wallet backup to relays...');

    // Get pubkey if not provided
    const userPubkey = pubkey || await getPublicKey();
    console.log('[SparkBackup] Got pubkey:', userPubkey?.slice(0, 8));
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
    console.log('[SparkBackup] Created backup event:', {
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
    console.log('[SparkBackup] Signed event:', {
      id: signedEvent.id,
      pubkey: signedEvent.pubkey?.slice(0, 8),
      kind: signedEvent.kind,
      tags: signedEvent.tags,
      sig: signedEvent.sig?.slice(0, 16)
    });
    console.log('[SparkBackup] Full event for debugging:', JSON.stringify(signedEvent, null, 2));

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
        console.log(`[SparkBackup] 📡 Attempting to publish to ${url}...`);
        // Create new relay instance using RelayFactory
        const relay = new RelayFactory(url);
        relay.publishTimeout = 10000; // 10 second timeout (like Jumble-Spark)

        // Connect to relay
        console.log(`[SparkBackup] Connecting to ${url}...`);
        await relay.connect();
        console.log(`[SparkBackup] Connected to ${url}`);

        // Publish event and wait for OK message from relay
        console.log(`[SparkBackup] Publishing event to ${url}...`);
        await relay.publish(signedEvent);
        console.log(`[SparkBackup] Event published to ${url}`);

        // Success!
        successCount++;
        console.log(`[SparkBackup] ✓ SUCCESS: Published to ${url}`);
        logInfo(`[SparkBackup] ✓ Published to ${url}`);
      } catch (error: any) {
        failCount++;
        const errorMsg = error?.message || String(error);
        errors.push(`${url}: ${errorMsg}`);
        console.error(`[SparkBackup] ✗ FAILED to publish to ${url}:`, errorMsg);
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
 * @returns Promise that resolves to backup data or null if not found
 */
export async function fetchBackup(
  relays: Relay[],
  pubkey?: string
): Promise<BackupData | null> {
  return new Promise(async (resolve) => {
    try {
      console.log('[SparkBackup] 🔍 Fetching wallet backup from relays...');
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

      console.log(`[SparkBackup] Fetching from ${allRelayUrls.size} relays (including fallback relays)`);
      logInfo(`[SparkBackup] Fetching from ${allRelayUrls.size} relays (including fallback relays)`);

      let latestBackup: BackupData | null = null;
      let latestTimestamp = 0;
      let eoseCount = 0;
      const totalRelays = allRelayUrls.size;

      const filter = {
        kinds: [BACKUP_EVENT_KIND],
        authors: [userPubkey],
        '#d': [BACKUP_D_TAG],
      };

      console.log('[SparkBackup] Filter:', {
        kinds: filter.kinds,
        authors: [userPubkey.slice(0, 8)],
        '#d': filter['#d'],
      });

      // Request backup events from all relays using direct relay connections
      const relayPromises = Array.from(allRelayUrls).map(async (url) => {
        try {
          const relay = new RelayFactory(url);
          console.log(`[SparkBackup] 📡 Connecting to ${url}...`);
          await relay.connect();
          console.log(`[SparkBackup] ✓ Connected to ${url}`);

          return new Promise<void>((resolveRelay) => {
            const sub = relay.subscribe([filter], {
              onevent: async (event: any) => {
                console.log(`[SparkBackup] 📥 Received event from ${url}:`, {
                  kind: event.kind,
                  pubkey: event.pubkey?.slice(0, 8),
                  id: event.id,
                  tags: event.tags
                });

                try {
                  // Decrypt backup
                  const backupData = await decryptBackupEvent(userPubkey, event);

                  if (backupData && event.created_at > latestTimestamp) {
                    latestBackup = backupData;
                    latestTimestamp = event.created_at;
                    console.log(`[SparkBackup] ✅ Updated latest backup from ${url} (timestamp: ${event.created_at})`);
                    logInfo(`[SparkBackup] Updated latest backup (timestamp: ${event.created_at})`);
                  }
                } catch (error) {
                  console.error(`[SparkBackup] Failed to decrypt event from ${url}:`, error);
                  logWarning('[SparkBackup] Failed to decrypt backup event:', error);
                }
              },
              oneose: () => {
                console.log(`[SparkBackup] 🏁 EOSE from ${url}`);
                sub.close();
                eoseCount++;

                // Resolve when all relays have sent EOSE or we found a backup
                if (eoseCount >= totalRelays || latestBackup) {
                  resolveRelay();
                }
              }
            });

            // Timeout for this relay after 5 seconds
            setTimeout(() => {
              sub.close();
              console.log(`[SparkBackup] ⏱️ Timeout for ${url}`);
              resolveRelay();
            }, 5000);
          });
        } catch (error) {
          console.error(`[SparkBackup] ✗ Failed to query ${url}:`, error);
          logWarning(`[SparkBackup] Failed to subscribe to ${url}:`, error);
        }
      });

      // Wait for all relays to respond or timeout
      await Promise.all(relayPromises);

      if (latestBackup) {
        console.log('[SparkBackup] ✅ Backup fetched successfully!');
        logInfo('[SparkBackup] Backup fetched successfully');
      } else {
        console.log('[SparkBackup] ❌ No backup found on any relay');
        logInfo('[SparkBackup] No backup found on relays');
      }

      resolve(latestBackup);

    } catch (error) {
      console.error('[SparkBackup] ❌ Failed to fetch backup:', error);
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
    console.log('[SparkBackup] 🔄 syncFromRelays called', { overwriteLocal, relayCount: relays.length });
    logInfo('[SparkBackup] Syncing wallet from relays...');

    const userPubkey = pubkey || await getPublicKey();
    console.log('[SparkBackup] Got pubkey:', userPubkey?.slice(0, 8));
    if (!userPubkey) {
      throw new Error('Cannot sync: No pubkey available');
    }

    // Check if local wallet exists
    const localSeed = await loadEncryptedSeed(userPubkey);
    console.log('[SparkBackup] Local seed exists:', !!localSeed, 'overwriteLocal:', overwriteLocal);

    if (localSeed && !overwriteLocal) {
      logWarning('[SparkBackup] ⚠️ Local wallet already exists, use overwriteLocal=true to replace');
      return false;
    }

    console.log('[SparkBackup] ✓ Proceeding to fetch backup from relays...');

    // Restore from backup
    const success = await restoreFromBackup(relays, userPubkey);

    console.log('[SparkBackup] Restore from backup result:', success);

    if (success) {
      logInfo('[SparkBackup] ✅ Sync from relays completed');
    } else {
      logWarning('[SparkBackup] ❌ No backup found on relays');
    }

    return success;
  } catch (error) {
    console.error('[SparkBackup] ❌ Failed to sync from relays:', error);
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
