import { Component, For, Show, createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import { ReactionSummary } from '../../lib/reactions';
import { fetchReactionsForNote } from '../../lib/fetchReactions';
import { useAccountContext } from '../../contexts/AccountContext';
import { normalizeReactionEmoji } from '../../lib/reactions';
import { getCachedReactions, setCachedReactions } from '../../lib/reactionCache';
import { relayInit, Relay } from '../../lib/nTools';
import styles from './NoteReactions.module.scss';
import { hookForDev } from '../../lib/devTools';

export type NoteReactionsProps = {
  noteId: string;
  compact?: boolean;
};

const NoteReactions: Component<NoteReactionsProps> = (props) => {
  const account = useAccountContext();
  const [reactionSummary, setReactionSummary] = createSignal<ReactionSummary | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [hasFetched, setHasFetched] = createSignal(false);

  // Track fallback relays for cleanup
  let fallbackRelays: Relay[] = [];

  // On mount: check cache first for instant display
  onMount(() => {
    console.log('[NoteReactions] onMount', {
      noteId: props.noteId,
      pubkey: account?.publicKey,
    });
    const cached = getCachedReactions(props.noteId, account?.publicKey);
    if (cached) {
      console.log('[NoteReactions] Using cached reactions:', {
        totalCount: cached.totalCount,
        userReactions: cached.userReactions,
      });
      setReactionSummary(cached);
      setIsLoading(false);
    }
  });

  // Watch for when relays become available and fetch fresh reactions in background
  createEffect(async () => {
    if (!account || hasFetched()) {
      return;
    }

    // Popular relays that should have most reaction events
    const FALLBACK_RELAY_URLS = [
      'wss://relay.damus.io',
      'wss://relay.nostr.band',
      'wss://nos.lol',
      'wss://relay.primal.net',
      'wss://nostr.wine',
    ];

    // Use activeRelays if available, otherwise use relays
    let relaysToUse = account.activeRelays && account.activeRelays.length > 0
      ? account.activeRelays
      : account.relays || [];

    // If user has fewer than 3 relays, connect to popular fallback relays
    if (relaysToUse.length < 3) {
      console.log('[NoteReactions] Connecting to fallback relays...');

      // Create and connect to fallback relays
      const fallbackPromises = FALLBACK_RELAY_URLS.map(async (url) => {
        try {
          const relay = relayInit(url);
          await relay.connect();
          console.log(`[NoteReactions] Connected to fallback relay: ${url}`);
          return relay;
        } catch (error) {
          console.error(`[NoteReactions] Failed to connect to ${url}:`, error);
          return null;
        }
      });

      const connectedFallbacks = (await Promise.all(fallbackPromises)).filter(r => r !== null) as Relay[];
      fallbackRelays = connectedFallbacks;
      relaysToUse = [...relaysToUse, ...connectedFallbacks];
    }

    console.log('[NoteReactions] Relay selection:', {
      activeRelays: account.activeRelays?.length,
      relays: account.relays?.length,
      fallbackCount: fallbackRelays.length,
      using: relaysToUse.length,
      urls: relaysToUse.map(r => r.url),
    });

    // Mark as fetched to prevent duplicate fetches
    setHasFetched(true);

    try {
      console.log('[NoteReactions] Fetching reactions from relays...', {
        noteId: props.noteId,
        pubkey: account.publicKey,
        relayCount: relaysToUse.length,
      });
      const summary = await fetchReactionsForNote(
        props.noteId,
        relaysToUse,
        account.publicKey
      );

      console.log('[NoteReactions] Fetched reactions:', {
        totalCount: summary.totalCount,
        userReactions: summary.userReactions,
        reactions: Array.from(summary.reactions.entries()).map(([emoji, data]) => ({
          emoji,
          count: data.count,
          userReacted: data.userReacted,
        })),
      });

      // Update both state and cache
      setReactionSummary(summary);
      setCachedReactions(props.noteId, summary, account.publicKey);
    } catch (error) {
      console.error('[NoteReactions] Failed to fetch reactions:', error);
    } finally {
      setIsLoading(false);
    }
  });

  // Cleanup fallback relays on unmount
  onCleanup(() => {
    fallbackRelays.forEach(relay => {
      try {
        relay.close();
        console.log(`[NoteReactions] Disconnected fallback relay: ${relay.url}`);
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  });

  const sortedReactions = () => {
    const summary = reactionSummary();
    if (!summary) return [];

    // Convert Map to array and sort by count (descending)
    return Array.from(summary.reactions.values())
      .sort((a, b) => b.count - a.count);
  };

  return (
    <Show when={!isLoading() && reactionSummary()?.totalCount > 0}>
      <div class={props.compact ? styles.reactionsCompact : styles.reactions}>
        <For each={sortedReactions()}>
          {(reaction) => (
            <div
              class={`${styles.reactionItem} ${reaction.userReacted ? styles.userReacted : ''}`}
              title={`${reaction.count} ${reaction.emoji === '+' ? 'like' : reaction.emoji}${reaction.count > 1 ? 's' : ''}`}
            >
              <span class={styles.emoji}>{normalizeReactionEmoji(reaction.emoji)}</span>
              <span class={styles.count}>{reaction.count}</span>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
};

export default hookForDev(NoteReactions);
