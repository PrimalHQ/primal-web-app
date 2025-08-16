import { createEffect, createSignal, JSX } from 'solid-js';
import { useSeenNotesFilter, useNoteVisibilityTracker } from './feedIntegration';
import { PrimalNote } from '../types/primal';

/**
 * Simple utility to add seen notes filtering to any existing feed component
 * 
 * Usage:
 * const { filteredNotes, setupNoteTracking } = useSeenNotesIntegration(notes);
 * 
 * Then in your JSX:
 * <For each={filteredNotes()}>
 *   {(note) => <div {...setupNoteTracking(note)}><Note note={note} /></div>}
 * </For>
 */
export function useSeenNotesIntegration(notes: () => PrimalNote[]) {
  const [filteredNotes, setFilteredNotes] = createSignal<PrimalNote[]>([]);
  
  console.log('SeenNotesIntegration: Hook initialized');
  
  const {
    filterSeenNotes,
    markNoteInView,
    markNoteOutOfView,
    isReady,
    isEnabled,
    getStats,
    clearAllFilters,
    rotateFilters
  } = useSeenNotesFilter();

  // Setup intersection observer for automatic tracking
  useNoteVisibilityTracker(
    markNoteInView,
    markNoteOutOfView,
    isEnabled()
  );

  // Filter notes when they change or filter becomes ready
  createEffect(async () => {
    const currentNotes = notes();
    
    console.log(`SeenNotesIntegration: Effect triggered with ${currentNotes.length} notes`);
    console.log(`SeenNotesIntegration: isEnabled=${isEnabled()}, isReady=${isReady()}`);
    
    if (!isEnabled() || !isReady()) {
      console.log('SeenNotesIntegration: Filter not enabled or not ready, showing all notes');
      setFilteredNotes(currentNotes);
      return;
    }

    try {
      console.log('SeenNotesIntegration: Calling filterSeenNotes...');
      const filtered = await filterSeenNotes(currentNotes);
      console.log(`SeenNotesIntegration: Filtered ${currentNotes.length} notes to ${filtered.length} notes`);
      setFilteredNotes(filtered);
    } catch (error) {
      console.error('Error filtering seen notes:', error);
      setFilteredNotes(currentNotes); // Fallback to show all notes
    }
  });

  /**
   * Returns props to add to note wrapper elements for tracking
   */
  const setupNoteTracking = (note: PrimalNote): JSX.HTMLAttributes<HTMLDivElement> => {
    if (!isEnabled()) {
      console.log(`SeenNotesIntegration: setupNoteTracking called for note ${note.id} but filtering is disabled`);
      return {};
    }

    console.log(`SeenNotesIntegration: setupNoteTracking called for note ${note.id} - adding tracking attributes`);
    
    return {
      'data-note-id': note.id,
      onMouseEnter: () => {
        console.log(`SeenNotesIntegration: Mouse entered note ${note.id}`);
        markNoteInView(note.id, false); // Pass false to indicate this is from mouse hover
      },
      onMouseLeave: () => {
        console.log(`SeenNotesIntegration: Mouse left note ${note.id}`);
        markNoteOutOfView(note.id);
      },
    };
  };

  return {
    filteredNotes,
    setupNoteTracking,
    isEnabled,
    isReady,
    getStats,
    clearAllFilters,
    rotateFilters,
    originalNotesCount: () => notes().length,
    filteredNotesCount: () => filteredNotes().length,
    hiddenNotesCount: () => notes().length - filteredNotes().length,
  };
}
