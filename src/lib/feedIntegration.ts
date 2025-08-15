import { createSignal, createEffect, onCleanup } from 'solid-js';
import { SeenNotesManager } from '../lib/seenNotesFilter';
import { useAccountContext } from '../contexts/AccountContext';
import { PrimalNote } from '../types/primal';

/**
 * Hook to integrate seen notes filtering into existing feed components
 * This replaces the previous standalone feed component approach
 */
export function useSeenNotesFilter() {
  const account = useAccountContext();
  const [seenNotesManager, setSeenNotesManager] = createSignal<SeenNotesManager>();
  const [observedNotes, setObservedNotes] = createSignal<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = createSignal(false);

  // Initialize the seen notes manager when account is available
  createEffect(async () => {
    if (account?.publicKey) {
      console.log('FeedIntegration: Account available, pubkey:', account.publicKey);
      
      // If manager already exists, no need to update settings since we're localStorage-only
      const existingManager = seenNotesManager();
      if (existingManager) {
        console.log('FeedIntegration: Manager already exists, skipping initialization');
        return;
      }

      console.log('FeedIntegration: Creating new SeenNotesManager');
      // Create new manager with just the pubkey
      const manager = new SeenNotesManager(account.publicKey);
      
      try {
        console.log('FeedIntegration: Initializing manager...');
        await manager.initialize();
        setSeenNotesManager(manager);
        setIsInitialized(true);
        console.log('FeedIntegration: Manager initialized successfully');
      } catch (error) {
        console.error('Failed to initialize seen notes manager:', error);
        setIsInitialized(false);
      }
    } else {
      console.log('FeedIntegration: No account available, cleaning up manager');
      // Clean up if no account
      seenNotesManager()?.cleanup();
      setSeenNotesManager(undefined);
      setIsInitialized(false);
    }
  });

  onCleanup(() => {
    seenNotesManager()?.cleanup();
  });

  // Filter notes that should be shown in the feed
  const filterSeenNotes = async (notes: PrimalNote[]): Promise<PrimalNote[]> => {
    console.log(`FeedIntegration: filterSeenNotes called with ${notes.length} notes`);
    
    const manager = seenNotesManager();
    if (!manager || !isInitialized()) {
      console.log('FeedIntegration: No manager or not initialized, returning all notes');
      return notes;
    }

    console.log('FeedIntegration: Manager available, filtering notes...');
    const filteredNotes: PrimalNote[] = [];
    
    for (const note of notes) {
      try {
        const shouldShow = await manager.shouldShowNote(note.id);
        if (shouldShow) {
          filteredNotes.push(note);
        } else {
          console.log(`FeedIntegration: Filtered out note ${note.id}`);
        }
      } catch (error) {
        console.error(`Error checking note ${note.id}:`, error);
        // On error, include the note to be safe
        filteredNotes.push(note);
      }
    }

    console.log(`FeedIntegration: Filtered ${notes.length} notes down to ${filteredNotes.length} notes`);
    return filteredNotes;
  };

  // Mark note as in view when it becomes visible
  const markNoteInView = (noteId: string) => {
    const manager = seenNotesManager();
    if (!manager || !isInitialized()) return;

    // Only mark if not already being observed
    if (!observedNotes().has(noteId)) {
      setObservedNotes(prev => new Set([...prev, noteId]));
      manager.markNoteInView(noteId);
    }
  };

  // Mark note as out of view when it becomes invisible
  const markNoteOutOfView = (noteId: string) => {
    const manager = seenNotesManager();
    if (!manager || !isInitialized()) return;

    if (observedNotes().has(noteId)) {
      setObservedNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
      });
      manager.markNoteOutOfView(noteId);
    }
  };

  // Get filter statistics and management functions
  const getStats = () => {
    const manager = seenNotesManager();
    return manager ? manager.getStats() : null;
  };

  // Clear all filters manually
  const clearAllFilters = () => {
    const manager = seenNotesManager();
    if (manager && isInitialized()) {
      manager.clearAllFilters();
    }
  };

  // Rotate filters manually
  const rotateFilters = () => {
    const manager = seenNotesManager();
    if (manager && isInitialized()) {
      manager.rotateFiltersManually();
    }
  };

  return {
    filterSeenNotes,
    markNoteInView,
    markNoteOutOfView,
    isReady: () => !!seenNotesManager() && isInitialized(),
    getStats,
    clearAllFilters,
    rotateFilters,
    observedNotesCount: () => observedNotes().size,
    isEnabled: () => !!account?.publicKey,
  };
}

/**
 * Hook for setting up intersection observer to automatically track note visibility
 */
export function useNoteVisibilityTracker(
  markInView: (id: string) => void,
  markOutOfView: (id: string) => void,
  enabled: boolean = true
) {
  let observer: IntersectionObserver | undefined;

  console.log('NoteVisibilityTracker: Initializing with enabled =', enabled);

  createEffect(() => {
    console.log('NoteVisibilityTracker: Effect triggered, enabled =', enabled);
    
    if (!enabled) {
      console.log('NoteVisibilityTracker: Disabled, disconnecting observer');
      observer?.disconnect();
      return;
    }

    console.log('NoteVisibilityTracker: Creating intersection observer');
    observer = new IntersectionObserver(
      (entries) => {
        console.log(`NoteVisibilityTracker: Intersection observer triggered with ${entries.length} entries`);
        entries.forEach((entry) => {
          const noteId = entry.target.getAttribute('data-note-id');
          if (!noteId) {
            console.log('NoteVisibilityTracker: Entry missing data-note-id attribute');
            return;
          }

          if (entry.isIntersecting) {
            console.log(`NoteVisibilityTracker: Note ${noteId} is now VISIBLE`);
            markInView(noteId);
          } else {
            console.log(`NoteVisibilityTracker: Note ${noteId} is now HIDDEN`);
            markOutOfView(noteId);
          }
        });
      },
      {
        threshold: 0.5, // Note is considered "in view" when 50% visible
        rootMargin: '0px 0px -100px 0px', // Account for header/navigation
      }
    );

    // Observe all existing note elements
    const noteElements = document.querySelectorAll('[data-note-id]');
    console.log(`NoteVisibilityTracker: Found ${noteElements.length} existing note elements to observe`);
    noteElements.forEach((el, index) => {
      const noteId = el.getAttribute('data-note-id');
      console.log(`NoteVisibilityTracker: Observing element ${index + 1}/${noteElements.length} with note-id: ${noteId}`);
      observer?.observe(el as HTMLElement);
    });
  });

  onCleanup(() => {
    console.log('NoteVisibilityTracker: Cleaning up observer');
    observer?.disconnect();
  });

  const observeElement = (element: HTMLElement) => {
    if (enabled && observer) {
      console.log('NoteVisibilityTracker: Observing new element with note-id:', element.getAttribute('data-note-id'));
      observer.observe(element);
    }
  };

  const unobserveElement = (element: HTMLElement) => {
    if (observer) {
      console.log('NoteVisibilityTracker: Unobserving element with note-id:', element.getAttribute('data-note-id'));
      observer.unobserve(element);
    }
  };

  return { observeElement, unobserveElement };
}
