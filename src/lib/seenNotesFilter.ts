import { nip19 } from './nTools';
import { Kind } from '../constants';
import { sendEvent } from './notes';
import { subsTo, sendMessage } from '../sockets';
import { NostrEventContent, NostrRelaySignedEvent, NostrRelays } from '../types/primal';
import { logInfo, logWarning } from './logger';
import { Relay } from './nTools';
import { encrypt, decrypt } from './nostrAPI';

// Use the existing constant from constants.ts
export const SEEN_NOTES_FILTER_KIND = Kind.SeenNotesFilter;

// Bloom filter parameters optimized for 4KB max size
const BLOOM_FILTER_PARAMS = {
  n: 1000,        // max number of items
  m: 33548,       // number of bits (4193.5 bytes base64 encoded)
  k: 23,          // number of hash functions
};

interface SeenNotesFilterContent {
  oldFilter?: string;  // base64 encoded bloom filter
  newFilter: string;   // base64 encoded bloom filter
  timestamp: number;   // when this filter was created
}

export class BloomFilter {
  private bits: Uint8Array;
  private size: number;
  private hashCount: number;

  constructor(size: number = BLOOM_FILTER_PARAMS.m, hashCount: number = BLOOM_FILTER_PARAMS.k) {
    this.size = size;
    this.hashCount = hashCount;
    this.bits = new Uint8Array(Math.ceil(size / 8));
  }

