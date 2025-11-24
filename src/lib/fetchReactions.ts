import { Kind } from "../constants";
import { Relay } from "./nTools";
import { NostrEvent, NostrEOSE } from "../types/primal";
import { aggregateReactions, ReactionSummary } from "./reactions";
import { logInfo, logError } from "./logger";

/**
 * Fetch reaction events (kind 7) for a specific note from relays
 * @param noteId - The note ID to fetch reactions for
 * @param relays - Relays to query
 * @param currentUserPubkey - Current user's pubkey for determining userReacted
 * @returns ReactionSummary with aggregated reactions
 */
export const fetchReactionsForNote = async (
  noteId: string,
  relays: Relay[],
  currentUserPubkey?: string
): Promise<ReactionSummary> => {
  return new Promise((resolve) => {
    const reactionEvents: NostrEvent[] = [];
    let eoseCount = 0;
    const expectedEose = relays.length;

    const filter = {
      kinds: [Kind.Reaction],
      "#e": [noteId],
      limit: 500,
    };

    console.log('[fetchReactions] Starting fetch with filter:', {
      filter,
      relayCount: relays.length,
      relayUrls: relays.map(r => r.url),
    });

    if (relays.length === 0) {
      console.log('[fetchReactions] No relays available');
      resolve(aggregateReactions([], currentUserPubkey));
      return;
    }

    // Define finalize before using it
    const finalize = () => {
      const summary = aggregateReactions(reactionEvents, currentUserPubkey);
      resolve(summary);
    };

    relays.forEach((relay, index) => {
      try {
        console.log(`[fetchReactions] Subscribing to relay ${index + 1}/${relays.length}:`, relay.url);
        const sub = relay.subscribe(
          [filter],
          {
            onevent(event: any) {
              console.log('[fetchReactions] Got reaction event:', {
                relay: relay.url,
                emoji: event.content,
                pubkey: event.pubkey,
              });
              reactionEvents.push(event as NostrEvent);
            },
            oneose() {
              console.log(`[fetchReactions] EOSE from relay ${relay.url}, count: ${eoseCount + 1}/${expectedEose}`);
              eoseCount++;
              if (eoseCount >= expectedEose) {
                finalize();
              }
            }
          }
        );

        // Cleanup subscription after timeout
        setTimeout(() => {
          try {
            sub.close();
          } catch (e) {
            // Ignore errors
          }
        }, 5000);

      } catch (error) {
        console.error(`[fetchReactions] Error subscribing to relay:`, error);
        eoseCount++;
        if (eoseCount >= expectedEose) {
          finalize();
        }
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (eoseCount < expectedEose) {
        finalize();
      }
    }, 5000);
  });
};
