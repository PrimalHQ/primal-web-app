import { createSignal, onMount, onCleanup } from 'solid-js';
import { SeenNotesManager, shouldShowNoteInFeed } from '../lib/seenNotesFilter';
import { useAccountContext } from '../contexts/AccountContext';
import { PrimalNote } from '../types/primal';

// Example integration showing how to use the SeenNotesFilter in a feed component
export function useFeedWithSeenNotesFilter() {
  const account = useAccountContext();
  const [seenNotesManager, setSeenNotesManager] = createSignal<SeenNotesManager>();
  const [observedNotes, setObservedNotes] = createSignal<Set<string>>(new Set());

  // Initialize the seen notes manager
  onMount(async () => {
    if (account?.sec && account?.publicKey) {
      const manager = new SeenNotesManager(account.sec, account.publicKey);
      await manager.initialize();
      setSeenNotesManager(manager);
    }
  });

  onCleanup(() => {
    seenNotesManager()?.cleanup();
  });

  // Filter notes that should be shown in the feed
  const filterSeenNotes = async (notes: PrimalNote[]): Promise<PrimalNote[]> => {
    const manager = seenNotesManager();
    if (!manager) return notes;

    const filteredNotes: PrimalNote[] = [];
    
    for (const note of notes) {
      const shouldShow = await manager.shouldShowNote(note.id);
      if (shouldShow) {
        filteredNotes.push(note);
      }
    }

    return filteredNotes;
  };

  // Mark note as in view when it becomes visible
  const markNoteInView = (noteId: string) => {
    const manager = seenNotesManager();
    if (!manager) return;

    // Only mark if not already being observed
    if (!observedNotes().has(noteId)) {
      setObservedNotes(prev => new Set([...prev, noteId]));
      manager.markNoteInView(noteId);
    }
  };

  // Mark note as out of view when it becomes invisible
  const markNoteOutOfView = (noteId: string) => {
    const manager = seenNotesManager();
    if (!manager) return;

    if (observedNotes().has(noteId)) {
      setObservedNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        return newSet;
      });
      manager.markNoteOutOfView(noteId);
    }
  };

  return {
    filterSeenNotes,
    markNoteInView,
    markNoteOutOfView,
    isReady: () => !!seenNotesManager(),
  };
}

// Intersection Observer hook for tracking when notes come into view
export function useIntersectionObserver(
  markInView: (id: string) => void,
  markOutOfView: (id: string) => void
) {
  let observer: IntersectionObserver | undefined;

  onMount(() => {
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
  });

  onCleanup(() => {
    observer?.disconnect();
  });

  const observeElement = (element: HTMLElement) => {
    observer?.observe(element);
  };

  const unobserveElement = (element: HTMLElement) => {
    observer?.unobserve(element);
  };

  return { observeElement, unobserveElement };
}
