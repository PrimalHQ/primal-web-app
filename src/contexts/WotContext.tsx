/**
 * WoT Context - thin wrapper around nostr-wot-sdk/solid
 *
 * This module re-exports SDK functionality and provides app-specific
 * configuration (user pubkey fallback), caching, and batch fetching.
 */
import { createSignal, createEffect, onCleanup } from "solid-js";
import {
  WoTProvider as SdkWoTProvider,
  useWoTContext as useSdkWoTContext,
  useExtension as useSdkExtension,
  useWoTInstance,
  type WoTContextValue,
  type ExtensionState,
  type ExtensionConnectionState,
} from "nostr-wot-sdk/solid";
import { ContextChildren } from "../types/primal";
import { accountStore } from "../stores/accountStore";

// Re-export SDK hooks
export { useWoTInstance };
export type { WoTContextValue, ExtensionState, ExtensionConnectionState };

// ============================================
// WoT Cache and Batch Fetching
// ============================================

interface CachedWoTResult {
  distance: number | null;
  score: number;
  paths: number;
  commonFollows: string[];
  timestamp: number;
}

// Global cache - persists across component unmounts
const wotCache = new Map<string, CachedWoTResult>();
const pendingPubkeys = new Set<string>();
const subscribers = new Map<string, Set<() => void>>();
const failedPubkeys = new Map<string, { retries: number; nextRetry: number }>();

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;
// Batch fetch delay: 100ms to collect multiple requests
const BATCH_DELAY = 100;
// Retry settings
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 2000; // 2 seconds

let batchTimeout: ReturnType<typeof setTimeout> | null = null;
let retryTimeout: ReturnType<typeof setTimeout> | null = null;
let wotInstanceRef: any = null;

function isCacheValid(entry: CachedWoTResult): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

function notifySubscribers(pubkey: string) {
  const subs = subscribers.get(pubkey);
  if (subs) {
    subs.forEach((cb) => cb());
  }
}

async function executeBatchFetch() {
  if (!wotInstanceRef || pendingPubkeys.size === 0) return;

  const pubkeys = Array.from(pendingPubkeys);
  pendingPubkeys.clear();

  try {
    // Use batch API to get distances and scores
    const batchResults = await wotInstanceRef.batchCheck(pubkeys);

    // Fetch common follows for each (in parallel)
    const commonFollowsPromises = pubkeys.map(async (pk) => {
      try {
        return await wotInstanceRef.getCommonFollows(pk);
      } catch {
        return [];
      }
    });
    const commonFollowsResults = await Promise.all(commonFollowsPromises);

    // Update cache and notify subscribers, track failures
    pubkeys.forEach((pk, i) => {
      const result = batchResults.get(pk);
      if (result) {
        const details = {
          distance: result.distance,
          score: result.score,
          paths: 0, // batchCheck doesn't return paths, would need getDetails
          commonFollows: commonFollowsResults[i] || [],
          timestamp: Date.now(),
        };
        wotCache.set(pk, details);
        // Clear from failed tracking on success
        failedPubkeys.delete(pk);
        notifySubscribers(pk);
      } else {
        // Track failure for retry
        trackFailure(pk);
      }
    });

    // Schedule retry for failed pubkeys
    scheduleRetry();
  } catch (err) {
    console.error('WoT batch fetch error:', err);
    // On complete batch failure, track all pubkeys for retry
    pubkeys.forEach((pk) => trackFailure(pk));
    scheduleRetry();
  }
}

function trackFailure(pubkey: string) {
  const existing = failedPubkeys.get(pubkey);
  if (existing) {
    if (existing.retries < MAX_RETRIES) {
      existing.retries++;
      // Exponential backoff: 2s, 4s, 8s
      existing.nextRetry = Date.now() + BASE_RETRY_DELAY * Math.pow(2, existing.retries - 1);
    }
  } else {
    failedPubkeys.set(pubkey, {
      retries: 1,
      nextRetry: Date.now() + BASE_RETRY_DELAY,
    });
  }
}

