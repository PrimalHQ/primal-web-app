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
      // If manager already exists, update its settings
      const existingManager = seenNotesManager();
      if (existingManager) {
        existingManager.updateSettings(
          account.activeRelays || [], 
          account.relaySettings || {}, 
          account.proxyThroughPrimal || false
        );
        return;
      }

      // Create new manager
      const manager = new SeenNotesManager(
        account.publicKey,
        account.activeRelays || [], 
        account.relaySettings || {}, 
        account.proxyThroughPrimal || false
      );
      
      try {
        await manager.initialize();
        setSeenNotesManager(manager);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize seen notes manager:', error);
        setIsInitialized(false);
      }
    } else {
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
    const manager = seenNotesManager();
    if (!manager || !isInitialized()) return notes;

    const filteredNotes: PrimalNote[] = [];
    
    for (const note of notes) {
      try {
        const shouldShow = await manager.shouldShowNote(note.id);
        if (shouldShow) {
          filteredNotes.push(note);
        }
      } catch (error) {
        console.error(`Error checking note ${note.id}:`, error);
        // On error, include the note to be safe
        filteredNotes.push(note);
      }
    }

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

  // Get filter statistics for debugging
  const getStats = () => {
    const manager = seenNotesManager();
    return manager ? manager.getStats() : null;
  };

  // Manually force a filter update
  const forceUpdate = async () => {
    const manager = seenNotesManager();
    if (manager && isInitialized()) {
      await manager.forceUpdate();
    }
  };

  return {
    filterSeenNotes,
    markNoteInView,
    markNoteOutOfView,
    isReady: () => !!seenNotesManager() && isInitialized(),
    getStats,
    forceUpdate,
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

  createEffect(() => {
    if (!enabled) {
      observer?.disconnect();
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const noteId = entry.target.getAttribute('data-note-id');
          if (!noteId) return;

          if (entry.isIntersecting) {
            markInView(noteId);
          } else {
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
    noteElements.forEach(el => observer?.observe(el as HTMLElement));
  });

  onCleanup(() => {
    observer?.disconnect();
  });

  const observeElement = (element: HTMLElement) => {
    if (enabled && observer) {
      observer.observe(element);
    }
  };

  const unobserveElement = (element: HTMLElement) => {
    if (observer) {
      observer.unobserve(element);
    }
  };

  return { observeElement, unobserveElement };
}
