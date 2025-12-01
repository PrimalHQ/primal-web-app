#!/usr/bin/env tsx
/**
 * Standalone script to check for Spark wallet backups across Nostr relays
 *
 * Usage:
 *   npx tsx scripts/check-relay-backups.ts <nsec>
 *
 * This script will:
 * 1. Connect to multiple relays (user relays + big public relays)
 * 2. Search for NIP-78 wallet backup events (kind 30078)
 * 3. Display what's stored and which relays have it
 * 4. Download and decrypt the backup if found
 */

import { nip19, nip44, nip04, getPublicKey as nostrGetPublicKey, finalizeEvent, type Event, SimplePool } from 'nostr-tools';

// Big relays that accept all event kinds
const BIG_RELAY_URLS = [
  'wss://relay.damus.io/',
  'wss://relay.nostr.band/',
  'wss://relay.primal.net/',
  'wss://nos.lol/'
];

// Additional common relays to check
const COMMON_RELAY_URLS = [
  'wss://relay.snort.social/',
  'wss://nostr.wine/',
  'wss://relay.nostr.bg/',
  'wss://nostr.fmt.wiz.biz/'
];

interface BackupEvent extends Event {
  content: string;
  tags: string[][];
}

async function connectWebSocket(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Connection timeout to ${url}`));
    }, 5000);

    ws.onopen = () => {
      clearTimeout(timeout);
      resolve(ws);
    };

    ws.onerror = (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to connect to ${url}: ${error}`));
    };
  });
}

