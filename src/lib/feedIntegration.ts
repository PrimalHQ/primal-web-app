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

  // Mark note as in view when it becomes visible (with source tracking)
  const markNoteInView = (noteId: string, isIntersectionObserver: boolean = false) => {
    const manager = seenNotesManager();
    if (!manager || !isInitialized()) return;

    // Only mark if not already being observed
    if (!observedNotes().has(noteId)) {
      setObservedNotes(prev => new Set([...prev, noteId]));
      manager.markNoteInView(noteId, isIntersectionObserver);
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
  markInView: (id: string, isIntersectionObserver?: boolean) => void,
  markOutOfView: (id: string) => void,
  enabled: boolean = true
) {
  let observer: IntersectionObserver | undefined;
  let mutationObserver: MutationObserver | undefined;

  console.log('NoteVisibilityTracker: Initializing with enabled =', enabled);

  createEffect(() => {
    console.log('NoteVisibilityTracker: Effect triggered, enabled =', enabled);
    
    if (!enabled) {
      console.log('NoteVisibilityTracker: Disabled, disconnecting observers');
      observer?.disconnect();
      mutationObserver?.disconnect();
      return;
    }

    console.log('NoteVisibilityTracker: Creating intersection observer');
    
    // Function to check if an element is within a sidebar
    const isElementInSidebar = (element: HTMLElement): boolean => {
      // Check if element or any parent has sidebar-related classes or IDs
      let currentElement: HTMLElement | null = element;
      while (currentElement) {
        const className = currentElement.className || '';
        const id = currentElement.id || '';
        
        // Check for sidebar-related classes and IDs
        if (
          className.includes('sidebar') ||
          className.includes('Sidebar') ||
          className.includes('trending') ||
          className.includes('smallNote') ||
          id.includes('sidebar') ||
          id.includes('Sidebar') ||
          currentElement.tagName === 'ASIDE'
        ) {
          return true;
        }
        currentElement = currentElement.parentElement;
      }
      return false;
    };

    observer = new IntersectionObserver(
      (entries) => {
        console.log(`🔍 NoteVisibilityTracker: Intersection observer triggered with ${entries.length} entries`);
        entries.forEach((entry) => {
          const noteId = entry.target.getAttribute('data-note-id');
          console.log(`🔍 NoteVisibilityTracker: Processing entry for element:`, {
            noteId,
            isIntersecting: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            boundingClientRect: entry.boundingClientRect,
            rootBounds: entry.rootBounds
          });
          
          if (!noteId) {
            console.warn('❌ NoteVisibilityTracker: Entry missing data-note-id attribute', entry.target);
            return;
          }

          // Check if this element is in a sidebar - if so, ignore the intersection
          if (isElementInSidebar(entry.target as HTMLElement)) {
            console.log(`🔒 NoteVisibilityTracker: Ignoring intersection for sidebar element: ${noteId}`);
            return;
          }

          if (entry.isIntersecting) {
            console.log(`✅ NoteVisibilityTracker: Note ${noteId} is now VISIBLE via intersection observer (${(entry.intersectionRatio * 100).toFixed(1)}% visible)`);
            markInView(noteId, true); // Pass true to indicate this is from intersection observer
          } else {
            console.log(`❌ NoteVisibilityTracker: Note ${noteId} is now HIDDEN via intersection observer`);
            markOutOfView(noteId);
          }
        });
      },
      {
        threshold: 0.5, // Note is considered "in view" when 50% visible
        rootMargin: '0px 0px -100px 0px', // Account for header/navigation
      }
    );

    console.log('🔍 NoteVisibilityTracker: Intersection observer created with options:', {
      threshold: 0.5,
      rootMargin: '0px 0px -100px 0px'
    });

    // Function to observe an element with detailed logging (now with sidebar exclusion)
    const observeElementWithLogging = (element: HTMLElement, source: string) => {
      const noteId = element.getAttribute('data-note-id');
      if (!noteId) {
        console.warn(`❌ ${source}: Element missing data-note-id:`, element);
        return;
      }

      // Check if element is in sidebar - if so, skip it
      if (isElementInSidebar(element)) {
        console.log(`🔒 ${source}: Skipping sidebar element with noteId: ${noteId}`);
        return;
      }
      
      console.log(`👀 ${source}: Observing element`, {
        noteId,
        tagName: element.tagName,
        className: element.className,
        boundingRect: element.getBoundingClientRect(),
        element
      });
      
      if (observer) {
        observer.observe(element);
        console.log(`✅ ${source}: Successfully added element to observer`);
      } else {
        console.error(`❌ ${source}: Observer not available!`);
      }
    };

    // Try multiple strategies to find note elements
    const findAndObserveNoteElements = (source: string) => {
      console.log(`🔍 ${source}: Starting search for note elements`);
      
      // Strategy 1: Direct selector
      const directElements = document.querySelectorAll('[data-note-id]');
      console.log(`🔍 ${source}: Found ${directElements.length} elements with data-note-id`);
      
      directElements.forEach((el, index) => {
        observeElementWithLogging(el as HTMLElement, `${source}[Direct-${index + 1}]`);
      });

      // Strategy 2: Look in specific containers
      const containers = [
        document.querySelector('[class*="homeFeed"]'),
        document.querySelector('[class*="feed"]'),
        document.querySelector('[class*="Feed"]'),
        document.querySelector('main'),
        document.querySelector('.animated')
      ].filter(Boolean);

      console.log(`🔍 ${source}: Found ${containers.length} potential containers`);
      
      containers.forEach((container, containerIndex) => {
        if (container) {
          console.log(`🔍 ${source}: Searching in container ${containerIndex + 1}:`, {
            tagName: container.tagName,
            className: container.className,
            id: container.id
          });
          
          const containerElements = container.querySelectorAll('[data-note-id]');
          console.log(`🔍 ${source}: Found ${containerElements.length} note elements in container ${containerIndex + 1}`);
          
          containerElements.forEach((el, index) => {
            observeElementWithLogging(el as HTMLElement, `${source}[Container${containerIndex + 1}-${index + 1}]`);
          });
        }
      });

      // Strategy 3: Look for elements that might contain notes
      const potentialNoteElements = document.querySelectorAll('.animated, [class*="note"], [class*="Note"], [class*="post"], [class*="Post"]');
      console.log(`🔍 ${source}: Found ${potentialNoteElements.length} potential note elements`);
      
      potentialNoteElements.forEach((el, index) => {
        const element = el as HTMLElement;
        if (element.hasAttribute('data-note-id')) {
          observeElementWithLogging(element, `${source}[Potential-${index + 1}]`);
        }
      });
    };

    // Initial search for existing elements
    findAndObserveNoteElements('Initial');

    // Set up a mutation observer to watch for new note elements being added to the DOM
    console.log('🔍 NoteVisibilityTracker: Setting up mutation observer');
    mutationObserver = new MutationObserver((mutations) => {
      console.log(`🔍 NoteVisibilityTracker: MutationObserver triggered with ${mutations.length} mutations`);
      
      mutations.forEach((mutation, mutationIndex) => {
        console.log(`🔍 NoteVisibilityTracker: Processing mutation ${mutationIndex + 1}:`, {
          type: mutation.type,
          addedNodes: mutation.addedNodes.length,
          removedNodes: mutation.removedNodes.length,
          target: mutation.target
        });
        
        mutation.addedNodes.forEach((node, nodeIndex) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            console.log(`🔍 NoteVisibilityTracker: Processing added element ${nodeIndex + 1}:`, {
              tagName: element.tagName,
              className: element.className,
              hasDataNoteId: element.hasAttribute('data-note-id'),
              dataAttributes: Array.from(element.attributes).filter(attr => attr.name.startsWith('data-')).map(attr => `${attr.name}="${attr.value}"`).join(', ')
            });
            
            // Check if the element itself has data-note-id
            if (element.hasAttribute('data-note-id')) {
              observeElementWithLogging(element, `Mutation[${mutationIndex + 1}-${nodeIndex + 1}]`);
            }
            
            // Also check for child elements with data-note-id
            const childNotes = element.querySelectorAll('[data-note-id]');
            console.log(`🔍 NoteVisibilityTracker: Found ${childNotes.length} child note elements`);
            
            childNotes.forEach((childElement, childIndex) => {
              observeElementWithLogging(childElement as HTMLElement, `Mutation[${mutationIndex + 1}-${nodeIndex + 1}-Child${childIndex + 1}]`);
            });
          }
        });
      });
    });

    // Start observing the feed container for new notes with very broad detection
    const feedContainers = [
      document.querySelector('[class*="homeFeed"]'),
      document.querySelector('[class*="feed"]'),
      document.querySelector('[class*="Feed"]'),
      document.querySelector('main'),
      document.body
    ].filter(Boolean);

    console.log(`🔍 NoteVisibilityTracker: Found ${feedContainers.length} feed containers to observe`);
    
    feedContainers.forEach((feedContainer, index) => {
      if (feedContainer) {
        console.log(`🔍 NoteVisibilityTracker: Setting up mutation observer on container ${index + 1}:`, {
          tagName: feedContainer.tagName,
          className: feedContainer.className || 'no-class',
          id: feedContainer.id || 'no-id'
        });
        
        mutationObserver?.observe(feedContainer, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-note-id']
        });
      }
    });

    console.log('✅ NoteVisibilityTracker: Mutation observer setup complete');

    // Delayed re-scan to catch elements that might be added after initial load
    setTimeout(() => {
      console.log('🔍 NoteVisibilityTracker: Performing delayed re-scan for elements');
      findAndObserveNoteElements('DelayedScan');
    }, 1000);

    // Another delayed scan
    setTimeout(() => {
      console.log('🔍 NoteVisibilityTracker: Performing second delayed re-scan for elements');
      findAndObserveNoteElements('SecondDelayedScan');
    }, 3000);
  });

  onCleanup(() => {
    console.log('🔍 NoteVisibilityTracker: Cleaning up observers');
    observer?.disconnect();
    mutationObserver?.disconnect();
  });

  const observeElement = (element: HTMLElement) => {
    if (enabled && observer) {
      const noteId = element.getAttribute('data-note-id');
      console.log('🔍 NoteVisibilityTracker: Manually observing new element with note-id:', noteId);
      observer.observe(element);
    }
  };

  const unobserveElement = (element: HTMLElement) => {
    if (observer) {
      const noteId = element.getAttribute('data-note-id');
      console.log('🔍 NoteVisibilityTracker: Unobserving element with note-id:', noteId);
      observer.unobserve(element);
    }
  };

  return { observeElement, unobserveElement };
}