  // Fast non-cryptographic hash functions for better performance
  private hash(data: string, seed: number): number {
    // Use FNV-1a hash algorithm for speed
    let hash = 2166136261 + seed;
    for (let i = 0; i < data.length; i++) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash) % this.size;
  }

  add(item: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      const index = this.hash(item, i);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      this.bits[byteIndex] |= (1 << bitIndex);
    }
  }

  contains(item: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      const index = this.hash(item, i);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      if ((this.bits[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }

  // Estimate current capacity usage
  estimateCapacity(): number {
    const setBits = this.bits.reduce((count, byte) => {
      let bits = 0;
      for (let i = 0; i < 8; i++) {
        if (byte & (1 << i)) bits++;
      }
      return count + bits;
    }, 0);
    
    // Estimate number of items based on bit density
    const expectedBitsSet = this.hashCount * BLOOM_FILTER_PARAMS.n * (1 - Math.exp(-this.hashCount * BLOOM_FILTER_PARAMS.n / this.size));
    return setBits / expectedBitsSet;
  }

  isNearCapacity(): boolean {
    return this.estimateCapacity() > 0.99;
  }

  toBase64(): string {
    return btoa(String.fromCharCode(...this.bits));
  }

  static fromBase64(base64: string): BloomFilter {
    const filter = new BloomFilter(BLOOM_FILTER_PARAMS.m, BLOOM_FILTER_PARAMS.k);
    const binaryString = atob(base64);
    filter.bits = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      filter.bits[i] = binaryString.charCodeAt(i);
    }
    return filter;
  }
}

export class SeenNotesManager {
  private oldFilter?: BloomFilter;
  private newFilter: BloomFilter;
  private pubkey: string;
  private lastFetchTime: number = 0;
  private viewTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private lastPublishedFilterHash?: string;
  private relays: Relay[];
  private relaySettings: NostrRelays;
  private shouldProxy: boolean;

  // Configurable timers
  private readonly VIEW_TIMEOUT = 3000; // 3 seconds to consider a note "seen"
  private readonly FETCH_INTERVAL = 30000; // 30 seconds between filter fetches

  constructor(
    pubkey: string, 
    relays: Relay[] = [], 
    relaySettings: NostrRelays = {}, 
    shouldProxy: boolean = false
  ) {
    this.pubkey = pubkey;
    this.relays = relays;
    this.relaySettings = relaySettings;
    this.shouldProxy = shouldProxy;
    this.newFilter = new BloomFilter(BLOOM_FILTER_PARAMS.m, BLOOM_FILTER_PARAMS.k);
  }

  async initialize(): Promise<void> {
    await this.fetchSeenNotesFilter();
    this.startPeriodicFetch();
  }

  private async fetchSeenNotesFilter(): Promise<void> {
    return new Promise((resolve) => {
      const subId = `seen_notes_filter_${Date.now()}`;
      
      const unsub = subsTo(subId, {
        onEvent: async (_, content) => {
          if (content && content.kind === SEEN_NOTES_FILTER_KIND && content.pubkey === this.pubkey) {
            try {
              // Decrypt the content using NIP-04
              const decryptedContent = await decrypt(this.pubkey, content.content);
              const filterData: SeenNotesFilterContent = JSON.parse(decryptedContent);
              
              // Load filters from the event
              if (filterData.oldFilter) {
                this.oldFilter = BloomFilter.fromBase64(filterData.oldFilter);
              }
              this.newFilter = BloomFilter.fromBase64(filterData.newFilter);
              
              this.lastFetchTime = Date.now();
              logInfo('Loaded seen notes filter from relay');
            } catch (error) {
              logWarning('Failed to parse seen notes filter:', error);
            }
          }
        },
        onEose: () => {
          unsub();
          resolve();
        }
      });

      // Request the replaceable event
      this.requestSeenNotesFilter(subId);
    });
  }

  private requestSeenNotesFilter(subId: string): void {
    const filter = {
      kinds: [SEEN_NOTES_FILTER_KIND],
      authors: [this.pubkey],
      limit: 1
    };
    
    sendMessage(JSON.stringify(["REQ", subId, filter]));
  }

  async shouldShowNote(noteId: string): Promise<boolean> {
    // Check if note ID is in either filter
    const inNewFilter = this.newFilter.contains(noteId);
    if (inNewFilter) return false;
    
    if (this.oldFilter) {
      const inOldFilter = this.oldFilter.contains(noteId);
      if (inOldFilter) return false;
    }
    
    return true;
  }

  markNoteInView(noteId: string): void {
    // Clear existing timeout for this note
    const existingTimeout = this.viewTimeouts.get(noteId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout to mark as seen after VIEW_TIMEOUT
    const timeout = setTimeout(() => {
      this.markNoteSeen(noteId);
      this.viewTimeouts.delete(noteId);
    }, this.VIEW_TIMEOUT);

    this.viewTimeouts.set(noteId, timeout);
  }

  markNoteOutOfView(noteId: string): void {
    // Cancel the timeout if note goes out of view
    const existingTimeout = this.viewTimeouts.get(noteId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.viewTimeouts.delete(noteId);
    }
  }

  private markNoteSeen(noteId: string): void {
    // Check if we need to rotate filters
    if (this.newFilter.isNearCapacity()) {
      logInfo('Rotating bloom filters - new filter at capacity');
      this.oldFilter = this.newFilter;
      this.newFilter = new BloomFilter(BLOOM_FILTER_PARAMS.m, BLOOM_FILTER_PARAMS.k);
    }

    this.newFilter.add(noteId);
    logInfo(`Marked note ${noteId} as seen`);
  }

  private startPeriodicFetch(): void {
    setInterval(async () => {
      await this.checkAndUpdateFilter();
    }, this.FETCH_INTERVAL);
  }

  private async checkAndUpdateFilter(): Promise<void> {
    // Fetch current filter from relay
    const currentFilterHash = await this.getCurrentFilterHash();
    
    // If filter hasn't changed and we have updates, publish new filter
    if (currentFilterHash === this.lastPublishedFilterHash && this.hasUnpublishedChanges()) {
      await this.publishSeenNotesFilter();
    } else if (currentFilterHash !== this.lastPublishedFilterHash) {
      // Filter changed on relay, re-fetch it
      await this.fetchSeenNotesFilter();
      this.lastPublishedFilterHash = currentFilterHash;
    }
  }

  private async getCurrentFilterHash(): Promise<string> {
    // This would fetch the current event and return its hash
    // Implementation depends on existing relay infrastructure
    return '';
  }

  private hasUnpublishedChanges(): boolean {
    // Check if we have new items in the filter that haven't been published
    return this.newFilter.estimateCapacity() > 0;
  }

  private async publishSeenNotesFilter(): Promise<void> {
    const filterContent: SeenNotesFilterContent = {
      newFilter: this.newFilter.toBase64(),
      timestamp: Date.now()
    };

    if (this.oldFilter) {
      filterContent.oldFilter = this.oldFilter.toBase64();
    }

    try {
      // Encrypt the content using NIP-04
      const encryptedContent = await encrypt(this.pubkey, JSON.stringify(filterContent));
      
      const event = {
        kind: SEEN_NOTES_FILTER_KIND,
        content: encryptedContent,
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Use the existing sendEvent infrastructure with proper parameters
      const { success, note } = await sendEvent(
        event, 
        this.relays, 
        this.relaySettings, 
        this.shouldProxy
      );
      
      if (success && note) {
        this.lastPublishedFilterHash = await this.hashEvent(note);
        logInfo('Published updated seen notes filter');
      }
    } catch (error) {
      logWarning('Failed to publish seen notes filter:', error);
    }
  }

  private async hashEvent(event: any): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(event));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  updateSettings(relays: Relay[], relaySettings: NostrRelays, shouldProxy: boolean): void {
    this.relays = relays;
    this.relaySettings = relaySettings;
    this.shouldProxy = shouldProxy;
  }

  // Public method to manually trigger a filter update
  async forceUpdate(): Promise<void> {
    await this.publishSeenNotesFilter();
  }

  // Get current filter statistics
  getStats() {
    return {
      newFilterCapacity: this.newFilter.estimateCapacity(),
      oldFilterExists: !!this.oldFilter,
      totalViewTimeouts: this.viewTimeouts.size,
      lastFetchTime: this.lastFetchTime,
    };
  }

  cleanup(): void {
    // Clear all pending timeouts
    this.viewTimeouts.forEach(timeout => clearTimeout(timeout));
    this.viewTimeouts.clear();
  }
}

// Integration helper functions
export function createSeenNotesManager(
  pubkey: string, 
  relays: Relay[] = [], 
  relaySettings: NostrRelays = {}, 
  shouldProxy: boolean = false
): SeenNotesManager {
  return new SeenNotesManager(pubkey, relays, relaySettings, shouldProxy);
}

export async function shouldShowNoteInFeed(noteId: string, manager: SeenNotesManager): Promise<boolean> {
  return await manager.shouldShowNote(noteId);
}
