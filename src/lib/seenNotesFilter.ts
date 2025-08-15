import { nip19 } from './nTools';
import { Kind } from '../constants';
import { sendEvent } from './notes';
import { subsTo } from '../sockets';
import { NostrEventContent, NostrRelaySignedEvent } from '../types/primal';
import { logInfo, logWarning } from './logger';

// New replaceable event kind for seen notes filter
export const SEEN_NOTES_FILTER_KIND = 10042;

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

export class KeyedBloomFilter {
  private bits: Uint8Array;
  private size: number;
  private hashCount: number;
  private key: Uint8Array;

  constructor(size: number = BLOOM_FILTER_PARAMS.m, hashCount: number = BLOOM_FILTER_PARAMS.k, nsec?: string) {
    this.size = size;
    this.hashCount = hashCount;
    this.bits = new Uint8Array(Math.ceil(size / 8));
    
    // Derive key from nsec for privacy
    if (nsec) {
      const decoded = nip19.decode(nsec);
      if (decoded.type === 'nsec' && decoded.data) {
        // Use first 32 bytes of private key as hash key
        this.key = new Uint8Array(decoded.data);
      } else {
        throw new Error('Invalid nsec provided');
      }
    } else {
      // Fallback to random key (not recommended for production)
      this.key = crypto.getRandomValues(new Uint8Array(32));
    }
  }

  // HMAC-based hash function for privacy
  private async hash(data: string, seed: number): Promise<number> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      this.key,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const message = encoder.encode(data + seed.toString());
    const signature = await crypto.subtle.sign('HMAC', keyMaterial, message);
    const hashArray = new Uint8Array(signature);
    
    // Convert first 4 bytes to uint32
    let hash = 0;
    for (let i = 0; i < 4; i++) {
      hash = (hash << 8) | hashArray[i];
    }
    
    return Math.abs(hash) % this.size;
  }

  async add(item: string): Promise<void> {
    for (let i = 0; i < this.hashCount; i++) {
      const index = await this.hash(item, i);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      this.bits[byteIndex] |= (1 << bitIndex);
    }
  }

  async contains(item: string): Promise<boolean> {
    for (let i = 0; i < this.hashCount; i++) {
      const index = await this.hash(item, i);
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

  static fromBase64(base64: string, nsec: string): KeyedBloomFilter {
    const filter = new KeyedBloomFilter(BLOOM_FILTER_PARAMS.m, BLOOM_FILTER_PARAMS.k, nsec);
    const binaryString = atob(base64);
    filter.bits = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      filter.bits[i] = binaryString.charCodeAt(i);
    }
    return filter;
  }
}

export class SeenNotesManager {
  private oldFilter?: KeyedBloomFilter;
  private newFilter: KeyedBloomFilter;
  private nsec: string;
  private pubkey: string;
  private lastFetchTime: number = 0;
  private viewTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private lastPublishedFilterHash?: string;

  // Configurable timers
  private readonly VIEW_TIMEOUT = 3000; // 3 seconds to consider a note "seen"
  private readonly FETCH_INTERVAL = 30000; // 30 seconds between filter fetches

  constructor(nsec: string, pubkey: string) {
    this.nsec = nsec;
    this.pubkey = pubkey;
    this.newFilter = new KeyedBloomFilter(BLOOM_FILTER_PARAMS.m, BLOOM_FILTER_PARAMS.k, nsec);
  }

  async initialize(): Promise<void> {
    await this.fetchSeenNotesFilter();
    this.startPeriodicFetch();
  }

  private async fetchSeenNotesFilter(): Promise<void> {
    return new Promise((resolve) => {
      const subId = `seen_notes_filter_${Date.now()}`;
      
      const unsub = subsTo(subId, {
        onEvent: (_, content) => {
          if (content && content.kind === SEEN_NOTES_FILTER_KIND && content.pubkey === this.pubkey) {
            try {
              const filterData: SeenNotesFilterContent = JSON.parse(content.content);
              
              // Load filters from the event
              if (filterData.oldFilter) {
                this.oldFilter = KeyedBloomFilter.fromBase64(filterData.oldFilter, this.nsec);
              }
              this.newFilter = KeyedBloomFilter.fromBase64(filterData.newFilter, this.nsec);
              
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
    // This would need to be implemented in the existing feed/relay infrastructure
    // For now, showing the concept
    const filter = {
      kinds: [SEEN_NOTES_FILTER_KIND],
      authors: [this.pubkey],
      limit: 1
    };
    
    // Would use existing relay infrastructure to request this filter
    // sendMessage(JSON.stringify(["REQ", subId, filter]));
  }

  async shouldShowNote(noteId: string): Promise<boolean> {
    // Check if note ID is in either filter
    const inNewFilter = await this.newFilter.contains(noteId);
    if (inNewFilter) return false;
    
    if (this.oldFilter) {
      const inOldFilter = await this.oldFilter.contains(noteId);
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
    const timeout = setTimeout(async () => {
      await this.markNoteSeen(noteId);
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

  private async markNoteSeen(noteId: string): Promise<void> {
    // Check if we need to rotate filters
    if (this.newFilter.isNearCapacity()) {
      logInfo('Rotating bloom filters - new filter at capacity');
      this.oldFilter = this.newFilter;
      this.newFilter = new KeyedBloomFilter(BLOOM_FILTER_PARAMS.m, BLOOM_FILTER_PARAMS.k, this.nsec);
    }

    await this.newFilter.add(noteId);
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
      const event: any = {
        kind: SEEN_NOTES_FILTER_KIND,
        content: JSON.stringify(filterContent),
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
      };

      // This would use the existing sendEvent infrastructure
      const { success } = await sendEvent(event, false, [], {}); // placeholder parameters
      
      if (success) {
        this.lastPublishedFilterHash = await this.hashEvent(event);
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

  cleanup(): void {
    // Clear all pending timeouts
    this.viewTimeouts.forEach(timeout => clearTimeout(timeout));
    this.viewTimeouts.clear();
  }
}

// Integration helper functions
export function createSeenNotesManager(nsec: string, pubkey: string): SeenNotesManager {
  return new SeenNotesManager(nsec, pubkey);
}

export async function shouldShowNoteInFeed(noteId: string, manager: SeenNotesManager): Promise<boolean> {
  return await manager.shouldShowNote(noteId);
}