function scheduleRetry() {
  if (retryTimeout) return;

  // Find the earliest retry time
  let earliestRetry = Infinity;
  failedPubkeys.forEach((info) => {
    if (info.retries <= MAX_RETRIES && info.nextRetry < earliestRetry) {
      earliestRetry = info.nextRetry;
    }
  });

  if (earliestRetry === Infinity) return;

  const delay = Math.max(0, earliestRetry - Date.now());
  retryTimeout = setTimeout(() => {
    retryTimeout = null;
    executeRetry();
  }, delay);
}

function executeRetry() {
  const now = Date.now();
  const toRetry: string[] = [];

  failedPubkeys.forEach((info, pk) => {
    if (info.retries <= MAX_RETRIES && info.nextRetry <= now) {
      toRetry.push(pk);
    }
  });

  if (toRetry.length > 0) {
    // Add to pending and trigger batch fetch
    toRetry.forEach((pk) => pendingPubkeys.add(pk));
    scheduleBatchFetch();
  }

  // Schedule next retry if there are more
  scheduleRetry();
}

function scheduleBatchFetch() {
  if (batchTimeout) return;
  batchTimeout = setTimeout(() => {
    batchTimeout = null;
    executeBatchFetch();
  }, BATCH_DELAY);
}

function requestWoTData(pubkey: string, callback: () => void): () => void {
  // Add subscriber
  if (!subscribers.has(pubkey)) {
    subscribers.set(pubkey, new Set());
  }
  subscribers.get(pubkey)!.add(callback);

  // Check cache
  const cached = wotCache.get(pubkey);
  if (cached && isCacheValid(cached)) {
    // Already have valid data, notify immediately
    queueMicrotask(callback);
  } else {
    // Add to pending and schedule batch
    pendingPubkeys.add(pubkey);
    scheduleBatchFetch();
  }

  // Return cleanup function
  return () => {
    const subs = subscribers.get(pubkey);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(pubkey);
      }
    }
  };
}

function getCachedWoT(pubkey: string): CachedWoTResult | null {
  const cached = wotCache.get(pubkey);
  if (cached && isCacheValid(cached)) {
    return cached;
  }
  return null;
}

// ============================================
// Exported Hooks and Components
// ============================================

/**
 * App-specific WoT Provider
 * Wraps SDK provider with user's pubkey as fallback
 */
export const WotProvider = (props: { children: ContextChildren }) => {
  return (
    <SdkWoTProvider
      options={{
        fallback: accountStore.publicKey ? { myPubkey: accountStore.publicKey } : undefined,
      }}
    >
      {props.children}
    </SdkWoTProvider>
  );
};

/**
 * Hook to access extension state
 */
export const useExtension = useSdkExtension;

/**
 * Hook to access full WoT context (SDK interface)
 */
export const useWoTContext = useSdkWoTContext;

/**
 * Compatibility hook for existing code
 */
export const useWotContext = () => {
  const ctx = useSdkWoTContext();

  return {
    get wot() { return ctx.wot(); },
    get isReady() { return ctx.isReady(); },
    get extensionState() { return ctx.extension.state(); },
    get isConnected() { return ctx.extension.isConnected(); },
  };
};

/**
 * Get current user's pubkey
 */
export const getMyPubkey = () => accountStore.publicKey;

/**
 * Hook to get cached WoT data for a pubkey with batch fetching
 */
export const useCachedWoT = (pubkey: () => string | undefined) => {
  const wotInstance = useWoTInstance();
  const extension = useSdkExtension();

  const [data, setData] = createSignal<CachedWoTResult | null>(null);
  const [loading, setLoading] = createSignal(true);

  createEffect(() => {
    const pk = pubkey();
    const instance = wotInstance();

    // Update global ref for batch fetcher
    wotInstanceRef = instance;

    if (!pk || !instance || !extension.isConnected()) {
      setData(null);
      setLoading(false);
      return;
    }

    // Check cache first
    const cached = getCachedWoT(pk);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    // Request data via batch system
    setLoading(true);
    const cleanup = requestWoTData(pk, () => {
      const result = getCachedWoT(pk);
      setData(result);
      setLoading(false);
    });

    onCleanup(cleanup);
  });

  return { data, loading };
};
