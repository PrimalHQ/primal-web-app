import { logInfo, logWarning } from './logger';

// Bloom filter parameters optimized for 4KB max size
const BLOOM_FILTER_PARAMS = {
  n: 1000,        // max number of items
  m: 33548,       // number of bits (4193.5 bytes base64 encoded)
  k: 23,          // number of hash functions
};

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
    logInfo(`BloomFilter: Adding item "${item}" to filter`);
    for (let i = 0; i < this.hashCount; i++) {
      const index = this.hash(item, i);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      this.bits[byteIndex] |= (1 << bitIndex);
    }
    logInfo(`BloomFilter: Item "${item}" successfully added to filter`);
  }

  contains(item: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      const index = this.hash(item, i);
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      if ((this.bits[byteIndex] & (1 << bitIndex)) === 0) {
        logInfo(`BloomFilter: Item "${item}" NOT FOUND in filter`);
        return false;
      }
    }
    logInfo(`BloomFilter: Item "${item}" FOUND in filter`);
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
  private viewTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private lastSaveTime: number = 0;

  // localStorage keys
  private readonly OLD_FILTER_KEY: string;
  private readonly NEW_FILTER_KEY: string;
  private readonly METADATA_KEY: string;

  // Configurable timers
  private readonly VIEW_TIMEOUT = 1000; // 1 second to consider a note "seen" (reduced for testing)
  private readonly SAVE_INTERVAL = 5000; // 5 seconds between saves to localStorage
  private readonly FILTER_ROTATION_DAYS = 7; // Rotate filters every 7 days

  constructor(pubkey: string) {
    this.pubkey = pubkey;
    
    // Create localStorage keys specific to this user
    this.OLD_FILTER_KEY = `seen_notes_old_filter_${pubkey}`;
    this.NEW_FILTER_KEY = `seen_notes_new_filter_${pubkey}`;
    this.METADATA_KEY = `seen_notes_metadata_${pubkey}`;
    
    this.newFilter = new BloomFilter(BLOOM_FILTER_PARAMS.m, BLOOM_FILTER_PARAMS.k);
    
    logInfo(`SeenNotesManager: Initialized for pubkey ${pubkey}`);
    logInfo(`SeenNotesManager: Storage keys - old: ${this.OLD_FILTER_KEY}, new: ${this.NEW_FILTER_KEY}, metadata: ${this.METADATA_KEY}`);
  }

  async initialize(): Promise<void> {
    logInfo('SeenNotesManager: Starting initialization');
    this.loadFiltersFromStorage();
    this.startPeriodicSave();
    logInfo('SeenNotesManager: Initialization complete');
  }

  private loadFiltersFromStorage(): void {
    try {
      // Load the new filter
      const newFilterData = localStorage.getItem(this.NEW_FILTER_KEY);
      if (newFilterData) {
        this.newFilter = BloomFilter.fromBase64(newFilterData);
        logInfo('Loaded new seen notes filter from localStorage');
      }

      // Load the old filter if it exists
      const oldFilterData = localStorage.getItem(this.OLD_FILTER_KEY);
      if (oldFilterData) {
        this.oldFilter = BloomFilter.fromBase64(oldFilterData);
        logInfo('Loaded old seen notes filter from localStorage');
      }

      // Check if we need to rotate filters based on age
      this.checkFilterRotation();
    } catch (error) {
      logWarning('Failed to load seen notes filters from localStorage:', error);
      // Reset to clean state if loading fails
      this.newFilter = new BloomFilter(BLOOM_FILTER_PARAMS.m, BLOOM_FILTER_PARAMS.k);
      this.oldFilter = undefined;
    }
  }

  private checkFilterRotation(): void {
    try {
      const metadata = localStorage.getItem(this.METADATA_KEY);
      if (!metadata) return;

      const { newFilterCreated } = JSON.parse(metadata);
      const now = Date.now();
      const filterAge = now - newFilterCreated;
      const maxAge = this.FILTER_ROTATION_DAYS * 24 * 60 * 60 * 1000;

      if (filterAge > maxAge) {
        logInfo('Rotating filters due to age');
        this.rotateFilters();
      }
    } catch (error) {
      logWarning('Failed to check filter rotation:', error);
    }
  }

  private saveFiltersToStorage(): void {
    try {
      // Save the new filter
      localStorage.setItem(this.NEW_FILTER_KEY, this.newFilter.toBase64());
      
      // Save the old filter if it exists
      if (this.oldFilter) {
        localStorage.setItem(this.OLD_FILTER_KEY, this.oldFilter.toBase64());
      } else {
        localStorage.removeItem(this.OLD_FILTER_KEY);
      }

      // Save metadata
      const metadata = {
        newFilterCreated: this.getNewFilterCreationTime(),
        lastSaved: Date.now(),
      };
      localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
      
      this.lastSaveTime = Date.now();
      logInfo('Saved seen notes filters to localStorage');
    } catch (error) {
      logWarning('Failed to save seen notes filters to localStorage:', error);
    }
  }

  private getNewFilterCreationTime(): number {
    try {
      const metadata = localStorage.getItem(this.METADATA_KEY);
      if (metadata) {
        const { newFilterCreated } = JSON.parse(metadata);
        return newFilterCreated || Date.now();
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return Date.now();
  }

  private rotateFilters(): void {
    logInfo('Rotating bloom filters');
    this.oldFilter = this.newFilter;
    this.newFilter = new BloomFilter(BLOOM_FILTER_PARAMS.m, BLOOM_FILTER_PARAMS.k);
    
    // Update metadata with new creation time
    const metadata = {
      newFilterCreated: Date.now(),
      lastSaved: Date.now(),
    };
    localStorage.setItem(this.METADATA_KEY, JSON.stringify(metadata));
    
    this.saveFiltersToStorage();
  }

  async shouldShowNote(noteId: string): Promise<boolean> {
    logInfo(`SeenNotesManager: Checking if note "${noteId}" should be shown`);
    
    // Check if note ID is in either filter
    const inNewFilter = this.newFilter.contains(noteId);
    if (inNewFilter) {
      logInfo(`SeenNotesManager: Note "${noteId}" found in NEW filter - HIDING note`);
      return false;
    }
    
    if (this.oldFilter) {
      const inOldFilter = this.oldFilter.contains(noteId);
      if (inOldFilter) {
        logInfo(`SeenNotesManager: Note "${noteId}" found in OLD filter - HIDING note`);
        return false;
      }
    }
    
    logInfo(`SeenNotesManager: Note "${noteId}" NOT found in any filter - SHOWING note`);
    return true;
  }

  markNoteInView(noteId: string): void {
    logInfo(`SeenNotesManager: Note "${noteId}" came into view - starting ${this.VIEW_TIMEOUT}ms timer`);
    
    // Clear existing timeout for this note
    const existingTimeout = this.viewTimeouts.get(noteId);
    if (existingTimeout) {
      logInfo(`SeenNotesManager: Clearing existing timeout for note "${noteId}"`);
      clearTimeout(existingTimeout);
    }

    // Set new timeout to mark as seen after VIEW_TIMEOUT
    const timeout = setTimeout(() => {
      logInfo(`SeenNotesManager: Timeout expired for note "${noteId}" - marking as seen`);
      this.markNoteSeen(noteId);
      this.viewTimeouts.delete(noteId);
    }, this.VIEW_TIMEOUT);

    this.viewTimeouts.set(noteId, timeout);
    logInfo(`SeenNotesManager: Set timeout for note "${noteId}" (${this.viewTimeouts.size} total timeouts active)`);
  }

  markNoteOutOfView(noteId: string): void {
    logInfo(`SeenNotesManager: Note "${noteId}" went out of view`);
    
    // Cancel the timeout if note goes out of view
    const existingTimeout = this.viewTimeouts.get(noteId);
    if (existingTimeout) {
      logInfo(`SeenNotesManager: Cancelling timeout for note "${noteId}" (went out of view before timer expired)`);
      clearTimeout(existingTimeout);
      this.viewTimeouts.delete(noteId);
    } else {
      logInfo(`SeenNotesManager: No timeout found for note "${noteId}" when it went out of view`);
    }
  }

  private markNoteSeen(noteId: string): void {
    // Check if we need to rotate filters due to capacity
    if (this.newFilter.isNearCapacity()) {
      this.rotateFilters();
    }

    this.newFilter.add(noteId);
    logInfo(`Marked note ${noteId} as seen`);
    
    // Save immediately when marking notes as seen
    this.saveFiltersToStorage();
  }

  private startPeriodicSave(): void {
    setInterval(() => {
      // Only save if there have been changes and enough time has passed
      if (Date.now() - this.lastSaveTime > this.SAVE_INTERVAL) {
        this.saveFiltersToStorage();
      }
    }, this.SAVE_INTERVAL);
  }

  // Get current filter statistics
  getStats() {
    const metadata = localStorage.getItem(this.METADATA_KEY);
    let filterAge = 0;
    
    if (metadata) {
      try {
        const { newFilterCreated } = JSON.parse(metadata);
        filterAge = Date.now() - newFilterCreated;
      } catch (error) {
        // Ignore parsing errors
      }
    }

    return {
      newFilterCapacity: this.newFilter.estimateCapacity(),
      oldFilterExists: !!this.oldFilter,
      totalViewTimeouts: this.viewTimeouts.size,
      filterAge: filterAge,
      filterAgeDays: Math.floor(filterAge / (24 * 60 * 60 * 1000)),
      storageKeys: {
        oldFilter: this.OLD_FILTER_KEY,
        newFilter: this.NEW_FILTER_KEY,
        metadata: this.METADATA_KEY,
      },
    };
  }

  // Public method to manually trigger filter rotation
  rotateFiltersManually(): void {
    this.rotateFilters();
  }

  // Public method to clear all filters
  clearAllFilters(): void {
    logInfo('Clearing all seen notes filters');
    this.newFilter = new BloomFilter(BLOOM_FILTER_PARAMS.m, BLOOM_FILTER_PARAMS.k);
    this.oldFilter = undefined;
    
    // Clear from localStorage
    localStorage.removeItem(this.OLD_FILTER_KEY);
    localStorage.removeItem(this.NEW_FILTER_KEY);
    localStorage.removeItem(this.METADATA_KEY);
    
    logInfo('Cleared all seen notes filters from localStorage');
  }

  cleanup(): void {
    // Save current state before cleanup
    this.saveFiltersToStorage();
    
    // Clear all pending timeouts
    this.viewTimeouts.forEach(timeout => clearTimeout(timeout));
    this.viewTimeouts.clear();
  }
}

// Integration helper functions
export function createSeenNotesManager(pubkey: string): SeenNotesManager {
  return new SeenNotesManager(pubkey);
}

export async function shouldShowNoteInFeed(noteId: string, manager: SeenNotesManager): Promise<boolean> {
  return await manager.shouldShowNote(noteId);
}

// Debug helper functions - expose globally for testing
declare global {
  interface Window {
    debugSeenNotes: {
      clearAll: () => void;
      addNote: (noteId: string) => void;
      checkNote: (noteId: string) => Promise<boolean>;
      getStats: () => any;
      listStorage: () => void;
    };
  }
}

// Add debug functions to global window object
if (typeof window !== 'undefined') {
  window.debugSeenNotes = {
    clearAll: () => {
      const keys = Object.keys(localStorage).filter(key => key.includes('seen_notes'));
      keys.forEach(key => localStorage.removeItem(key));
      console.log('Cleared all seen notes data from localStorage:', keys);
    },
    addNote: (noteId: string) => {
      // This is a simplified test - in reality you'd need a manager instance
      console.log('To add a note, you need a manager instance. Use the Clear All Filters button in settings instead.');
    },
    checkNote: async (noteId: string) => {
      console.log('To check a note, you need a manager instance. Check browser console for shouldShowNote logs.');
      return true;
    },
    getStats: () => {
      const keys = Object.keys(localStorage).filter(key => key.includes('seen_notes'));
      const data: any = {};
      keys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          data[key] = value ? (key.includes('metadata') ? JSON.parse(value) : `${value.length} chars`) : null;
        } catch (e) {
          data[key] = 'Parse error';
        }
      });
      console.log('Seen notes localStorage data:', data);
      return data;
    },
    listStorage: () => {
      const keys = Object.keys(localStorage).filter(key => key.includes('seen_notes'));
      console.log('Seen notes localStorage keys:', keys);
      keys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`${key}:`, value?.slice(0, 100) + (value && value.length > 100 ? '...' : ''));
      });
    }
  };
  
  console.log('Debug functions available: window.debugSeenNotes.clearAll(), .getStats(), .listStorage()');
}