async function fetchBackupFromRelay(relayUrl: string, pubkey: string): Promise<BackupEvent | null> {
  let ws: WebSocket | null = null;

  try {
    console.log(`\n🔍 Checking ${relayUrl}...`);
    ws = await connectWebSocket(relayUrl);

    return await new Promise<BackupEvent | null>((resolve, reject) => {
      const subscriptionId = Math.random().toString(36).substring(7);
      let foundEvent: BackupEvent | null = null;

      const timeout = setTimeout(() => {
        if (ws) {
          ws.close();
        }
        resolve(foundEvent);
      }, 10000); // 10 second timeout

      ws!.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data[0] === 'EVENT' && data[1] === subscriptionId) {
            const backupEvent = data[2] as BackupEvent;
            console.log(`  ✅ Found backup event!`);
            console.log(`     Created: ${new Date(backupEvent.created_at * 1000).toLocaleString()}`);
            console.log(`     Event ID: ${backupEvent.id}`);
            console.log(`     Tags: ${JSON.stringify(backupEvent.tags)}`);
            foundEvent = backupEvent;
          } else if (data[0] === 'EOSE') {
            clearTimeout(timeout);
            if (ws) {
              ws.close();
            }
            resolve(foundEvent);
          }
        } catch (error) {
          console.error(`  ❌ Error parsing message:`, error);
        }
      };

      ws!.onerror = (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket error: ${error}`));
      };

      // Subscribe to NIP-78 wallet backup events
      const filter = {
        kinds: [30078],
        authors: [pubkey],
        '#d': ['spark-wallet-backup']
      };

      const subscribeMessage = JSON.stringify(['REQ', subscriptionId, filter]);
      ws!.send(subscribeMessage);
    });
  } catch (error: any) {
    console.log(`  ❌ ${error.message}`);
    return null;
  } finally {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }
}

async function decryptBackup(encryptedContent: string, privkey: string, pubkey: string, encryptionVersion?: string): Promise<string> {
  try {
    // Try NIP-44 first (default), then fall back to NIP-04
    if (encryptionVersion === 'nip04') {
      console.log('  Using NIP-04 decryption...');
      const decrypted = await nip04.decrypt(privkey, pubkey, encryptedContent);
      return decrypted;
    } else {
      // Try NIP-44 first
      try {
        console.log('  Trying NIP-44 decryption...');
        const conversationKey = nip44.v2.utils.getConversationKey(privkey, pubkey);
        const decrypted = nip44.v2.decrypt(encryptedContent, conversationKey);
        return decrypted;
      } catch (nip44Error) {
        // Fall back to NIP-04
        console.log('  NIP-44 failed, trying NIP-04...');
        const decrypted = await nip04.decrypt(privkey, pubkey, encryptedContent);
        return decrypted;
      }
    }
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Please provide an nsec private key');
    console.error('Usage: npx tsx scripts/check-relay-backups.ts <nsec>');
    process.exit(1);
  }

  const nsec = args[0];

  try {
    // Decode nsec to get private key
    const decoded = nip19.decode(nsec);
    if (decoded.type !== 'nsec') {
      throw new Error('Invalid nsec format');
    }

    const privkey = decoded.data as string;
    const pubkey = nostrGetPublicKey(privkey);
    const npub = nip19.npubEncode(pubkey);

    console.log('🔑 Public Key (hex):', pubkey);
    console.log('🔑 Public Key (npub):', npub);
    console.log('\n📡 Searching for Spark wallet backups across relays...');
    console.log('━'.repeat(60));

    // Combine all relay URLs
    const allRelayUrls = [...BIG_RELAY_URLS, ...COMMON_RELAY_URLS];

    const results: Array<{ relay: string; event: BackupEvent | null }> = [];

    // Check each relay
    for (const relayUrl of allRelayUrls) {
      const event = await fetchBackupFromRelay(relayUrl, pubkey);
      results.push({ relay: relayUrl, event });
    }

    console.log('\n' + '━'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('━'.repeat(60));

    const foundRelays = results.filter(r => r.event !== null);

    if (foundRelays.length === 0) {
      console.log('❌ No backups found on any relay');
      return;
    }

    console.log(`\n✅ Found backups on ${foundRelays.length} relay(s):`);
    foundRelays.forEach(r => {
      console.log(`   • ${r.relay}`);
    });

    // Try to decrypt the first backup found
    const firstBackup = foundRelays[0];
    if (firstBackup.event) {
      console.log('\n━'.repeat(60));
      console.log('🔓 DECRYPTING BACKUP');
      console.log('━'.repeat(60));
      console.log(`Relay: ${firstBackup.relay}`);
      console.log(`Event ID: ${firstBackup.event.id}`);
      console.log(`Created: ${new Date(firstBackup.event.created_at * 1000).toLocaleString()}`);

      // Detect encryption version from tags
      const encryptionTag = firstBackup.event.tags.find(tag => tag[0] === 'encryption');
      const encryptionVersion = encryptionTag?.[1] || 'unknown';
      console.log(`Encryption version: ${encryptionVersion}`);
      console.log(`\nEncrypted content (first 100 chars):\n${firstBackup.event.content.substring(0, 100)}...`);

      try {
        const decrypted = await decryptBackup(firstBackup.event.content, privkey, pubkey, encryptionVersion);
        console.log(`\n✅ Decrypted successfully!`);
        console.log('\n📄 Backup Contents:');
        console.log('━'.repeat(60));

        // Try to parse as JSON
        try {
          const parsed = JSON.parse(decrypted);
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          // Not JSON, show as plain text
          console.log(decrypted);
        }

        // Save to file
        const timestamp = Date.now();
        const filename = `/Users/daniel/Downloads/spark-backup-${pubkey.slice(0, 8)}-${timestamp}.json`;
        await Bun.write(filename, decrypted);
        console.log(`\n💾 Backup saved to: ${filename}`);

      } catch (error: any) {
        console.error(`\n❌ Decryption failed: ${error.message}`);
      }
    }

    // Show event differences if multiple backups found
    if (foundRelays.length > 1) {
      console.log('\n━'.repeat(60));
      console.log('🔍 EVENT COMPARISON');
      console.log('━'.repeat(60));

      const events = foundRelays.map(r => r.event!);
      const uniqueEventIds = new Set(events.map(e => e.id));

      if (uniqueEventIds.size === 1) {
        console.log('✅ All relays have the SAME backup event');
      } else {
        console.log(`⚠️  Found ${uniqueEventIds.size} DIFFERENT backup events across relays:`);
        events.forEach((event, i) => {
          console.log(`\n${foundRelays[i].relay}:`);
          console.log(`  Event ID: ${event.id}`);
          console.log(`  Created: ${new Date(event.created_at * 1000).toLocaleString()}`);
          console.log(`  Content length: ${event.content.length} chars`);
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
