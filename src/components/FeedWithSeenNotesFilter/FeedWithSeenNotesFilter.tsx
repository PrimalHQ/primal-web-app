import { Component, createEffect, createSignal, For, onMount } from 'solid-js';
import { PrimalNote } from '../../types/primal';
import { useFeedWithSeenNotesFilter, useIntersectionObserver } from '../../lib/feedIntegration';

interface FeedComponentProps {
  notes: PrimalNote[];
}

const FeedWithSeenNotesFilter: Component<FeedComponentProps> = (props) => {
  const [displayedNotes, setDisplayedNotes] = createSignal<PrimalNote[]>([]);
  const [noteElements, setNoteElements] = createSignal<Map<string, HTMLElement>>(new Map());

  const { 
    filterSeenNotes, 
    markNoteInView, 
    markNoteOutOfView, 
    isReady 
  } = useFeedWithSeenNotesFilter();

  const { observeElement, unobserveElement } = useIntersectionObserver(
    markNoteInView,
    markNoteOutOfView
  );

  // Filter notes when the prop changes or when the manager becomes ready
  createEffect(async () => {
    if (isReady() && props.notes.length > 0) {
      const filtered = await filterSeenNotes(props.notes);
      setDisplayedNotes(filtered);
    }
  });

  // Set up intersection observer for note elements
  const registerNoteElement = (element: HTMLElement, noteId: string) => {
    setNoteElements(prev => new Map(prev.set(noteId, element)));
    observeElement(element);
  };

  const unregisterNoteElement = (noteId: string) => {
    const element = noteElements().get(noteId);
    if (element) {
      unobserveElement(element);
      setNoteElements(prev => {
        const newMap = new Map(prev);
        newMap.delete(noteId);
        return newMap;
      });
    }
  };

  return (
    <div class="feed-with-seen-filter">
      <div class="feed-header">
        <span>Feed ({displayedNotes().length} notes)</span>
        {!isReady() && <span class="loading">Initializing seen notes filter...</span>}
      </div>
      
      <div class="notes-container">
        <For each={displayedNotes()}>
          {(note) => (
            <NoteComponent
              note={note}
              onMount={(element) => registerNoteElement(element, note.id)}
              onCleanup={() => unregisterNoteElement(note.id)}
            />
          )}
        </For>
      </div>

      {displayedNotes().length === 0 && isReady() && (
        <div class="no-new-notes">
          <h3>You're all caught up!</h3>
          <p>No new notes to show. All notes in this feed have been seen before.</p>
        </div>
      )}
    </div>
  );
};

interface NoteComponentProps {
  note: PrimalNote;
  onMount: (element: HTMLElement) => void;
  onCleanup: () => void;
}

const NoteComponent: Component<NoteComponentProps> = (props) => {
  let noteElementRef: HTMLElement | undefined;

  onMount(() => {
    if (noteElementRef) {
      props.onMount(noteElementRef);
    }
  });

  return (
    <article 
      ref={noteElementRef}
      class="note-item"
      data-note-id={props.note.id}
      style={{
        "border": "1px solid #eee",
        "padding": "16px",
        "margin": "8px 0",
        "border-radius": "8px",
        "background": "white"
      }}
    >
      <div class="note-header">
        <div class="user-info">
          <img 
            src={props.note.user.picture || '/default-avatar.png'} 
            alt={props.note.user.name}
            class="user-avatar"
            style={{
              "width": "40px",
              "height": "40px",
              "border-radius": "50%",
              "margin-right": "12px"
            }}
          />
          <div>
            <div class="user-name" style={{ "font-weight": "bold" }}>
              {props.note.user.displayName || props.note.user.name}
            </div>
            <div class="note-time" style={{ "color": "#666", "font-size": "14px" }}>
              {new Date(props.note.post.created_at * 1000).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      
      <div class="note-content" style={{ "margin": "12px 0" }}>
        <p>{props.note.content}</p>
      </div>
      
      <div class="note-actions" style={{ 
        "display": "flex", 
        "gap": "16px", 
        "margin-top": "12px",
        "color": "#666",
        "font-size": "14px"
      }}>
        <span>👍 {props.note.post.likes}</span>
        <span>💬 {props.note.post.replies}</span>
        <span>🔄 {props.note.post.reposts}</span>
        <span>⚡ {props.note.post.zaps}</span>
      </div>
    </article>
  );
};

export default FeedWithSeenNotesFilter;
