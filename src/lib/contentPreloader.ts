import { APP_ID } from "../App";
import { Kind, minKnownProfiles } from "../constants";
import { fetchStoredFeed } from "./localStore";
import { fetchMegaFeed } from "../megaFeeds";

/**
 * Content Preloader - Eagerly fetches initial page data for key routes
 * to improve perceived performance when user navigates to these pages.
 *
 * This runs in the background and caches results in the megaFeedCache,
 * so when the user actually navigates to the page, data is already available.
 */

type PreloadableRoute = 'reads' | 'bookmarks' | 'notifications';

const PRELOAD_DELAY = 2000; // Wait 2s after app init to start preloading
const PRELOAD_LIMIT = 10; // Preload fewer items than page size to be lightweight

let preloadTimer: number | undefined;
let preloadedRoutes = new Set<PreloadableRoute>();

/**
 * Check if we should preload for this route
 */
const shouldPreload = (route: PreloadableRoute): boolean => {
  // Don't preload if already preloaded
  if (preloadedRoutes.has(route)) {
    return false;
  }

  // Don't preload if user doesn't have an active account
  return true;
};

/**
 * Preload Reads feed
 */
const preloadReads = async (pubkey: string) => {
  if (!shouldPreload('reads')) return;

  try {
    // Get the user's selected feed from local storage
    const storedFeed = fetchStoredFeed(pubkey, 'reads');
    const spec = storedFeed?.spec;

    if (!spec) {
      console.log('[Preloader] No stored Reads feed found, skipping preload');
      return;
    }

    console.log('[Preloader] Preloading Reads feed...');

    await fetchMegaFeed(
      pubkey,
      spec,
      `reads_preload_${APP_ID}`,
      {
        until: 0,
        limit: PRELOAD_LIMIT,
        offset: 0,
      }
    );

    preloadedRoutes.add('reads');
    console.log('[Preloader] Reads feed preloaded');
  } catch (error) {
    console.warn('[Preloader] Failed to preload Reads:', error);
  }
};

/**
 * Preload Bookmarks feed
 */
const preloadBookmarks = async (pubkey: string) => {
  if (!shouldPreload('bookmarks')) return;

  try {
    // Preload notes bookmarks (most common)
    const spec = JSON.stringify({
      id: 'feed',
      kind: 'notes',
      kinds: [Kind.Text],
      notes: 'bookmarks',
      pubkey,
    });

    console.log('[Preloader] Preloading Bookmarks feed...');

    await fetchMegaFeed(
      pubkey,
      spec,
      `bookmarks_preload_${APP_ID}`,
      {
        until: 0,
        limit: PRELOAD_LIMIT,
        offset: 0,
      }
    );

    preloadedRoutes.add('bookmarks');
    console.log('[Preloader] Bookmarks feed preloaded');
  } catch (error) {
    console.warn('[Preloader] Failed to preload Bookmarks:', error);
  }
};

/**
 * Main preload function - kicks off preloading for all routes
 */
const preloadContent = async (pubkey: string) => {
  // Clear any existing timer
  if (preloadTimer) {
    clearTimeout(preloadTimer);
  }

  // Wait a bit to let the initial page settle
  preloadTimer = setTimeout(async () => {
    console.log('[Preloader] Starting content preload for authenticated user');

    // Preload in order of likely user navigation
    // Run sequentially to avoid overwhelming the connection
    await preloadReads(pubkey);
    await preloadBookmarks(pubkey);
    // Note: We don't preload Notifications or Messages as they use different contexts
    // and fetch on their own when the user has new activity

    console.log('[Preloader] Content preload complete');
  }, PRELOAD_DELAY);
};

/**
 * Reset preload state (e.g., when user logs out or switches accounts)
 */
const resetPreloader = () => {
  if (preloadTimer) {
    clearTimeout(preloadTimer);
    preloadTimer = undefined;
  }
  preloadedRoutes.clear();
  console.log('[Preloader] Reset preloader state');
};

/**
 * Public API
 */
export const contentPreloader = {
  preload: preloadContent,
  reset: resetPreloader,
};
