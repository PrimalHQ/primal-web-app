import { createEffect, createSignal } from 'solid-js';
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
  
  const {
    filterSeenNotes,
    markNoteInView,
    markNoteOutOfView,
    isReady,
    isEnabled,
    getStats
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
    
    if (!isEnabled() || !isReady()) {
      setFilteredNotes(currentNotes);
      return;
    }

    try {
      const filtered = await filterSeenNotes(currentNotes);
      setFilteredNotes(filtered);
    } catch (error) {
      console.error('Error filtering seen notes:', error);
      setFilteredNotes(currentNotes); // Fallback to show all notes
    }
  });

  /**
   * Returns props to add to note wrapper elements for tracking
   */
  const setupNoteTracking = (note: PrimalNote) => {
    if (!isEnabled()) {
      return {};
    }

    return {
      'data-note-id': note.id,
      onMouseEnter: () => markNoteInView(note.id),
      onMouseLeave: () => markNoteOutOfView(note.id),
    };
  };

  return {
    filteredNotes,
    setupNoteTracking,
    isEnabled,
    isReady,
    getStats,
    originalNotesCount: () => notes().length,
    filteredNotesCount: () => filteredNotes().length,
    hiddenNotesCount: () => notes().length - filteredNotes().length,
  };
}

/**
 * Simple component wrapper that adds seen notes tracking to any child
 * 
 * Usage:
 * <SeenNotesWrapper note={note}>
 *   <Note note={note} />
 * </SeenNotesWrapper>
 */
export function SeenNotesWrapper(props: { note: PrimalNote, children: any }) {
  const { markNoteInView, markNoteOutOfView, isEnabled } = useSeenNotesFilter();

  if (!isEnabled()) {
    return props.children;
  }

  return (
    <div
      data-note-id={props.note.id}
      onMouseEnter={() => markNoteInView(props.note.id)}
      onMouseLeave={() => markNoteOutOfView(props.note.id)}
    >
      {props.children}
    </div>
  );
}
