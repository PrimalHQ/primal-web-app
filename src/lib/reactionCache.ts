import { ReactionSummary } from './reactions';

const CACHE_KEY_PREFIX = 'reactions_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CachedReaction {
  summary: ReactionSummary;
  timestamp: number;
  ttl: number;
}

interface ReactionCache {
  [noteId: string]: CachedReaction;
}

/**
 * Get cache key for a specific user
 */
const getCacheKey = (pubkey?: string): string => {
  return `${CACHE_KEY_PREFIX}${pubkey || 'anon'}`;
};

/**
 * Get cached reactions for a specific note
 * @param noteId - The note ID
 * @param pubkey - Optional user pubkey for user-specific cache
 * @returns Cached reaction summary or null if not found/expired
 */
export const getCachedReactions = (
  noteId: string,
  pubkey?: string
): ReactionSummary | null => {
  try {
    const cacheKey = getCacheKey(pubkey);
    const cacheData = localStorage.getItem(cacheKey);

    if (!cacheData) {
      return null;
    }

    const cache: ReactionCache = JSON.parse(cacheData);
    const cached = cache[noteId];

    if (!cached) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      return null;
    }

    // Reconstruct Map from stored data
    const reactions = new Map(
      Array.isArray(cached.summary.reactions)
        ? cached.summary.reactions
        : Object.entries(cached.summary.reactions || {})
    );

    return {
      reactions,
      totalCount: cached.summary.totalCount,
      userReactions: cached.summary.userReactions || [],
    };
  } catch (error) {
    console.error('[reactionCache] Error getting cached reactions:', error);
    return null;
  }
};

/**
 * Save reactions to cache
 * @param noteId - The note ID
 * @param summary - The reaction summary to cache
 * @param pubkey - Optional user pubkey for user-specific cache
 * @param ttl - Time to live in milliseconds (default 5 minutes)
 */
export const setCachedReactions = (
  noteId: string,
  summary: ReactionSummary,
  pubkey?: string,
  ttl: number = DEFAULT_TTL
): void => {
  try {
    const cacheKey = getCacheKey(pubkey);
    const cacheData = localStorage.getItem(cacheKey);
    const cache: ReactionCache = cacheData ? JSON.parse(cacheData) : {};

    // Convert Map to array for storage
    const reactionsArray = Array.from(summary.reactions.entries());

    cache[noteId] = {
      summary: {
        reactions: reactionsArray as any,
        totalCount: summary.totalCount,
        userReactions: summary.userReactions,
      },
      timestamp: Date.now(),
      ttl,
    };

    localStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch (error) {
    console.error('[reactionCache] Error setting cached reactions:', error);
  }
};

/**
 * Invalidate cache for a specific note
 * @param noteId - The note ID to invalidate
 * @param pubkey - Optional user pubkey for user-specific cache
 */
export const invalidateCache = (noteId: string, pubkey?: string): void => {
  try {
    const cacheKey = getCacheKey(pubkey);
    const cacheData = localStorage.getItem(cacheKey);

    if (!cacheData) {
      return;
    }

    const cache: ReactionCache = JSON.parse(cacheData);
    delete cache[noteId];
    localStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch (error) {
    console.error('[reactionCache] Error invalidating cache:', error);
  }
};

/**
 * Clear all expired cache entries
 * @param pubkey - Optional user pubkey for user-specific cache
 */
export const clearExpiredCache = (pubkey?: string): void => {
  try {
    const cacheKey = getCacheKey(pubkey);
    const cacheData = localStorage.getItem(cacheKey);

    if (!cacheData) {
      return;
    }

    const cache: ReactionCache = JSON.parse(cacheData);
    const now = Date.now();
    let hasChanges = false;

    for (const noteId in cache) {
      const cached = cache[noteId];
      if (now - cached.timestamp > cached.ttl) {
        delete cache[noteId];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      localStorage.setItem(cacheKey, JSON.stringify(cache));
    }
  } catch (error) {
    console.error('[reactionCache] Error clearing expired cache:', error);
  }
};
