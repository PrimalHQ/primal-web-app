import { Component, createEffect, For, Show } from 'solid-js';
import styles from './Feed.module.scss';
import { useParams } from '@solidjs/router';
import Note from '../components/Note/Note';
import Loader from '../components/Loader/Loader';
import { useExploreContext } from '../contexts/ExploreContext';
import Paginator from '../components/Paginator/Paginator';
import { useSeenNotesIntegration } from '../lib/seenNotesIntegration';

/**
 * Enhanced Feed component with seen notes filtering
 * This replaces the original Feed.tsx with minimal changes
 */
const Feed: Component<{ scope: string, timeframe: string}> = () => {

  const explore = useExploreContext();
  const params = useParams();

  // Add seen notes integration
  const {
    filteredNotes,
    setupNoteTracking,
    isEnabled,
    hiddenNotesCount
  } = useSeenNotesIntegration(() => explore?.notes || []);

  createEffect(() => {
    if (params.scope && params.timeframe) {
      explore?.actions.clearNotes();
      explore?.actions.fetchNotes(
        `${params.scope};${params.timeframe}`,
      );
    }
  });

  return (
    <div class={styles.feedContent}>
      
      {/* Optional: Show filtering status */}
      <Show when={isEnabled() && hiddenNotesCount() > 0}>
        <div class={styles.filterStatus}>
          <span>🔍 Filtered {hiddenNotesCount()} seen notes</span>
        </div>
      </Show>

      <Show
        when={filteredNotes().length > 0}
        fallback={<Loader />}
      >
        <For each={filteredNotes()} >
          {(note) => (
            <div {...setupNoteTracking(note)}>
              <Note
                note={note}
                shorten={true}
                onRemove={(id: string) => {
                  explore?.actions.removeEvent(id, 'notes');
                }}
              />
            </div>
          )}
        </For>
        <Paginator loadNextPage={explore?.actions.fetchNextPage} />
      </Show>
    </div>
  )
}

export default Feed;
